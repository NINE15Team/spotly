const { transactionLineItemsWithTax } = require('../api-util/lineItems');
const { getSdk, handleError, serialize, fetchCommission } = require('../api-util/sdk');
const { constructValidLineItems } = require('../api-util/lineItemHelpers');

module.exports = (req, res) => {
  const { isOwnListing, listingId, orderData } = req.body || {};

  if (!listingId) {
    res.status(400).json({ message: 'listingId is required.' });
    return;
  }

  const sdk = getSdk(req, res);

  const listingPromise = () =>
    isOwnListing ? sdk.ownListings.show({ id: listingId }) : sdk.listings.show({ id: listingId });

  Promise.all([listingPromise(), fetchCommission(sdk)])
    .then(([showListingResponse, fetchAssetsResponse]) => {
      const listing = showListingResponse.data.data;
      const commissionAsset = fetchAssetsResponse.data.data[0];

      const { providerCommission, customerCommission } =
        commissionAsset?.type === 'jsonAsset' ? commissionAsset.attributes.data : {};

      const processAlias =
        orderData?.processAlias || listing.attributes?.publicData?.transactionProcessAlias;

      // Includes the sales-tax line item when tax is enabled and orderData
      // carries the customer's tax address (Stripe Tax, customer-address sourcing).
      return transactionLineItemsWithTax(
        listing,
        { ...orderData, processAlias },
        providerCommission,
        customerCommission
      );
    })
    .then(({ lineItems }) => {
      // Because we are using returned lineItems directly in this template we need to use the helper function
      // to add some attributes like lineTotal and reversal that Marketplace API also adds to the response.
      const validLineItems = constructValidLineItems(lineItems);

      res
        .status(200)
        .set('Content-Type', 'application/transit+json')
        .send(serialize({ data: validLineItems }))
        .end();
    })
    .catch(e => {
      handleError(res, e);
    });
};
