jest.mock('../api-util/sdk', () => ({
  handleError: jest.fn((res, e) => {
    res.status(e.status || 500).json({ message: e.message });
  }),
  serialize: jest.fn(x => x),
}));
jest.mock('../api-util/integrationSdk', () => ({ isIntegrationSdkConfigured: jest.fn() }));
jest.mock('../api-util/stripeClient', () => ({ isStripeConfigured: jest.fn() }));
jest.mock('../api-util/subscriptionAuth', () => ({ assertCustomerOnTransaction: jest.fn() }));
jest.mock('../api-util/subscriptionService', () => ({ requestCancelAtPeriodEnd: jest.fn() }));

const { handleError, serialize } = require('../api-util/sdk');
const { isIntegrationSdkConfigured } = require('../api-util/integrationSdk');
const { isStripeConfigured } = require('../api-util/stripeClient');
const { assertCustomerOnTransaction } = require('../api-util/subscriptionAuth');
const { requestCancelAtPeriodEnd } = require('../api-util/subscriptionService');

const cancelSubscription = require('./cancel-subscription');

const makeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.set = jest.fn(() => res);
  res.send = jest.fn(() => res);
  res.end = jest.fn(() => res);
  return res;
};

describe('POST /api/cancel-subscription', () => {
  beforeEach(() => {
    isStripeConfigured.mockReturnValue(true);
    isIntegrationSdkConfigured.mockReturnValue(true);
    serialize.mockImplementation(x => x);
    handleError.mockImplementation((res, e) => {
      res.status(e.status || 500).json({ message: e.message });
    });
  });

  it('returns 400 when transactionId is missing', async () => {
    const res = makeRes();
    await cancelSubscription({ body: {} }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(assertCustomerOnTransaction).not.toHaveBeenCalled();
  });

  it('returns 503 when billing is not configured', async () => {
    isStripeConfigured.mockReturnValue(false);
    const res = makeRes();

    await cancelSubscription({ body: { transactionId: 'tx-1' } }, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(requestCancelAtPeriodEnd).not.toHaveBeenCalled();
  });

  it('asserts the customer, requests cancel at period end and serializes the result', async () => {
    assertCustomerOnTransaction.mockResolvedValue({ transaction: {}, sdk: {} });
    requestCancelAtPeriodEnd.mockResolvedValue({ cancelAtPeriodEnd: true, stripeSubscriptionId: 'sub_1' });
    const res = makeRes();

    await cancelSubscription({ body: { transactionId: 'tx-1' } }, res);

    expect(assertCustomerOnTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ body: { transactionId: 'tx-1' } }),
      res,
      'tx-1'
    );
    expect(requestCancelAtPeriodEnd).toHaveBeenCalledWith('tx-1');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(serialize).toHaveBeenCalledWith({
      data: { cancelAtPeriodEnd: true, stripeSubscriptionId: 'sub_1' },
    });
  });

  it('delegates failures to handleError', async () => {
    const error = new Error('Not authorized for this transaction.');
    error.status = 403;
    assertCustomerOnTransaction.mockRejectedValue(error);
    const res = makeRes();

    await cancelSubscription({ body: { transactionId: 'tx-1' } }, res);

    expect(handleError).toHaveBeenCalledWith(res, error);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
