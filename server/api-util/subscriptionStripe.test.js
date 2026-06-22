jest.mock('./stripeClient', () => ({
  getStripe: jest.fn(),
}));

const { getStripe } = require('./stripeClient');
const {
  getPaymentIntentIdFromClientSecret,
  getPaymentIntentIdFromProtectedData,
  capturePaymentIntentIfNeeded,
  createMonthlyStripePrice,
  createStripeSubscription,
  cancelStripeSubscriptionAtPeriodEnd,
  createBillingPortalSession,
  resolveSubscriptionStripeCustomer,
  mapStripeErrorToHttpError,
} = require('./subscriptionStripe');
const moment = require('moment');

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

describe('createStripeSubscription', () => {
  let stripe;
  beforeEach(() => {
    stripe = {
      paymentMethods: {
        retrieve: jest.fn(),
        attach: jest.fn().mockResolvedValue({}),
      },
      customers: { update: jest.fn().mockResolvedValue({}) },
      subscriptions: { create: jest.fn().mockResolvedValue({ id: 'sub_123' }) },
    };
    getStripe.mockReturnValue(stripe);
  });

  it('skips attach when the payment method already belongs to a customer', async () => {
    stripe.paymentMethods.retrieve.mockResolvedValue({
      id: 'pm_1',
      customer: 'cus_owner',
    });
    const bookingStart = new Date(2026, 1, 15);

    const result = await createStripeSubscription({
      customerId: 'cus_new',
      priceId: 'price_1',
      paymentMethodId: 'pm_1',
      bookingStart,
      sharetribeTransactionId: 'tx-1',
    });

    expect(stripe.paymentMethods.attach).not.toHaveBeenCalled();
    expect(stripe.customers.update).toHaveBeenCalledWith('cus_owner', {
      invoice_settings: { default_payment_method: 'pm_1' },
    });
    expect(stripe.subscriptions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_owner',
        default_payment_method: 'pm_1',
      })
    );
    expect(result.id).toBe('sub_123');
  });

  it('attaches an unattached payment method and creates a trialed subscription', async () => {
    stripe.paymentMethods.retrieve.mockResolvedValue({ id: 'pm_1', customer: null });
    const bookingStart = new Date(2026, 1, 15);

    const result = await createStripeSubscription({
      customerId: 'cus_1',
      priceId: 'price_1',
      paymentMethodId: 'pm_1',
      bookingStart,
      sharetribeTransactionId: 'tx-1',
    });

    expect(stripe.paymentMethods.attach).toHaveBeenCalledWith('pm_1', { customer: 'cus_1' });
    expect(stripe.customers.update).toHaveBeenCalledWith('cus_1', {
      invoice_settings: { default_payment_method: 'pm_1' },
    });
    expect(stripe.subscriptions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_1',
        items: [{ price: 'price_1' }],
        default_payment_method: 'pm_1',
        billing_cycle_anchor_config: { day_of_month: 15 },
        trial_end: moment(bookingStart).add(1, 'month').unix(),
        proration_behavior: 'none',
        metadata: { sharetribeTransactionId: 'tx-1' },
      })
    );
    expect(result.id).toBe('sub_123');
  });
});

