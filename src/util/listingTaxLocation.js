/**
 * Helpers for extracting structured tax location fields from Mapbox / Google
 * place details, and for merging them onto listing.publicData.location.
 *
 * Stripe Tax needs at least country + postalCode. State/city/line1 improve
 * accuracy. Fields are omitted (not null) when missing so coarse POI picks
 * leave the listing without tax fields and the server can reverse-geocode.
 */

/**
 * @param {Object|null|undefined} fields
 * @returns {Object|null} { country, postalCode, state?, city?, line1? } or null
 */
export const pickUsableTaxLocationFields = fields => {
  if (!fields || typeof fields !== 'object') {
    return null;
  }
  const country = fields.country || null;
  const postalCode = fields.postalCode || fields.postal_code || fields.postal || null;
  if (!country || !postalCode) {
    return null;
  }
  return {
    country,
    postalCode,
    ...(fields.state ? { state: fields.state } : {}),
    ...(fields.city ? { city: fields.city } : {}),
    ...(fields.line1 ? { line1: fields.line1 } : {}),
  };
};

/**
 * Map a Mapbox Geocoding feature to tax location fields.
 * @see https://docs.mapbox.com/api/search/geocoding/
 *
 * @param {Object} feature Mapbox feature (prediction)
 * @returns {Object|null}
 */
export const taxLocationFromMapboxFeature = feature => {
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

  // Feature itself may be a postcode / place / address
  const placeTypes = Array.isArray(feature.place_type) ? feature.place_type : [];
  const isPostcodeFeature = placeTypes.includes('postcode');
  const isAddressFeature = placeTypes.includes('address');

  const country =
    countryCtx?.short_code?.toUpperCase() ||
    (typeof countryCtx?.text === 'string' ? countryCtx.text : null);
  const postalCode = isPostcodeFeature
    ? feature.text
    : postcodeCtx?.text || null;
  const state =
    regionCtx?.short_code?.replace(/^[a-z]{2}-/i, '') ||
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
 * Map Google Places addressComponents (new Places API) to tax location fields.
 *
 * @param {Array} addressComponents
 * @returns {Object|null}
 */
export const taxLocationFromGoogleAddressComponents = addressComponents => {
  if (!Array.isArray(addressComponents) || addressComponents.length === 0) {
    return null;
  }

  const byType = type => {
    const c = addressComponents.find(
      component => Array.isArray(component.types) && component.types.includes(type)
    );
    return c || null;
  };

  const country = byType('country')?.shortText || byType('country')?.short_name || null;
  const postalCode = byType('postal_code')?.longText || byType('postal_code')?.long_name || null;
  const state =
    byType('administrative_area_level_1')?.shortText ||
    byType('administrative_area_level_1')?.short_name ||
    null;
  const city =
    byType('locality')?.longText ||
    byType('locality')?.long_name ||
    byType('sublocality')?.longText ||
    byType('sublocality')?.long_name ||
    byType('postal_town')?.longText ||
    byType('postal_town')?.long_name ||
    null;

  const streetNumber =
    byType('street_number')?.longText || byType('street_number')?.long_name || '';
  const route = byType('route')?.longText || byType('route')?.long_name || '';
  const line1 = [streetNumber, route].filter(Boolean).join(' ').trim() || null;

  return pickUsableTaxLocationFields({
    country: country ? String(country).toUpperCase() : null,
    postalCode,
    state,
    city,
    line1,
  });
};

/**
 * Merge tax location fields into publicData.location for a listing update.
 * Always overwrites previous tax fields when a new place is selected so a
 * stale ZIP cannot linger after the provider moves the pin.
 *
 * @param {Object} locationExisting { address, building, ... }
 * @param {Object|null} taxLocation from place details
 * @returns {Object} location object to store in publicData
 */
export const mergeLocationWithTaxFields = (locationExisting, taxLocation) => {
  const { address, building } = locationExisting || {};
  const base = {
    ...(address != null ? { address } : {}),
    ...(building != null ? { building } : {}),
  };

  // Strip any previous tax fields first, then apply new ones (or leave absent).
  const usable = pickUsableTaxLocationFields(taxLocation);
  if (!usable) {
    return base;
  }
  return { ...base, ...usable };
};
