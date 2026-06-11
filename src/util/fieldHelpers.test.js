import { isValidCurrencyForTransactionProcess } from './fieldHelpers';

const SUBSCRIPTION_ALIAS = 'subscription-rental/release-5';
const BOOKING_ALIAS = 'default-booking/release-1';

describe('isValidCurrencyForTransactionProcess', () => {
  describe('subscription-rental is treated as a Stripe-related process', () => {
    it('accepts a Stripe-supported currency (USD) with Stripe processor', () => {
      expect(
        isValidCurrencyForTransactionProcess(SUBSCRIPTION_ALIAS, 'USD', 'stripe')
      ).toBe(true);
    });

    it('rejects an unsupported Stripe currency (AFN) with Stripe processor', () => {
      expect(
        isValidCurrencyForTransactionProcess(SUBSCRIPTION_ALIAS, 'AFN', 'stripe')
      ).toBe(false);
    });

    it('accepts a Stripe-supported currency (USD) when processor is unspecified', () => {
      expect(isValidCurrencyForTransactionProcess(SUBSCRIPTION_ALIAS, 'USD', null)).toBe(true);
    });
  });

  describe('parity with booking process', () => {
    it('booking + USD + stripe is valid (regression baseline)', () => {
      expect(isValidCurrencyForTransactionProcess(BOOKING_ALIAS, 'USD', 'stripe')).toBe(true);
    });
  });
});
