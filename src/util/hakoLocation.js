/**
 * Public-facing location labels.
 *
 * Exact addresses must not be shown before a booking is confirmed, so listing
 * cards and the listing page show an approximate location instead: the stored
 * address with any street-level segment removed.
 *
 * The unit/building value (e.g. "A 43", "Stall 12") is never public — it
 * identifies the exact spot.
 *
 * NOTE: this hides the address in the UI only. The full address and coordinates
 * still travel in API responses and the Redux store, exactly like Sharetribe's
 * built-in fuzzy map option. Truly withholding them requires keeping the street
 * address out of public data on the backend.
 */

/** A segment is street-level if it begins with a house/building number. */
const isStreetSegment = segment => /^\s*\d/.test(segment);

/**
 * Approximate, shareable location label for a listing.
 *
 * @param {Object} publicData listing publicData
 * @returns {string} e.g. "Los Angeles, California 90042, United States"
 */
export const publicLocationLabel = publicData => {
  const explicit = publicData?.neighborhood || publicData?.city;
  if (explicit) {
    return explicit;
  }

  const address = publicData?.location?.address;
  if (!address || typeof address !== 'string') {
    return '';
  }

  const segments = address.split(',').map(s => s.trim()).filter(Boolean);
  // Drop a leading street segment, but never reduce the label to nothing.
  const withoutStreet =
    segments.length > 1 && isStreetSegment(segments[0]) ? segments.slice(1) : segments;

  return withoutStreet.join(', ');
};

/**
 * Short label (city / first remaining segment) for breadcrumbs and compact rows.
 * @param {Object} publicData listing publicData
 * @returns {string}
 */
export const publicLocationShort = publicData => {
  const label = publicLocationLabel(publicData);
  return label ? label.split(',')[0].trim() : '';
};
