const { TRANSITIONS, METADATA_KEYS } = require('./subscriptionConstants');

// --- Mocks -------------------------------------------------------------------
jest.mock('../log', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('./integrationSdk', () => {
  const normalizeUuid = id => {
    if (!id) return null;
    if (typeof id === 'string') return id;
    if (typeof id === 'object' && id.uuid) return id.uuid;
    return null;
  };
  return {
    normalizeUuid,
    showTransaction: jest.fn(),
    showListing: jest.fn(),
    transitionTransaction: jest.fn().mockResolvedValue({}),
    updateTransactionMetadata: jest.fn().mockResolvedValue({}),
    findTransactionByStripeSubscriptionId: jest.fn(),
    findActiveSubscriptionForListing: jest.fn(),
  };
});

jest.mock('./subscriptionStripe', () => ({
  getPaymentIntentIdFromProtectedData: jest.fn(),
  capturePaymentIntentIfNeeded: jest.fn().mockResolvedValue({}),
  getPaymentMethodIdFromPaymentIntent: jest.fn().mockResolvedValue('pm_123'),
  createStripeCustomer: jest.fn().mockResolvedValue({ id: 'cus_123' }),
  createMonthlyStripePrice: jest.fn().mockResolvedValue({ id: 'price_123' }),
  createStripeSubscription: jest.fn().mockResolvedValue({ id: 'sub_123' }),
  cancelStripeSubscriptionAtPeriodEnd: jest.fn().mockResolvedValue({}),
}));

const integrationSdk = require('./integrationSdk');
const subscriptionStripe = require('./subscriptionStripe');
const {
  activateSubscription,
  declineSubscription,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handleSubscriptionDeleted,
  requestCancelAtPeriodEnd,
  checkForExistingSubscription,
} = require('./subscriptionService');

// --- Fixtures ----------------------------------------------------------------
const buildTransaction = (overrides = {}) => ({
  id: { uuid: 'tx-1' },
  attributes: {
    lastTransition: TRANSITIONS.CONFIRM_PAYMENT,
    protectedData: {
      stripePaymentIntents: {
        default: { stripePaymentIntentClientSecret: 'pi_123_secret_abc' },
      },
    },
    metadata: {},
    payinTotal: { amount: 920, currency: 'USD' },
    ...overrides.attributes,
  },
  relationships: {
    customer: { data: { id: { uuid: 'user-1' }, type: 'user' } },
    listing: { data: { id: { uuid: 'listing-1' }, type: 'listing' } },
    booking: { data: { id: { uuid: 'booking-1' }, type: 'booking' } },
  },
});

const buildIncluded = (listingPrice = { amount: 1200, currency: 'USD' }) => [
  {
    id: { uuid: 'user-1' },
    type: 'user',
    attributes: { email: 'buyer@example.com', profile: { displayName: 'Buyer' } },
  },
  {
    id: { uuid: 'listing-1' },
    type: 'listing',
    attributes: { title: 'Spot', price: listingPrice },
  },
  {
    id: { uuid: 'booking-1' },
    type: 'booking',
    attributes: { start: new Date(2026, 5, 8), end: new Date(2026, 6, 1) },
  },
];

const mockShowTransaction = (transaction, included = buildIncluded()) => {
  integrationSdk.showTransaction.mockResolvedValue({
    data: { data: transaction, included },
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  subscriptionStripe.getPaymentIntentIdFromProtectedData.mockReturnValue('pi_123');
  subscriptionStripe.getPaymentMethodIdFromPaymentIntent.mockResolvedValue('pm_123');
  subscriptionStripe.createStripeCustomer.mockResolvedValue({ id: 'cus_123' });
  subscriptionStripe.createMonthlyStripePrice.mockResolvedValue({ id: 'price_123' });
  subscriptionStripe.createStripeSubscription.mockResolvedValue({ id: 'sub_123' });
});

// --- activateSubscription ----------------------------------------------------
describe('activateSubscription', () => {
  it('creates the Stripe subscription and confirms the Sharetribe transition', async () => {
    mockShowTransaction(buildTransaction());

    const result = await activateSubscription({ uuid: 'tx-1' });

    expect(result).toEqual({ stripeSubscriptionId: 'sub_123', stripeCustomerId: 'cus_123' });

    // Monthly price built from the listing price subunits (1200), not the prorated payin.
    expect(subscriptionStripe.createMonthlyStripePrice).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 1200, currency: 'USD' })
    );
    expect(subscriptionStripe.createStripeSubscription).toHaveBeenCalledTimes(1);

    // Metadata persisted with Stripe ids.
    expect(integrationSdk.updateTransactionMetadata).toHaveBeenCalledWith(
      { uuid: 'tx-1' },
      expect.objectContaining({
        [METADATA_KEYS.STRIPE_SUBSCRIPTION_ID]: 'sub_123',
        [METADATA_KEYS.STRIPE_CUSTOMER_ID]: 'cus_123',
        [METADATA_KEYS.STRIPE_PRICE_ID]: 'price_123',
      })
    );

    // Confirm-subscription transition + capture fallback.
    expect(integrationSdk.transitionTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ transition: TRANSITIONS.CONFIRM_SUBSCRIPTION })
    );
    expect(subscriptionStripe.capturePaymentIntentIfNeeded).toHaveBeenCalledWith('pi_123');
  });

  it('prefers an explicit paymentIntentId from checkout options', async () => {
    mockShowTransaction(buildTransaction());
    subscriptionStripe.getPaymentIntentIdFromProtectedData.mockReturnValue(null);

    await activateSubscription({ uuid: 'tx-1' }, { paymentIntentId: 'pi_explicit' });

    expect(subscriptionStripe.getPaymentMethodIdFromPaymentIntent).toHaveBeenCalledWith(
      'pi_explicit'
    );
    expect(subscriptionStripe.capturePaymentIntentIfNeeded).toHaveBeenCalledWith('pi_explicit');
  });

  it('reuses an existing Stripe customer id from metadata', async () => {
    mockShowTransaction(
      buildTransaction({ attributes: { metadata: { [METADATA_KEYS.STRIPE_CUSTOMER_ID]: 'cus_existing' } } })
    );

    const result = await activateSubscription({ uuid: 'tx-1' });

    expect(subscriptionStripe.createStripeCustomer).not.toHaveBeenCalled();
    expect(result.stripeCustomerId).toBe('cus_existing');
  });

  it('throws when the transaction is not in confirm-payment state', async () => {
    mockShowTransaction(
      buildTransaction({ attributes: { lastTransition: TRANSITIONS.REQUEST_PAYMENT } })
    );

    await expect(activateSubscription({ uuid: 'tx-1' })).rejects.toThrow(
      /Invalid transaction state/
    );
  });

  it('is idempotent: reuses existing Stripe subscription without re-creating it', async () => {
    mockShowTransaction(
      buildTransaction({
        attributes: {
          metadata: {
            [METADATA_KEYS.STRIPE_SUBSCRIPTION_ID]: 'sub_existing',
            [METADATA_KEYS.STRIPE_CUSTOMER_ID]: 'cus_existing',
          },
        },
      })
    );

    const result = await activateSubscription({ uuid: 'tx-1' });

    // Billing creation is skipped, but the activating transition still runs.
    expect(subscriptionStripe.createStripeSubscription).not.toHaveBeenCalled();
    expect(subscriptionStripe.createMonthlyStripePrice).not.toHaveBeenCalled();
    expect(integrationSdk.transitionTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ transition: TRANSITIONS.CONFIRM_SUBSCRIPTION })
    );
    expect(result).toEqual({
      stripeSubscriptionId: 'sub_existing',
      stripeCustomerId: 'cus_existing',
    });
  });

  it('runs the provider accept transition via the requester Marketplace SDK', async () => {
    mockShowTransaction(buildTransaction());
    const marketplaceSdk = { transactions: { transition: jest.fn().mockResolvedValue({}) } };

    await activateSubscription(
      { uuid: 'tx-1' },
      { transition: TRANSITIONS.ACCEPT_SUBSCRIPTION, marketplaceSdk }
    );

    // Provider transitions cannot run on the Integration API.
    expect(integrationSdk.transitionTransaction).not.toHaveBeenCalled();
    expect(marketplaceSdk.transactions.transition).toHaveBeenCalledWith(
      expect.objectContaining({ transition: TRANSITIONS.ACCEPT_SUBSCRIPTION }),
      expect.anything()
    );
    // Billing is still created on first acceptance.
    expect(subscriptionStripe.createStripeSubscription).toHaveBeenCalledTimes(1);
  });

  it('throws when no PaymentIntent can be resolved', async () => {
    mockShowTransaction(buildTransaction());
    subscriptionStripe.getPaymentIntentIdFromProtectedData.mockReturnValue(null);

    await expect(activateSubscription({ uuid: 'tx-1' })).rejects.toThrow(
      /PaymentIntent not found/
    );
  });

  it('throws when the listing monthly price cannot be resolved', async () => {
    mockShowTransaction(buildTransaction(), buildIncluded({ currency: 'USD' })); // no amount
    integrationSdk.showListing.mockResolvedValue({ data: { data: null } });

    await expect(activateSubscription({ uuid: 'tx-1' })).rejects.toThrow(
      /monthly price not found/
    );
  });

  it('falls back to showListing when the listing is not in included data', async () => {
    mockShowTransaction(buildTransaction(), [
      {
        id: { uuid: 'user-1' },
        type: 'user',
        attributes: { email: 'buyer@example.com', profile: { displayName: 'Buyer' } },
      },
      {
        id: { uuid: 'booking-1' },
        type: 'booking',
        attributes: { start: new Date(2026, 5, 8), end: new Date(2026, 6, 1) },
      },
    ]);
    integrationSdk.showListing.mockResolvedValue({
      data: { data: { id: { uuid: 'listing-1' }, attributes: { title: 'Spot', price: { amount: 1200, currency: 'USD' } } } },
    });

    const result = await activateSubscription({ uuid: 'tx-1' });

    expect(integrationSdk.showListing).toHaveBeenCalledWith('listing-1');
    expect(result.stripeSubscriptionId).toBe('sub_123');
  });
});

