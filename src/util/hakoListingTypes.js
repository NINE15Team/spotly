/**
 * Hako listing-type helpers for day parking vs monthly storage (subscriptions).
 *
 * Hako sells exactly two things: hourly day parking and monthly storage. Over time
 * each has been created under more than one listing-type id, so there are two
 * separate concerns here:
 *
 * 1. SELECTABLE_LISTING_TYPES — the only types a provider may pick when creating a
 *    listing. Everything else (including extra types still present in the hosted
 *    Console asset) is filtered out of config.listing.listingTypes.
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
 * The two listing types offered on the create-listing flow.
 * Change this (and nothing else) to add or retire a listing type.
 */
export const SELECTABLE_LISTING_TYPES = [
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
