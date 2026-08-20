const sharetribeSdk = require('sharetribe-flex-sdk');
const { transactionLineItemsWithTax } = require('../api-util/lineItems');
const { updatePaymentIntentTaxMetadata } = require('../api-util/tax');
const { isIntentionToMakeOffer } = require('../api-util/negotiation');
const {
  getSdk,
  getTrustedSdk,
  handleError,
  serialize,
  fetchCommission,
} = require('../api-util/sdk');
const {
  isSubscriptionProcess,
  SUBSCRIPTION_PROCESS_NAME,
  resolveSubscriptionProcessAlias,
} = require('../api-util/subscriptionConstants');
const { checkForExistingSubscription } = require('../api-util/subscriptionService');

const { Money } = sharetribeSdk.types;

const listingPromise = (sdk, id) => sdk.listings.show({ id });

const getFullOrderData = (orderData, bodyParams, currency) => {
  const { offerInSubunits } = orderData || {};
  const transitionName = bodyParams.transition;

  return isIntentionToMakeOffer(offerInSubunits, transitionName)
    ? {
        ...orderData,
        ...bodyParams.params,
        currency,
        offer: new Money(offerInSubunits, currency),
      }
    : { ...orderData, ...bodyParams.params };
};

const getMetadata = (orderData, transition) => {
  const { actor, offerInSubunits } = orderData || {};
  // NOTE: for now, the actor is always "provider".
  const hasActor = ['provider', 'customer'].includes(actor);
  const by = hasActor ? actor : null;

  return isIntentionToMakeOffer(offerInSubunits, transition)
    ? {
        metadata: {
          offers: [
            {
              offerInSubunits,
              by,
              transition,
            },
          ],
        },
      }
    : {};
};

module.exports = (req, res) => {
  const { isSpeculative, orderData, bodyParams, queryParams } = req.body || {};
  const transitionName = bodyParams.transition;
  const processAlias = resolveSubscriptionProcessAlias(bodyParams.processAlias || '');
  const isSubscription = isSubscriptionProcess(processAlias);
  const sdk = getSdk(req, res);
  let lineItems = null;
  let taxCalculationId = null;
  let metadataMaybe = {};

  Promise.all([listingPromise(sdk, bodyParams?.params?.listingId), fetchCommission(sdk)])
    .then(([showListingResponse, fetchAssetsResponse]) => {
      const listing = showListingResponse.data.data;
      const commissionAsset = fetchAssetsResponse.data.data[0];

      const currency = listing.attributes.price?.currency || orderData.currency;
      const { providerCommission, customerCommission } =
        commissionAsset?.type === 'jsonAsset' ? commissionAsset.attributes.data : {};

      const fullOrderData = {
        ...getFullOrderData(orderData, bodyParams, currency),
        processAlias,
      };

      // Both subscription-rental and default-booking line items are computed here;
      // transactionLineItemsWithTax branches on fullOrderData.processAlias and
      // appends the sales-tax line item (Stripe Tax, listing-address sourcing).
      return transactionLineItemsWithTax(
        listing,
        fullOrderData,
        providerCommission,
        customerCommission
      );
    })
    .then(lineItemsResult => {
      lineItems = lineItemsResult.lineItems;
      taxCalculationId = lineItemsResult.taxCalculationId;

      metadataMaybe = getMetadata(orderData, transitionName);

      // Global exclusivity: reject if ANY live subscription already exists for this listing.
      if (isSubscription && !isSpeculative) {
        const listingId = bodyParams?.params?.listingId;
        if (listingId) {
          return checkForExistingSubscription(
            listingId?.uuid || listingId,
            SUBSCRIPTION_PROCESS_NAME
          ).then(() => getTrustedSdk(req));
        }
      }

      return getTrustedSdk(req);
    })
    .then(trustedSdk => {
      const { params } = bodyParams;

      // Add lineItems to the body params
      const body = {
        ...bodyParams,
        processAlias,
        params: {
          ...params,
          lineItems,
          ...metadataMaybe,
        },
      };

      if (isSpeculative) {
        return trustedSdk.transactions.initiateSpeculative(body, queryParams);
      }
      return trustedSdk.transactions.initiate(body, queryParams);
    })
    .then(async apiResponse => {
      const { status, statusText, data } = apiResponse;

      // Write the Stripe Tax calculation id onto the PaymentIntent metadata so
      // the payment_intent.succeeded webhook can record a filable tax transaction.
      // Best-effort: never fails the checkout.
      if (!isSpeculative && taxCalculationId) {
        await updatePaymentIntentTaxMetadata({ transaction: data?.data, taxCalculationId });
      }

      res
        .status(status)
        .set('Content-Type', 'application/transit+json')
        .send(
          serialize({
            status,
            statusText,
            data,
          })
        )
        .end();
    })
    .catch(e => {
      handleError(res, e);
    });
};