// --- declineSubscription -----------------------------------------------------
describe('declineSubscription', () => {
  it('runs the decline transition via the requester Marketplace SDK', async () => {
    mockShowTransaction(buildTransaction());
    const marketplaceSdk = { transactions: { transition: jest.fn().mockResolvedValue({}) } };

    const result = await declineSubscription({ uuid: 'tx-1' }, { marketplaceSdk });

    expect(integrationSdk.transitionTransaction).not.toHaveBeenCalled();
    expect(marketplaceSdk.transactions.transition).toHaveBeenCalledWith(
      expect.objectContaining({ transition: TRANSITIONS.DECLINE_SUBSCRIPTION }),
      expect.anything()
    );
    // No Stripe subscription is created on decline.
    expect(subscriptionStripe.createStripeSubscription).not.toHaveBeenCalled();
    expect(result).toEqual({ declined: true });
  });

  it('throws when the transaction is not awaiting provider approval', async () => {
    mockShowTransaction(
      buildTransaction({ attributes: { lastTransition: TRANSITIONS.ACCEPT_SUBSCRIPTION } })
    );
    const marketplaceSdk = { transactions: { transition: jest.fn() } };

    await expect(declineSubscription({ uuid: 'tx-1' }, { marketplaceSdk })).rejects.toThrow(
      /Invalid transaction state/
    );
  });
});

