const { types } = require('sharetribe-flex-sdk');
const { Money } = types;
const {
  getProviderCommissionMaybe,
  getCustomerCommissionMaybe,
} = require('./lineItemHelpers');
const { getFirstPeriodEnd } = require('./subscriptionDates');

/**
 * Build line items for subscription-rental checkout (first period, full monthly price).
 *
 * Uses line-item/day with quantity 1 so the Web Template order breakdown stays compatible.
 * Listing unitType should be `day` (or `fixed`) on subscription listing types.
 *
 * @param {Object} listing
 * @param {Object} orderData
 * @param {Object} providerCommission
 * @param {Object} customerCommission
 * @returns {Array} lineItems
 */
const subscriptionTransactionLineItems = (
  listing,
  orderData,
  providerCommission,
  customerCommission
) => {
  const { bookingStart, bookingEnd, priceVariantName } = orderData || {};
  const publicData = listing.attributes.publicData || {};
  const { priceVariants, priceVariationsEnabled } = publicData;
  const priceAttribute = listing.attributes.price;
  const currency = priceAttribute?.currency || orderData.currency;

  if (!bookingStart) {
    const error = new Error('Subscription checkout requires bookingStart in orderData.');
    error.status = 400;
    error.statusText = error.message;
    throw error;
  }

  const periodEnd = bookingEnd ? new Date(bookingEnd) : getFirstPeriodEnd(bookingStart);

  const priceVariantConfig = priceVariants
    ? priceVariants.find(pv => pv.name === priceVariantName)
    : null;
  const { priceInSubunits } = priceVariantConfig || {};
  const isPriceInSubunitsValid = Number.isInteger(priceInSubunits) && priceInSubunits >= 0;

  const monthlyUnitPrice =
    priceVariationsEnabled && isPriceInSubunitsValid
      ? new Money(priceInSubunits, currency)
      : priceAttribute instanceof Money
        ? priceAttribute
        : new Money(priceAttribute?.amount, currency);

  const unitPrice = monthlyUnitPrice;

  const order = {
    code: 'line-item/day',
    unitPrice,
    quantity: 1,
    includeFor: ['customer', 'provider'],
  };

  return [
    order,
    ...getProviderCommissionMaybe(providerCommission, order, currency),
    ...getCustomerCommissionMaybe(customerCommission, order, currency),
  ];
};

module.exports = {
  subscriptionTransactionLineItems,
};
