jest.mock('./stripeClient', () => ({
  getStripe: jest.fn(),
}));

const { getStripe } = require('./stripeClient');
const {
  getPaymentIntentIdFromClientSecret,
  getPaymentIntentIdFromProtectedData,
  capturePaymentIntentIfNeeded,
  createMonthlyStripePrice,
} = require('./subscriptionStripe');

const PI_ID = 'pi_3Tg6fVRCaDkzUSwR09bml6uG';
const CLIENT_SECRET = `${PI_ID}_secret_A0z2E8JekwcaPpQ6DTwfGigEM`;

describe('subscriptionStripe payment intent parsing', () => {
  describe('getPaymentIntentIdFromClientSecret(clientSecret)', () => {
    it('extracts the PaymentIntent id from a client secret', () => {
      expect(getPaymentIntentIdFromClientSecret(CLIENT_SECRET)).toBe(PI_ID);
    });

    it('returns null for empty or non-string input', () => {
      expect(getPaymentIntentIdFromClientSecret(null)).toBeNull();
      expect(getPaymentIntentIdFromClientSecret(undefined)).toBeNull();
      expect(getPaymentIntentIdFromClientSecret(123)).toBeNull();
    });
  });

  describe('getPaymentIntentIdFromProtectedData(protectedData)', () => {
    it('reads the Web Template object shape (stripePaymentIntentClientSecret)', () => {
      const protectedData = {
        stripePaymentIntents: {
          default: { stripePaymentIntentClientSecret: CLIENT_SECRET },
        },
      };
      expect(getPaymentIntentIdFromProtectedData(protectedData)).toBe(PI_ID);
    });

    it('reads an explicit stripePaymentIntentId field if present', () => {
      const protectedData = {
        stripePaymentIntents: { default: { stripePaymentIntentId: PI_ID } },
      };
      expect(getPaymentIntentIdFromProtectedData(protectedData)).toBe(PI_ID);
    });

    it('reads a bare string client secret', () => {
      const protectedData = { stripePaymentIntents: { default: CLIENT_SECRET } };
      expect(getPaymentIntentIdFromProtectedData(protectedData)).toBe(PI_ID);
    });

    it('returns null when no payment intent is present', () => {
      expect(getPaymentIntentIdFromProtectedData({})).toBeNull();
      expect(getPaymentIntentIdFromProtectedData({ stripePaymentIntents: {} })).toBeNull();
      expect(getPaymentIntentIdFromProtectedData(null)).toBeNull();
    });
  });
});

describe('capturePaymentIntentIfNeeded', () => {
  let stripe;
  beforeEach(() => {
    stripe = {
      paymentIntents: {
        retrieve: jest.fn(),
        capture: jest.fn().mockResolvedValue({ id: PI_ID, status: 'succeeded' }),
      },
    };
    getStripe.mockReturnValue(stripe);
  });

  it('captures a PaymentIntent stuck at requires_capture', async () => {
    stripe.paymentIntents.retrieve.mockResolvedValue({ id: PI_ID, status: 'requires_capture' });

    await capturePaymentIntentIfNeeded(PI_ID);

    expect(stripe.paymentIntents.capture).toHaveBeenCalledWith(PI_ID);
  });

  it('does not capture when the PaymentIntent is already succeeded', async () => {
    const pi = { id: PI_ID, status: 'succeeded' };
    stripe.paymentIntents.retrieve.mockResolvedValue(pi);

    const result = await capturePaymentIntentIfNeeded(PI_ID);

    expect(stripe.paymentIntents.capture).not.toHaveBeenCalled();
    expect(result).toBe(pi);
  });
});

describe('createMonthlyStripePrice', () => {
  let stripe;
  beforeEach(() => {
    stripe = {
      prices: { create: jest.fn().mockResolvedValue({ id: 'price_123' }) },
    };
    getStripe.mockReturnValue(stripe);
  });

  it('creates a recurring monthly price with the listing amount', async () => {
    await createMonthlyStripePrice({
      amount: 1200,
      currency: 'USD',
      productName: 'Spot',
      listingId: 'listing-1',
    });

    expect(stripe.prices.create).toHaveBeenCalledWith(
      expect.objectContaining({
        unit_amount: 1200,
        currency: 'usd',
        recurring: { interval: 'month' },
      })
    );
  });

  it.each([[0], [-100], [1200.5], [null], [undefined]])(
    'throws (and skips Stripe) for an invalid amount: %p',
    async amount => {
      await expect(
        createMonthlyStripePrice({ amount, currency: 'USD', productName: 'Spot' })
      ).rejects.toThrow(/Invalid listing price/);
      expect(stripe.prices.create).not.toHaveBeenCalled();
    }
  );

  it('throws when currency is missing', async () => {
    await expect(
      createMonthlyStripePrice({ amount: 1200, currency: null, productName: 'Spot' })
    ).rejects.toThrow(/Invalid listing price/);
    expect(stripe.prices.create).not.toHaveBeenCalled();
  });
});