// --- handleInvoicePaid -------------------------------------------------------
describe('handleInvoicePaid', () => {
  it('extends the period when the subscription is active', async () => {
    integrationSdk.findTransactionByStripeSubscriptionId.mockResolvedValue({
      id: { uuid: 'tx-1' },
      attributes: { lastTransition: TRANSITIONS.CONFIRM_SUBSCRIPTION },
    });
    mockShowTransaction(buildTransaction());

    await handleInvoicePaid('sub_123');

    expect(integrationSdk.transitionTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ transition: TRANSITIONS.EXTEND_SUBSCRIPTION })
    );
  });

  it('extends the period when the subscription was provider-accepted', async () => {
    integrationSdk.findTransactionByStripeSubscriptionId.mockResolvedValue({
      id: { uuid: 'tx-1' },
      attributes: { lastTransition: TRANSITIONS.ACCEPT_SUBSCRIPTION },
    });
    mockShowTransaction(buildTransaction());

    await handleInvoicePaid('sub_123');

    expect(integrationSdk.transitionTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ transition: TRANSITIONS.EXTEND_SUBSCRIPTION })
    );
  });

  it('reactivates the subscription when payment was overdue', async () => {
    integrationSdk.findTransactionByStripeSubscriptionId.mockResolvedValue({
      id: { uuid: 'tx-1' },
      attributes: { lastTransition: TRANSITIONS.PAYMENT_OVERDUE },
    });
    mockShowTransaction(buildTransaction());

    await handleInvoicePaid('sub_123');

    expect(integrationSdk.transitionTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ transition: TRANSITIONS.REACTIVATE_SUBSCRIPTION })
    );
  });

  it('is a no-op when no transaction matches the subscription', async () => {
    integrationSdk.findTransactionByStripeSubscriptionId.mockResolvedValue(null);

    await handleInvoicePaid('sub_unknown');

    expect(integrationSdk.transitionTransaction).not.toHaveBeenCalled();
  });
});

