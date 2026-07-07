const TAX_ADDRESS_SOURCE_CUSTOMER = 'customer_address';

/**
 * Tax address resolution for Stripe Tax.
 *
 * Spotly sources sales tax to the CUSTOMER (renter) address — destination-based
 * sourcing. The address is collected on the checkout page and carried in
 * orderData / protectedData so it is available server-side at line-item time
 * (both for the speculative breakdown and the real transition).
 *
 * NOTE: This deliberately differs from implementations that source tax to the
 * provider/listing location. See docs/stripe-tax-integration.md §3.
 */

/**
 * Normalize a loosely-shaped address object into Stripe's address format.
 * Accepts keys from the checkout billing address form (addressLine1, postal, ...),
 * the shipping details object (line1, postalCode, ...), or an already-normalized
 * Stripe address (line1, postal_code, ...).
 *
 * @param {Object} addr
 * @returns {Object|null} Stripe-shaped address or null
 */
const normalizeAddress = addr => {
  if (!addr || typeof addr !== 'object') {
    return null;
  }

  const line1 = addr.line1 || addr.addressLine1 || null;
  const line2 = addr.line2 || addr.addressLine2 || null;
  const city = addr.city || null;
  const state = addr.state || addr.province || null;
  const postalCode = addr.postal_code || addr.postalCode || addr.postal || null;
  const country = addr.country || null;

  return {
    ...(line1 ? { line1 } : {}),
    ...(line2 ? { line2 } : {}),
    ...(city ? { city } : {}),
    ...(state ? { state } : {}),
    ...(postalCode ? { postal_code: postalCode } : {}),
    ...(country ? { country } : {}),
  };
};

/**
 * Minimum viable address for a Stripe Tax calculation:
 * country + postal code (state/city improve accuracy but are not strictly required).
 *
 * @param {Object} address Stripe-shaped address
 * @returns {boolean}
 */
const isUsableTaxAddress = address =>
  Boolean(address && address.country && address.postal_code);

/**
 * Resolve the customer's tax address from orderData.
 *
 * Priority:
 * 1. Explicit tax address (orderData.taxAddress or protectedData.taxAddress) —
 *    set by the checkout page from the billing address fields.
 * 2. Shipping details recipient address (protectedData.shippingDetails.address) —
 *    used when the delivery method is shipping (default-purchase style checkouts).
 *
 * @param {Object} orderData full order data available in the privileged line-item flow
 * @returns {Object|null} { address, source } or null when no usable address exists
 */
const getTaxAddressFromOrderData = orderData => {
  const protectedData = orderData?.protectedData || {};

  const candidates = [
    orderData?.taxAddress,
    protectedData.taxAddress,
    protectedData.shippingDetails?.address,
  ];

  for (const candidate of candidates) {
    const address = normalizeAddress(candidate);
    if (isUsableTaxAddress(address)) {
      return { address, source: TAX_ADDRESS_SOURCE_CUSTOMER };
    }
  }

  return null;
};

module.exports = {
  TAX_ADDRESS_SOURCE_CUSTOMER,
  normalizeAddress,
  isUsableTaxAddress,
  getTaxAddressFromOrderData,
};
