/**
 * Hako listing-type helpers for day parking vs monthly storage (subscriptions).
 *
 * UI / nav / search display `day-parking` and `monthly-storage`, but existing
 * listings in the marketplace were created under the older `daily-rental` and
 * `monthly-subscription` listing types. Search queries must match both the
 * canonical and legacy values (the Flex API supports comma-separated OR
 * matching on pub_ filters), or real listings never show up in results.
 */

export const DAY_PARKING_LISTING_TYPE = 'day-parking';
export const DAILY_RENTAL_LISTING_TYPE = 'daily-rental';
export const MONTHLY_STORAGE_LISTING_TYPE = 'monthly-storage';
export const MONTHLY_SUBSCRIPTION_LISTING_TYPE = 'monthly-subscription';

export const DAY_LISTING_TYPES = [DAY_PARKING_LISTING_TYPE, DAILY_RENTAL_LISTING_TYPE];
export const MONTHLY_LISTING_TYPES = [
  MONTHLY_STORAGE_LISTING_TYPE,
  MONTHLY_SUBSCRIPTION_LISTING_TYPE,
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