// --- handleInvoicePaymentFailed ---------------------------------------------
describe('handleInvoicePaymentFailed', () => {
  it('marks an active subscription as payment-overdue', async () => {
    integrationSdk.findTransactionByStripeSubscriptionId.mockResolvedValue({
      id: { uuid: 'tx-1' },
      attributes: { lastTransition: TRANSITIONS.CONFIRM_SUBSCRIPTION },
    });

    await handleInvoicePaymentFailed('sub_123');

    expect(integrationSdk.transitionTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ transition: TRANSITIONS.PAYMENT_OVERDUE })
    );
  });

  it('does nothing when already payment-overdue', async () => {
    integrationSdk.findTransactionByStripeSubscriptionId.mockResolvedValue({
      id: { uuid: 'tx-1' },
      attributes: { lastTransition: TRANSITIONS.PAYMENT_OVERDUE },
    });

    await handleInvoicePaymentFailed('sub_123');

    expect(integrationSdk.transitionTransaction).not.toHaveBeenCalled();
  });
});

// --- handleSubscriptionDeleted ----------------------------------------------
describe('handleSubscriptionDeleted', () => {
  it('cancels an active subscription', async () => {
    integrationSdk.findTransactionByStripeSubscriptionId.mockResolvedValue({
      id: { uuid: 'tx-1' },
      attributes: { lastTransition: TRANSITIONS.CONFIRM_SUBSCRIPTION },
    });

    await handleSubscriptionDeleted('sub_123');

    expect(integrationSdk.transitionTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ transition: TRANSITIONS.CANCEL_SUBSCRIPTION })
    );
  });

  it('uses the from-overdue cancel transition when overdue', async () => {
    integrationSdk.findTransactionByStripeSubscriptionId.mockResolvedValue({
      id: { uuid: 'tx-1' },
      attributes: { lastTransition: TRANSITIONS.PAYMENT_OVERDUE },
    });

    await handleSubscriptionDeleted('sub_123');

    expect(integrationSdk.transitionTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ transition: TRANSITIONS.CANCEL_SUBSCRIPTION_FROM_OVERDUE })
    );
  });

  it('is a no-op when already cancelled', async () => {
    integrationSdk.findTransactionByStripeSubscriptionId.mockResolvedValue({
      id: { uuid: 'tx-1' },
      attributes: { lastTransition: TRANSITIONS.CANCEL_SUBSCRIPTION },
    });

    await handleSubscriptionDeleted('sub_123');

    expect(integrationSdk.transitionTransaction).not.toHaveBeenCalled();
  });
});

