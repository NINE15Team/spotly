import {
  DAY_PARKING_LISTING_TYPE,
  MONTHLY_STORAGE_LISTING_TYPE,
  SELECTABLE_LISTING_TYPES,
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

  it('offers the three selectable listing types (pr day, pr hour, monthly)', () => {
    expect(SELECTABLE_LISTING_TYPES).toEqual([
      'daily-rental',
      'hourly-rental',
      'monthly-subscription',
    ]);
  });

  it('normalizes search listing types to every alias for that category', () => {
    const monthly = 'monthly-subscription,monthly-storage';
    const day = 'hourly-rental,day-parking,daily-rental';
    expect(listingTypeForSearch('monthly-storage')).toBe(monthly);
    expect(listingTypeForSearch('monthly-subscription')).toBe(monthly);
    expect(listingTypeForSearch('day-parking')).toBe(day);
    expect(listingTypeForSearch(undefined)).toBe(day);
  });

  it('keeps retired ids searchable so existing listings still match', () => {
    // hourly-rental is the type new listings use; daily-rental is what older
    // parking listings were created under. Both must resolve to day parking.
    expect(listingTypeForSearch('day-parking')).toContain('hourly-rental');
    expect(listingTypeForSearch('day-parking')).toContain('daily-rental');
  });

  it('maps URL listing types to parking options', () => {
    expect(parkingOptionFromListingType('monthly-subscription')).toBe(MONTHLY_STORAGE_LISTING_TYPE);
    expect(parkingOptionFromListingType('day-parking')).toBe(DAY_PARKING_LISTING_TYPE);
    expect(parkingOptionFromListingType('hourly-rental')).toBe(DAY_PARKING_LISTING_TYPE);
  });
});
