const log = require('../log');

/**
 * Shared listing tax-location helpers (server).
 * Mirrors src/util/listingTaxLocation.js for CommonJS / Node.
 */

const TAX_ADDRESS_SOURCE_LISTING = 'listing_address';
const TAX_ADDRESS_SOURCE_LISTING_GEOCODE = 'listing_geocode';

/**
 * @param {Object|null|undefined} fields
 * @returns {Object|null} { country, postalCode, state?, city?, line1? }
 */
const pickUsableTaxLocationFields = fields => {
  if (!fields || typeof fields !== 'object') {
    return null;
  }
  const country = fields.country || null;
  const postalCode = fields.postalCode || fields.postal_code || fields.postal || null;
  if (!country || !postalCode) {
    return null;
  }
  return {
    country: String(country).toUpperCase(),
    postalCode: String(postalCode),
    ...(fields.state ? { state: String(fields.state) } : {}),
    ...(fields.city ? { city: String(fields.city) } : {}),
    ...(fields.line1 ? { line1: String(fields.line1) } : {}),
  };
};

/**
 * Convert listing publicData.location tax fields to a Stripe-shaped address.
 *
 * @param {Object} location publicData.location
 * @returns {Object|null} Stripe address { country, postal_code, ... }
 */
const stripeAddressFromListingLocation = location => {
  const usable = pickUsableTaxLocationFields(location);
  if (!usable) {
    return null;
  }
  return {
    ...(usable.line1 ? { line1: usable.line1 } : {}),
    ...(usable.city ? { city: usable.city } : {}),
    ...(usable.state ? { state: usable.state } : {}),
    postal_code: usable.postalCode,
    country: usable.country,
  };
};

/**
 * Map a Mapbox Geocoding feature to tax location fields (listing publicData shape).
 *
 * @param {Object} feature
 * @returns {Object|null}
 */
const taxLocationFromMapboxFeature = feature => {
  if (!feature || typeof feature !== 'object') {
    return null;
  }

  const context = Array.isArray(feature.context) ? feature.context : [];
  const findContext = prefix => {
    const item = context.find(c => typeof c?.id === 'string' && c.id.startsWith(`${prefix}.`));
    return item || null;
  };

  const countryCtx = findContext('country');
  const regionCtx = findContext('region');
  const placeCtx = findContext('place');
  const localityCtx = findContext('locality');
  const postcodeCtx = findContext('postcode');

  const placeTypes = Array.isArray(feature.place_type) ? feature.place_type : [];
  const isPostcodeFeature = placeTypes.includes('postcode');
  const isAddressFeature = placeTypes.includes('address');

  const country =
    (countryCtx?.short_code && String(countryCtx.short_code).toUpperCase()) ||
    (typeof countryCtx?.text === 'string' ? countryCtx.text : null);
  const postalCode = isPostcodeFeature ? feature.text : postcodeCtx?.text || null;
  const state =
    (regionCtx?.short_code && String(regionCtx.short_code).replace(/^[a-z]{2}-/i, '')) ||
    regionCtx?.text ||
    null;
  const city = placeCtx?.text || localityCtx?.text || null;

  let line1 = null;
  if (isAddressFeature) {
    const number = feature.address || '';
    const street = feature.text || '';
    line1 = [number, street].filter(Boolean).join(' ').trim() || null;
  }

  return pickUsableTaxLocationFields({
    country,
    postalCode,
    state,
    city,
    line1,
  });
};

/**
 * Map Google Geocoding API reverse-geocode result to tax location fields.
 *
 * @param {Object} result Google geocode result with address_components
 * @returns {Object|null}
 */
const taxLocationFromGoogleGeocodeResult = result => {
  const components = result?.address_components;
  if (!Array.isArray(components) || components.length === 0) {
    return null;
  }

  const byType = type =>
    components.find(c => Array.isArray(c.types) && c.types.includes(type)) || null;

  const country = byType('country')?.short_name || null;
  const postalCode = byType('postal_code')?.long_name || null;
  const state = byType('administrative_area_level_1')?.short_name || null;
  const city =
    byType('locality')?.long_name ||
    byType('sublocality')?.long_name ||
    byType('postal_town')?.long_name ||
    null;
  const streetNumber = byType('street_number')?.long_name || '';
  const route = byType('route')?.long_name || '';
  const line1 = [streetNumber, route].filter(Boolean).join(' ').trim() || null;

  return pickUsableTaxLocationFields({
    country,
    postalCode,
    state,
    city,
    line1,
  });
};

/**
 * Reverse-geocode lat/lng via Mapbox Geocoding API.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {string} accessToken
 * @returns {Promise<Object|null>} tax location fields
 */
const reverseGeocodeMapbox = async (lat, lng, accessToken) => {
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(lng)},` +
    `${encodeURIComponent(lat)}.json?types=address,postcode,place&limit=1&access_token=${encodeURIComponent(
      accessToken
    )}`;
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Mapbox reverse geocode failed (${response.status}): ${body}`);
  }
  const data = await response.json();
  const feature = data?.features?.[0];
  return taxLocationFromMapboxFeature(feature);
};

/**
 * Reverse-geocode lat/lng via Google Geocoding API.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {string} apiKey
 * @returns {Promise<Object|null>} tax location fields
 */
const reverseGeocodeGoogle = async (lat, lng, apiKey) => {
  const url =
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(lat)},` +
    `${encodeURIComponent(lng)}&key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google reverse geocode failed (${response.status}): ${body}`);
  }
  const data = await response.json();
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google reverse geocode status: ${data.status}`);
  }
  const result = data.results?.[0];
  return taxLocationFromGoogleGeocodeResult(result);
};

/**
 * Reverse-geocode listing coordinates using Mapbox (preferred) or Google.
 *
 * @param {{ lat: number, lng: number }} geolocation
 * @returns {Promise<Object|null>} tax location fields for publicData.location
 */
const reverseGeocodeListingLocation = async geolocation => {
  const lat = geolocation?.lat;
  const lng = geolocation?.lng;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return null;
  }

  const mapboxToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;
  const googleKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

  try {
    if (mapboxToken) {
      return await reverseGeocodeMapbox(lat, lng, mapboxToken);
    }
    if (googleKey) {
      return await reverseGeocodeGoogle(lat, lng, googleKey);
    }
    log.warn('Listing reverse geocode skipped: no Mapbox or Google Maps API key configured.');
    return null;
  } catch (e) {
    log.error(e, 'listing-reverse-geocode-failed', { lat, lng });
    return null;
  }
};

module.exports = {
  TAX_ADDRESS_SOURCE_LISTING,
  TAX_ADDRESS_SOURCE_LISTING_GEOCODE,
  pickUsableTaxLocationFields,
  stripeAddressFromListingLocation,
  taxLocationFromMapboxFeature,
  taxLocationFromGoogleGeocodeResult,
  reverseGeocodeListingLocation,
};