// --- requestCancelAtPeriodEnd -----------------------------------------------
describe('requestCancelAtPeriodEnd', () => {
  const buildShowForCancel = (lastTransition, metadata = { [METADATA_KEYS.STRIPE_SUBSCRIPTION_ID]: 'sub_123' }) => {
    integrationSdk.showTransaction.mockResolvedValue({
      data: { data: { id: { uuid: 'tx-1' }, attributes: { lastTransition, metadata } } },
    });
  };

  it('requests Stripe cancel-at-period-end for an active subscription', async () => {
    buildShowForCancel(TRANSITIONS.CONFIRM_SUBSCRIPTION);

    const result = await requestCancelAtPeriodEnd({ uuid: 'tx-1' });

    expect(subscriptionStripe.cancelStripeSubscriptionAtPeriodEnd).toHaveBeenCalledWith('sub_123');
    expect(result).toEqual({ cancelAtPeriodEnd: true, stripeSubscriptionId: 'sub_123' });
  });

  it('throws when there is no Stripe subscription on the transaction', async () => {
    buildShowForCancel(TRANSITIONS.CONFIRM_SUBSCRIPTION, {});

    await expect(requestCancelAtPeriodEnd({ uuid: 'tx-1' })).rejects.toThrow(
      /No Stripe subscription/
    );
  });

  it('throws when the subscription is in a non-cancellable state', async () => {
    buildShowForCancel(TRANSITIONS.CANCEL_SUBSCRIPTION);

    await expect(requestCancelAtPeriodEnd({ uuid: 'tx-1' })).rejects.toThrow(
      /cannot be cancelled/
    );
  });

  it.each([
    TRANSITIONS.ACCEPT_SUBSCRIPTION,
    TRANSITIONS.CONFIRM_SUBSCRIPTION,
    TRANSITIONS.EXTEND_SUBSCRIPTION,
    TRANSITIONS.PAYMENT_OVERDUE,
    TRANSITIONS.REACTIVATE_SUBSCRIPTION,
  ])('succeeds from allowed state: %s', async lastTransition => {
    buildShowForCancel(lastTransition);

    const result = await requestCancelAtPeriodEnd({ uuid: 'tx-1' });

    expect(subscriptionStripe.cancelStripeSubscriptionAtPeriodEnd).toHaveBeenCalledWith('sub_123');
    expect(result).toEqual({ cancelAtPeriodEnd: true, stripeSubscriptionId: 'sub_123' });
  });

  it.each([
    TRANSITIONS.EXPIRE,
    TRANSITIONS.CANCEL_SUBSCRIPTION_FROM_OVERDUE,
    TRANSITIONS.DECLINE_SUBSCRIPTION,
  ])('throws for final state: %s', async lastTransition => {
    buildShowForCancel(lastTransition);

    await expect(requestCancelAtPeriodEnd({ uuid: 'tx-1' })).rejects.toThrow(/cannot be cancelled/);
    expect(subscriptionStripe.cancelStripeSubscriptionAtPeriodEnd).not.toHaveBeenCalled();
  });
});

// --- handleSubscriptionDeleted edge cases -----------------------------------
describe('handleSubscriptionDeleted — terminal state no-ops', () => {
  it.each([
    TRANSITIONS.CANCEL_SUBSCRIPTION,
    TRANSITIONS.CANCEL_SUBSCRIPTION_FROM_OVERDUE,
    TRANSITIONS.EXPIRE,
  ])('is a no-op when already in terminal state: %s', async lastTransition => {
    integrationSdk.findTransactionByStripeSubscriptionId.mockResolvedValue({
      id: { uuid: 'tx-1' },
      attributes: { lastTransition },
    });

    await handleSubscriptionDeleted('sub_123');

    expect(integrationSdk.transitionTransaction).not.toHaveBeenCalled();
  });

  it('is a no-op when no transaction matches', async () => {
    integrationSdk.findTransactionByStripeSubscriptionId.mockResolvedValue(null);

    await handleSubscriptionDeleted('sub_unknown');

    expect(integrationSdk.transitionTransaction).not.toHaveBeenCalled();
  });
});

