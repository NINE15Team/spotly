import { mergeConfig } from './configHelpers';
import defaultConfig from '../config/configDefault';
import { SELECTABLE_LISTING_TYPES } from './hakoListingTypes';

// Mirrors the real /listings/listing-types.json asset from Console, which still
// contains the retired 'daily-rental' type alongside 'hourly-rental'.
const hostedListingTypesAsset = {
  listingTypes: {
    listingTypes: [
      {
        id: 'daily-rental',
        label: 'pr day',
        unitType: 'day',
        availabilityType: 'oneSeat',
        transactionProcess: { name: 'default-booking', alias: 'default-booking/release-1' },
        defaultListingFields: { location: true, payoutDetails: true, price: true },
      },
      {
        id: 'hourly-rental',
        label: 'pr hour',
        unitType: 'hour',
        availabilityType: 'oneSeat',
        transactionProcess: { name: 'default-booking', alias: 'default-booking/release-1' },
        defaultListingFields: { location: true, payoutDetails: true, price: true },
      },
    ],
  },
  listingFields: { listingFields: [] },
  // Only present so the "mandatory hosted asset missing" warning stays quiet.
  branding: { marketplaceColors: { mainColor: '#7c3aed' } },
  transactionSize: { listingMinimumPrice: { amount: 500, currency: 'USD' } },
  // Mirrors the real /listings/listing-search.json asset.
  search: {
    mainSearch: { searchType: 'location' },
    listingTypeFilter: { enabled: true, schemaType: 'listingType' },
    categoryFilter: { enabled: true, schemaType: 'category' },
    dateRangeFilter: {
      enabled: true,
      schemaType: 'dates',
      availability: 'time-partial',
      dateRangeMode: 'day',
    },
    priceFilter: { enabled: true, schemaType: 'price', min: 0, max: 500 },
    keywordsFilter: { enabled: true },
    seatsFilter: { enabled: false, schemaType: 'seats' },
    sorting: {
      defaultSortingOptions: {
        newest: true,
        oldest: true,
        lowestPrice: true,
        highestPrice: true,
        relevance: true,
      },
    },
  },
};

const getListingTypeIds = config => config.listing.listingTypes.map(lt => lt.listingType);

describe('mergeConfig listing types', () => {
  it('offers exactly the two supported Hako listing types', () => {
    const config = mergeConfig(hostedListingTypesAsset, defaultConfig);
    expect(getListingTypeIds(config).sort()).toEqual([...SELECTABLE_LISTING_TYPES].sort());
  });

  it('drops retired listing types that still exist in the hosted asset', () => {
    const config = mergeConfig(hostedListingTypesAsset, defaultConfig);
    const ids = getListingTypeIds(config);
    expect(ids).not.toContain('daily-rental');
    expect(ids).not.toContain('day-parking');
    expect(ids).not.toContain('monthly-storage');
  });

  it('keeps hourly-rental from the hosted asset and monthly-subscription from local config', () => {
    const config = mergeConfig(hostedListingTypesAsset, defaultConfig);
    const byId = Object.fromEntries(config.listing.listingTypes.map(lt => [lt.listingType, lt]));

    expect(byId['hourly-rental']).toBeDefined();
    expect(byId['hourly-rental'].transactionType.unitType).toBe('hour');

    expect(byId['monthly-subscription']).toBeDefined();
    expect(byId['monthly-subscription'].transactionType.process).toBe('subscription-rental');
  });
});
