/**
 * Hako listing-type helpers for day parking vs monthly storage (subscriptions).
 *
 * UI / nav / search use `day-parking` and `monthly-storage`.
 * Local config may still use `monthly-subscription` as an alias for the same process.
 */

export const DAY_PARKING_LISTING_TYPE = 'day-parking';
export const MONTHLY_STORAGE_LISTING_TYPE = 'monthly-storage';
export const MONTHLY_SUBSCRIPTION_LISTING_TYPE = 'monthly-subscription';

export const MONTHLY_LISTING_TYPES = [
  MONTHLY_STORAGE_LISTING_TYPE,
  MONTHLY_SUBSCRIPTION_LISTING_TYPE,
];

/**
 * @param {string} listingType
 * @returns {boolean}
 */
export const isMonthlyListingType = listingType =>
  !!listingType && MONTHLY_LISTING_TYPES.includes(listingType);

/**
 * Normalize parking-option / listing-type UI values to the canonical search query value.
 * @param {string} parkingOption
 * @returns {string}
 */
export const listingTypeForSearch = parkingOption => {
  if (isMonthlyListingType(parkingOption) || parkingOption === 'monthly') {
    return MONTHLY_STORAGE_LISTING_TYPE;
  }
  return DAY_PARKING_LISTING_TYPE;
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
