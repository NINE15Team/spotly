import {
  DAY_PARKING_LISTING_TYPE,
  MONTHLY_STORAGE_LISTING_TYPE,
  isMonthlyListingType,
  listingTypeForSearch,
  parkingOptionFromListingType,
} from './hakoListingTypes';

describe('hakoListingTypes', () => {
  it('detects monthly listing types', () => {
    expect(isMonthlyListingType(MONTHLY_STORAGE_LISTING_TYPE)).toBe(true);
    expect(isMonthlyListingType('monthly-subscription')).toBe(true);
    expect(isMonthlyListingType(DAY_PARKING_LISTING_TYPE)).toBe(false);
    expect(isMonthlyListingType(null)).toBe(false);
  });

  it('normalizes search listing types to every alias for that category', () => {
    expect(listingTypeForSearch('monthly-storage')).toBe('monthly-storage,monthly-subscription');
    expect(listingTypeForSearch('monthly-subscription')).toBe('monthly-storage,monthly-subscription');
    expect(listingTypeForSearch('day-parking')).toBe('day-parking,daily-rental');
    expect(listingTypeForSearch(undefined)).toBe('day-parking,daily-rental');
  });

  it('maps URL listing types to parking options', () => {
    expect(parkingOptionFromListingType('monthly-subscription')).toBe(MONTHLY_STORAGE_LISTING_TYPE);
    expect(parkingOptionFromListingType('day-parking')).toBe(DAY_PARKING_LISTING_TYPE);
  });
});
