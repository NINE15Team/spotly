/**
 * Hako listing-type helpers for day/hour booking vs monthly subscription.
 *
 * Providers can create three listing types (Console labels → ids):
 *   - "pr day"  → daily-rental   (hosted)
 *   - "pr hour" → hourly-rental  (hosted)
 *   - "Monthly subscription" → monthly-subscription (local; subscription-rental process)
 *
 * Parking and Storage are listing *categories* (Console), not listing types.
 *
 * Over time day/hour parking has also used other ids, so there are two concerns:
 *
 * 1. SELECTABLE_LISTING_TYPES — types a provider may pick when creating a listing.
 *    Extra / retired types still present in the hosted Console asset are filtered out
 *    of config.listing.listingTypes.
 * 2. DAY_LISTING_TYPES / MONTHLY_LISTING_TYPES — every id that has *ever* been used
 *    for that category. Search must match all of them (the Flex API supports
 *    comma-separated OR matching on pub_ filters), or older listings created under
 *    a legacy id silently disappear from results.
 */

export const DAY_PARKING_LISTING_TYPE = 'day-parking';
export const DAILY_RENTAL_LISTING_TYPE = 'daily-rental';
export const HOURLY_RENTAL_LISTING_TYPE = 'hourly-rental';
export const MONTHLY_STORAGE_LISTING_TYPE = 'monthly-storage';
export const MONTHLY_SUBSCRIPTION_LISTING_TYPE = 'monthly-subscription';

/**
 * Listing types offered on the create-listing flow.
 * Change this (and nothing else) to add or retire a listing type.
 */
export const SELECTABLE_LISTING_TYPES = [
  DAILY_RENTAL_LISTING_TYPE,
  HOURLY_RENTAL_LISTING_TYPE,
  MONTHLY_SUBSCRIPTION_LISTING_TYPE,
];

/** Includes retired ids so existing listings stay searchable. */
export const DAY_LISTING_TYPES = [
  HOURLY_RENTAL_LISTING_TYPE,
  DAY_PARKING_LISTING_TYPE,
  DAILY_RENTAL_LISTING_TYPE,
];
export const MONTHLY_LISTING_TYPES = [
  MONTHLY_SUBSCRIPTION_LISTING_TYPE,
  MONTHLY_STORAGE_LISTING_TYPE,
];

/**
 * Human-readable listing-type names.
 *
 * The hosted Console labels are abbreviated ("pr day", "pr hour"), which providers
 * found unclear, so the UI spells them out instead of showing the raw Console label.
 * Keyed by listing type id; retired ids are included so older listings still resolve.
 */
export const LISTING_TYPE_LABELS = {
  [DAILY_RENTAL_LISTING_TYPE]: 'Day parking — per day',
  [HOURLY_RENTAL_LISTING_TYPE]: 'Day parking — per hour',
  [DAY_PARKING_LISTING_TYPE]: 'Day parking',
  [MONTHLY_SUBSCRIPTION_LISTING_TYPE]: 'Monthly storage',
  [MONTHLY_STORAGE_LISTING_TYPE]: 'Monthly storage',
};

/**
 * Spelled-out name for a listing type, for display to buyers and providers.
 * @param {string} listingType
 * @param {string} [fallback] used when the id is unknown (e.g. the Console label)
 * @returns {string}
 */
export const listingTypeLabel = (listingType, fallback = '') =>
  LISTING_TYPE_LABELS[listingType] || fallback || listingType || '';

/**
 * @param {string} listingType single value or comma-separated pub_listingType value
 * @returns {boolean}
 */
export const isMonthlyListingType = listingType =>
  !!listingType && listingType.split(',').some(type => MONTHLY_LISTING_TYPES.includes(type));

/**
 * @param {string} listingType single value or comma-separated pub_listingType value
 * @returns {boolean}
 */
export const isDayListingType = listingType =>
  !!listingType && listingType.split(',').some(type => DAY_LISTING_TYPES.includes(type));

/**
 * Build the pub_listingType search query value for a parking-option / listing-type UI value.
 * Returns every listing type (canonical + legacy alias) for that category, comma-separated,
 * so the search matches listings created under either name.
 * @param {string} parkingOption
 * @returns {string}
 */
export const listingTypeForSearch = parkingOption => {
  if (isMonthlyListingType(parkingOption) || parkingOption === 'monthly') {
    return MONTHLY_LISTING_TYPES.join(',');
  }
  return DAY_LISTING_TYPES.join(',');
};

/**
 * Parking option for Hako search bar from URL query listing type.
 * @param {string} listingTypeFromUrl
 * @returns {string}
 */
export const parkingOptionFromListingType = listingTypeFromUrl => {
  if (isMonthlyListingType(listingTypeFromUrl)) {
    return MONTHLY_STORAGE_LISTING_TYPE;
  }
  return DAY_PARKING_LISTING_TYPE;
};
