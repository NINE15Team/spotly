import { fakeIntl } from './testData';
import { getListingPricePerUnitLabel } from './listingPriceLabels';

const SUBSCRIPTION_ALIAS = 'subscription-rental/release-5';
const BOOKING_ALIAS = 'default-booking/release-1';

describe('getListingPricePerUnitLabel', () => {
  it('returns the subscription label for subscription listings', () => {
    const label = getListingPricePerUnitLabel(
      fakeIntl,
      SUBSCRIPTION_ALIAS,
      'day',
      'ListingCard.perUnit',
      'ListingCard.subscriptionPerUnit'
    );
    // fakeIntl.formatMessage returns the message id
    expect(label).toBe('ListingCard.subscriptionPerUnit');
  });

  it('returns the subscription label even when unitType is missing', () => {
    const label = getListingPricePerUnitLabel(
      fakeIntl,
      SUBSCRIPTION_ALIAS,
      undefined,
      'ListingCard.perUnit',
      'ListingCard.subscriptionPerUnit'
    );
    expect(label).toBe('ListingCard.subscriptionPerUnit');
  });

  it('returns the standard per-unit label for non-subscription listings with a unitType', () => {
    const label = getListingPricePerUnitLabel(
      fakeIntl,
      BOOKING_ALIAS,
      'day',
      'ListingCard.perUnit',
      'ListingCard.subscriptionPerUnit'
    );
    expect(label).toBe('ListingCard.perUnit');
  });

  it('returns an empty string for non-subscription listings without a unitType', () => {
    const label = getListingPricePerUnitLabel(
      fakeIntl,
      BOOKING_ALIAS,
      undefined,
      'ListingCard.perUnit',
      'ListingCard.subscriptionPerUnit'
    );
    expect(label).toBe('');
  });
});
