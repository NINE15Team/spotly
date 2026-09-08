/**
 * Public-facing location labels.
 *
 * Exact addresses must not be shown before a booking is confirmed, so listings
 * are presented as "City, State" only — never the street line, postal code or
 * the unit/building value (e.g. "A 43", "Stall 12"), which pinpoints the spot.
 *
 * Sharetribe stores the structured parts (city/state) for some listings and only
 * a single address string for others, so both are handled.
 *
 * NOTE: this hides the address in the UI only. The full address and coordinates
 * still travel in API responses and the Redux store, exactly like Sharetribe's
 * built-in fuzzy map option. Truly withholding them requires keeping the street
 * address out of public data on the backend.
 */

/** A segment is street-level if it begins with a house/building number. */
const isStreetSegment = segment => /^\s*\d/.test(segment);

/** Country names that we drop — "City, State" is enough for a US marketplace. */
const COUNTRY_SEGMENTS = ['united states', 'usa', 'us'];
const isCountrySegment = segment => COUNTRY_SEGMENTS.includes(segment.trim().toLowerCase());

/** "Michigan 48326" -> "Michigan"; "CA 94550" -> "CA". */
const stripPostalCode = segment =>
  segment
    .replace(/\b\d{5}(-\d{4})?\b/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

/**
 * Splits a stored address into the segments that may be shown publicly:
 * street line and country removed, postal codes stripped.
 */
const publicSegments = address => {
  if (!address || typeof address !== 'string') {
    return [];
  }
  const segments = address
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const withoutStreet =
    segments.length > 1 && isStreetSegment(segments[0]) ? segments.slice(1) : segments;

  return withoutStreet
    .filter(s => !isCountrySegment(s))
    .map(stripPostalCode)
    .filter(Boolean);
};

/**
 * Public location for a listing: "City, State".
 *
 * @param {Object} publicData listing publicData
 * @returns {string} e.g. "Auburn Hills, Michigan" or "Livermore, CA"
 */
export const publicLocationLabel = publicData => {
  const location = publicData?.location || {};

  // Prefer the structured parts when Sharetribe stored them.
  const city = location.city || publicData?.city || publicData?.neighborhood;
  const state = location.state || publicData?.state;
  if (city && state) {
    return `${city}, ${state}`;
  }
  if (city) {
    return city;
  }

  // Otherwise derive City, State from the address string.
  const segments = publicSegments(location.address);
  return segments.slice(0, 2).join(', ');
};

/**
 * City only, for breadcrumbs and compact rows.
 * @param {Object} publicData listing publicData
 * @returns {string}
 */
export const publicLocationShort = publicData => {
  const label = publicLocationLabel(publicData);
  return label ? label.split(',')[0].trim() : '';
};
