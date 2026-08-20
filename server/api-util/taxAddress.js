const log = require('../log');
const {
  TAX_ADDRESS_SOURCE_LISTING,
  TAX_ADDRESS_SOURCE_LISTING_GEOCODE,
  pickUsableTaxLocationFields,
  stripeAddressFromListingLocation,
  reverseGeocodeListingLocation,
} = require('./listingTaxLocation');
const {
  isIntegrationSdkConfigured,
  updateListingPublicDataLocation,
} = require('./integrationSdk');

/**
 * Tax address resolution for Stripe Tax.
 *
 * Spotly sources sales tax to the LISTING (facility) address — origin / place-of-
 * supply for parking and storage rentals. Structured fields live on
 * listing.publicData.location; legacy listings without them are reverse-geocoded
 * from geolocation and written back via the Integration API.
 */

/**
 * Normalize a loosely-shaped address object into Stripe's address format.
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
    ...(country ? { country: String(country).toUpperCase() } : {}),
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
 * Best-effort: merge reverse-geocoded tax fields onto the listing so later
 * checkouts skip the geocode call. Never throws.
 *
 * @param {Object} listing
 * @param {Object} taxLocationFields { country, postalCode, ... }
 */
const persistListingTaxLocation = async (listing, taxLocationFields) => {
  if (!taxLocationFields || !isIntegrationSdkConfigured()) {
    return;
  }
  const listingId = listing?.id?.uuid || listing?.id;
  if (!listingId) {
    return;
  }
  try {
    const existing = listing?.attributes?.publicData?.location || {};
    const { address, building } = existing;
    const usable = pickUsableTaxLocationFields(taxLocationFields);
    if (!usable) {
      return;
    }
    const location = {
      ...(address != null ? { address } : {}),
      ...(building != null ? { building } : {}),
      ...usable,
    };
    await updateListingPublicDataLocation(listingId, location);
    log.info('Listing tax location persisted after reverse geocode', {
      listingId: typeof listingId === 'string' ? listingId : listingId?.uuid,
      country: usable.country,
      postalCode: usable.postalCode,
    });
  } catch (e) {
    log.error(e, 'listing-tax-location-write-back-failed', {
      listingId: listing?.id?.uuid || listing?.id,
    });
  }
};

/**
 * Resolve the facility tax address from a listing.
 *
 * Priority:
 * 1. Structured fields on listing.publicData.location (country + postalCode)
 * 2. Reverse-geocode listing.attributes.geolocation, then best-effort write-back
 *
 * Customer checkout taxAddress is intentionally ignored (parking/storage place of supply).
 *
 * @param {Object} listing
 * @returns {Promise<{ address: Object, source: string, taxLocationFields?: Object }|null>}
 */
const getTaxAddressFromListing = async listing => {
  const location = listing?.attributes?.publicData?.location;
  const fromPublicData = stripeAddressFromListingLocation(location);
  if (isUsableTaxAddress(fromPublicData)) {
    return {
      address: fromPublicData,
      source: TAX_ADDRESS_SOURCE_LISTING,
      taxLocationFields: pickUsableTaxLocationFields(location),
    };
  }

  const geolocation = listing?.attributes?.geolocation;
  const taxLocationFields = await reverseGeocodeListingLocation(geolocation);
  const fromGeocode = stripeAddressFromListingLocation(taxLocationFields);
  if (!isUsableTaxAddress(fromGeocode)) {
    return null;
  }

  // Fire-and-forget persist; do not await failures into the tax path beyond this call.
  await persistListingTaxLocation(listing, taxLocationFields);

  return {
    address: fromGeocode,
    source: TAX_ADDRESS_SOURCE_LISTING_GEOCODE,
    taxLocationFields,
  };
};

/**
 * @deprecated Customer-address sourcing — kept for tests/compat; prefer getTaxAddressFromListing.
 * @param {Object} orderData
 * @returns {Object|null}
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
      return { address, source: 'customer_address' };
    }
  }

  return null;
};

module.exports = {
  TAX_ADDRESS_SOURCE_LISTING,
  TAX_ADDRESS_SOURCE_LISTING_GEOCODE,
  normalizeAddress,
  isUsableTaxAddress,
  getTaxAddressFromListing,
  getTaxAddressFromOrderData,
  persistListingTaxLocation,
};