// --- handleInvoicePaid — edge cases -----------------------------------------
describe('handleInvoicePaid — all active-entry transitions extend the period', () => {
  it.each([
    TRANSITIONS.CONFIRM_SUBSCRIPTION,
    TRANSITIONS.ACCEPT_SUBSCRIPTION,
    TRANSITIONS.EXTEND_SUBSCRIPTION,
  ])('extends period from active-entry transition: %s', async lastTransition => {
    integrationSdk.findTransactionByStripeSubscriptionId.mockResolvedValue({
      id: { uuid: 'tx-1' },
      attributes: { lastTransition },
    });
    integrationSdk.showTransaction.mockResolvedValue({
      data: { data: buildTransaction(), included: buildIncluded() },
    });

    await handleInvoicePaid('sub_123');

    expect(integrationSdk.transitionTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ transition: TRANSITIONS.EXTEND_SUBSCRIPTION })
    );
  });
});

// --- handleInvoicePaymentFailed — edge cases --------------------------------
describe('handleInvoicePaymentFailed — active-entry states', () => {
  it.each([
    TRANSITIONS.CONFIRM_SUBSCRIPTION,
    TRANSITIONS.ACCEPT_SUBSCRIPTION,
    TRANSITIONS.EXTEND_SUBSCRIPTION,
  ])('marks payment-overdue from %s', async lastTransition => {
    integrationSdk.findTransactionByStripeSubscriptionId.mockResolvedValue({
      id: { uuid: 'tx-1' },
      attributes: { lastTransition },
    });

    await handleInvoicePaymentFailed('sub_123');

    expect(integrationSdk.transitionTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ transition: TRANSITIONS.PAYMENT_OVERDUE })
    );
  });

  it('is a no-op when no transaction matches', async () => {
    integrationSdk.findTransactionByStripeSubscriptionId.mockResolvedValue(null);

    await handleInvoicePaymentFailed('sub_unknown');

    expect(integrationSdk.transitionTransaction).not.toHaveBeenCalled();
  });
});

// --- checkForExistingSubscription (double-booking guard) --------------------
describe('checkForExistingSubscription', () => {
  it('resolves without error when no active subscription exists', async () => {
    integrationSdk.findActiveSubscriptionForListing.mockResolvedValue(null);

    await expect(
      checkForExistingSubscription('user-1', 'listing-1', 'subscription-rental')
    ).resolves.toBeUndefined();
  });

  it('throws a 409 when an active subscription already exists for this listing', async () => {
    integrationSdk.findActiveSubscriptionForListing.mockResolvedValue({
      id: { uuid: 'tx-existing' },
      attributes: { lastTransition: TRANSITIONS.CONFIRM_SUBSCRIPTION },
    });

    const error = await checkForExistingSubscription(
      'user-1',
      'listing-1',
      'subscription-rental'
    ).catch(e => e);

    expect(error).toBeInstanceOf(Error);
    expect(error.status).toBe(409);
    expect(error.message).toMatch(/already have an active subscription/);
    expect(error.existingTransactionId).toBe('tx-existing');
  });

  it('throws when subscription is in payment-confirmed state (not yet active but not final)', async () => {
    integrationSdk.findActiveSubscriptionForListing.mockResolvedValue({
      id: { uuid: 'tx-pending' },
      attributes: { lastTransition: TRANSITIONS.CONFIRM_PAYMENT },
    });

    await expect(
      checkForExistingSubscription('user-1', 'listing-1', 'subscription-rental')
    ).rejects.toMatchObject({ status: 409 });
  });

  it('throws when subscription is in payment-overdue state', async () => {
    integrationSdk.findActiveSubscriptionForListing.mockResolvedValue({
      id: { uuid: 'tx-overdue' },
      attributes: { lastTransition: TRANSITIONS.PAYMENT_OVERDUE },
    });

    await expect(
      checkForExistingSubscription('user-1', 'listing-1', 'subscription-rental')
    ).rejects.toMatchObject({ status: 409 });
  });

  it('passes the correct arguments to findActiveSubscriptionForListing', async () => {
    integrationSdk.findActiveSubscriptionForListing.mockResolvedValue(null);

    await checkForExistingSubscription('cust-abc', 'list-xyz', 'subscription-rental');

    expect(integrationSdk.findActiveSubscriptionForListing).toHaveBeenCalledWith(
      'cust-abc',
      'list-xyz',
      'subscription-rental'
    );
  });
});
