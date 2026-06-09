const sharetribeSdk = require('sharetribe-flex-sdk');
const { transactionLineItems } = require('../api-util/lineItems');
const { subscriptionTransactionLineItems } = require('../api-util/subscriptionLineItems');
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

      lineItems = isSubscription
        ? subscriptionTransactionLineItems(listing, fullOrderData, providerCommission, customerCommission)
        : transactionLineItems(listing, fullOrderData, providerCommission, customerCommission);

      metadataMaybe = getMetadata(orderData, transitionName);

      // Double-booking guard: reject if customer already has a live subscription for this listing.
      if (isSubscription && !isSpeculative) {
        const listingId = bodyParams?.params?.listingId;
        return sdk.currentUser.show().then(userResponse => {
          const customerId = userResponse?.data?.data?.id?.uuid;
          if (customerId && listingId) {
            return checkForExistingSubscription(customerId, listingId?.uuid || listingId, SUBSCRIPTION_PROCESS_NAME)
              .then(() => getTrustedSdk(req));
          }
          return getTrustedSdk(req);
        });
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
    .then(apiResponse => {
      const { status, statusText, data } = apiResponse;
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