describe('resolveSubscriptionStripeCustomer', () => {
  let stripe;
  beforeEach(() => {
    stripe = {
      paymentMethods: { retrieve: jest.fn() },
      paymentIntents: { retrieve: jest.fn() },
      customers: {
        search: jest.fn().mockResolvedValue({ data: [] }),
        create: jest.fn().mockResolvedValue({ id: 'cus_created' }),
      },
    };
    getStripe.mockReturnValue(stripe);
  });

  it('returns an existing customer id without calling Stripe', async () => {
    const customerId = await resolveSubscriptionStripeCustomer({
      paymentMethodId: 'pm_1',
      existingCustomerId: 'cus_existing',
    });

    expect(customerId).toBe('cus_existing');
    expect(stripe.paymentMethods.retrieve).not.toHaveBeenCalled();
  });

  it('returns the payment method owner without creating a customer', async () => {
    stripe.paymentMethods.retrieve.mockResolvedValue({ id: 'pm_1', customer: 'cus_from_pm' });

    const customerId = await resolveSubscriptionStripeCustomer({
      paymentMethodId: 'pm_1',
      email: 'buyer@example.com',
      sharetribeUserId: 'user-1',
    });

    expect(customerId).toBe('cus_from_pm');
    expect(stripe.customers.create).not.toHaveBeenCalled();
    expect(stripe.customers.search).not.toHaveBeenCalled();
  });

  it('falls back to findOrCreateStripeCustomer when the PM and PI have no customer', async () => {
    stripe.paymentMethods.retrieve.mockResolvedValue({ id: 'pm_1', customer: null });
    stripe.paymentIntents.retrieve.mockResolvedValue({ id: 'pi_1', customer: null });
    stripe.customers.search.mockResolvedValue({ data: [{ id: 'cus_found' }] });

    const customerId = await resolveSubscriptionStripeCustomer({
      paymentMethodId: 'pm_1',
      paymentIntentId: 'pi_1',
      email: 'buyer@example.com',
      sharetribeUserId: 'user-1',
    });

    expect(customerId).toBe('cus_found');
    expect(stripe.customers.create).not.toHaveBeenCalled();
  });
});

describe('mapStripeErrorToHttpError', () => {
  it('maps card_declined to HTTP 402', () => {
    const stripeError = {
      type: 'StripeCardError',
      code: 'card_declined',
      decline_code: 'insufficient_funds',
      message: 'Your card has insufficient funds.',
    };

    const httpError = mapStripeErrorToHttpError(stripeError);

    expect(httpError.status).toBe(402);
    expect(httpError.message).toBe('Your card has insufficient funds.');
    expect(httpError.code).toBe('insufficient_funds');
  });

  it('maps invalid_request_error to HTTP 400', () => {
    const stripeError = {
      type: 'StripeInvalidRequestError',
      code: 'resource_missing',
      message: 'No such payment_method.',
    };

    const httpError = mapStripeErrorToHttpError(stripeError);

    expect(httpError.status).toBe(400);
    expect(httpError.message).toBe('No such payment_method.');
  });

  it('maps unknown Stripe errors to HTTP 502', () => {
    const stripeError = {
      type: 'StripeAPIError',
      code: 'api_error',
      message: 'Stripe is down.',
    };

    const httpError = mapStripeErrorToHttpError(stripeError);

    expect(httpError.status).toBe(502);
    expect(httpError.message).toMatch(/billing failed/i);
  });
});

describe('cancelStripeSubscriptionAtPeriodEnd', () => {
  it('sets cancel_at_period_end on the subscription', async () => {
    const stripe = {
      subscriptions: {
        update: jest.fn().mockResolvedValue({ id: 'sub_123', cancel_at_period_end: true }),
      },
    };
    getStripe.mockReturnValue(stripe);

    await cancelStripeSubscriptionAtPeriodEnd('sub_123');

    expect(stripe.subscriptions.update).toHaveBeenCalledWith('sub_123', {
      cancel_at_period_end: true,
    });
  });
});

describe('createBillingPortalSession', () => {
  it('creates a billing portal session for the customer', async () => {
    const stripe = {
      billingPortal: {
        sessions: { create: jest.fn().mockResolvedValue({ url: 'https://portal.example' }) },
      },
    };
    getStripe.mockReturnValue(stripe);

    const session = await createBillingPortalSession({
      customerId: 'cus_1',
      returnUrl: 'https://return.example',
    });

    expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith({
      customer: 'cus_1',
      return_url: 'https://return.example',
    });
    expect(session.url).toBe('https://portal.example');
  });
});
