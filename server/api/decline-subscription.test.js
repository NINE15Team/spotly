jest.mock('../api-util/sdk', () => ({
  handleError: jest.fn((res, e) => {
    res.status(e.status || 500).json({ message: e.message });
  }),
  serialize: jest.fn(x => x),
}));
jest.mock('../api-util/integrationSdk', () => ({ isIntegrationSdkConfigured: jest.fn() }));
jest.mock('../api-util/stripeClient', () => ({ isStripeConfigured: jest.fn() }));
jest.mock('../api-util/subscriptionAuth', () => ({ assertProviderOnTransaction: jest.fn() }));
jest.mock('../api-util/subscriptionService', () => ({ declineSubscription: jest.fn() }));

const { handleError, serialize } = require('../api-util/sdk');
const { isIntegrationSdkConfigured } = require('../api-util/integrationSdk');
const { isStripeConfigured } = require('../api-util/stripeClient');
const { assertProviderOnTransaction } = require('../api-util/subscriptionAuth');
const { declineSubscription } = require('../api-util/subscriptionService');
const { TRANSITIONS } = require('../api-util/subscriptionConstants');

const declineSubscriptionEndpoint = require('./decline-subscription');

const makeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.set = jest.fn(() => res);
  res.send = jest.fn(() => res);
  res.end = jest.fn(() => res);
  return res;
};

describe('POST /api/decline-subscription', () => {
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
    await declineSubscriptionEndpoint({ body: {} }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(assertProviderOnTransaction).not.toHaveBeenCalled();
  });

  it('returns 503 when billing is not configured', async () => {
    isIntegrationSdkConfigured.mockReturnValue(false);
    const res = makeRes();

    await declineSubscriptionEndpoint({ body: { transactionId: 'tx-1' } }, res);

    expect(res.status).toHaveBeenCalledWith(503);
  });

  it('returns 409 when the transaction is not awaiting provider approval', async () => {
    assertProviderOnTransaction.mockResolvedValue({
      transaction: { attributes: { lastTransition: TRANSITIONS.DECLINE_SUBSCRIPTION } },
      sdk: {},
    });
    const res = makeRes();

    await declineSubscriptionEndpoint({ body: { transactionId: 'tx-1' } }, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(declineSubscription).not.toHaveBeenCalled();
  });

  it('declines via the provider SDK and serializes the result', async () => {
    const sdk = { id: 'provider-sdk' };
    assertProviderOnTransaction.mockResolvedValue({
      transaction: { attributes: { lastTransition: TRANSITIONS.CONFIRM_PAYMENT } },
      sdk,
    });
    declineSubscription.mockResolvedValue({ declined: true });
    const res = makeRes();

    await declineSubscriptionEndpoint({ body: { transactionId: 'tx-1' } }, res);

    expect(declineSubscription).toHaveBeenCalledWith('tx-1', { marketplaceSdk: sdk });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(serialize).toHaveBeenCalledWith({ data: { declined: true } });
  });

  it('delegates failures to handleError', async () => {
    const error = new Error('boom');
    error.status = 500;
    assertProviderOnTransaction.mockRejectedValue(error);
    const res = makeRes();

    await declineSubscriptionEndpoint({ body: { transactionId: 'tx-1' } }, res);

    expect(handleError).toHaveBeenCalledWith(res, error);
  });
});
