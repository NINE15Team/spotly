jest.mock('../log', () => ({ error: jest.fn(), info: jest.fn(), warn: jest.fn() }));
jest.mock('../api-util/stripeClient', () => ({
  getStripe: jest.fn(),
  getWebhookSecret: jest.fn(() => 'whsec_test'),
  isStripeWebhookConfigured: jest.fn(),
}));
jest.mock('../api-util/integrationSdk', () => ({ isIntegrationSdkConfigured: jest.fn() }));
jest.mock('../api-util/subscriptionService', () => ({
  handleInvoicePaid: jest.fn(),
  handleInvoicePaymentFailed: jest.fn(),
  handleSubscriptionDeleted: jest.fn(),
}));

const { getStripe, isStripeWebhookConfigured } = require('../api-util/stripeClient');
const { isIntegrationSdkConfigured } = require('../api-util/integrationSdk');
const {
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handleSubscriptionDeleted,
} = require('../api-util/subscriptionService');

const stripeWebhooks = require('./stripe-webhooks');

const makeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.send = jest.fn(() => res);
  return res;
};

const makeReq = () => ({ headers: { 'stripe-signature': 'sig' }, body: Buffer.from('{}') });

describe('POST /api/stripe-webhooks', () => {
  let constructEvent;

  beforeEach(() => {
    jest.clearAllMocks();
    isStripeWebhookConfigured.mockReturnValue(true);
    isIntegrationSdkConfigured.mockReturnValue(true);
    constructEvent = jest.fn();
    getStripe.mockReturnValue({ webhooks: { constructEvent } });
  });

  it('returns 503 when webhooks are not configured', async () => {
    isStripeWebhookConfigured.mockReturnValue(false);
    const res = makeRes();

    await stripeWebhooks(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(503);
  });

  it('returns 400 when signature verification fails', async () => {
    constructEvent.mockImplementation(() => {
      throw new Error('bad signature');
    });
    const res = makeRes();

    await stripeWebhooks(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(handleInvoicePaid).not.toHaveBeenCalled();
  });

  it('ignores the first invoice (billing_reason subscription_create)', async () => {
    constructEvent.mockReturnValue({
      type: 'invoice.paid',
      data: { object: { billing_reason: 'subscription_create', subscription: 'sub_1' } },
    });
    const res = makeRes();

    await stripeWebhooks(makeReq(), res);

    expect(handleInvoicePaid).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('extends the subscription on a renewal invoice.paid (string subscription)', async () => {
    constructEvent.mockReturnValue({
      type: 'invoice.paid',
      data: { object: { billing_reason: 'subscription_cycle', subscription: 'sub_1' } },
    });
    const res = makeRes();

    await stripeWebhooks(makeReq(), res);

    expect(handleInvoicePaid).toHaveBeenCalledWith('sub_1');
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('extracts the subscription id from an expanded invoice object', async () => {
    constructEvent.mockReturnValue({
      type: 'invoice.paid',
      data: { object: { billing_reason: 'subscription_cycle', subscription: { id: 'sub_2' } } },
    });
    const res = makeRes();

    await stripeWebhooks(makeReq(), res);

    expect(handleInvoicePaid).toHaveBeenCalledWith('sub_2');
  });

  it('marks payment overdue on invoice.payment_failed', async () => {
    constructEvent.mockReturnValue({
      type: 'invoice.payment_failed',
      data: { object: { subscription: 'sub_1' } },
    });
    const res = makeRes();

    await stripeWebhooks(makeReq(), res);

    expect(handleInvoicePaymentFailed).toHaveBeenCalledWith('sub_1');
  });

  it('cancels on customer.subscription.deleted', async () => {
    constructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_1' } },
    });
    const res = makeRes();

    await stripeWebhooks(makeReq(), res);

    expect(handleSubscriptionDeleted).toHaveBeenCalledWith('sub_1');
  });

  it('returns 500 when a handler throws', async () => {
    constructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_1' } },
    });
    handleSubscriptionDeleted.mockRejectedValue(new Error('integration failed'));
    const res = makeRes();

    await stripeWebhooks(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'integration failed' });
  });
});
