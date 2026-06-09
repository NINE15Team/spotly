jest.mock('../api-util/sdk', () => ({
  handleError: jest.fn((res, e) => {
    res.status(e.status || 500).json({ message: e.message });
  }),
  serialize: jest.fn(x => x),
}));
jest.mock('../api-util/integrationSdk', () => ({ isIntegrationSdkConfigured: jest.fn() }));
jest.mock('../api-util/stripeClient', () => ({ isStripeConfigured: jest.fn() }));
jest.mock('../api-util/subscriptionAuth', () => ({ assertProviderOnTransaction: jest.fn() }));
jest.mock('../api-util/subscriptionService', () => ({ activateSubscription: jest.fn() }));

const { handleError, serialize } = require('../api-util/sdk');
const { isIntegrationSdkConfigured } = require('../api-util/integrationSdk');
const { isStripeConfigured } = require('../api-util/stripeClient');
const { assertProviderOnTransaction } = require('../api-util/subscriptionAuth');
const { activateSubscription } = require('../api-util/subscriptionService');
const { TRANSITIONS } = require('../api-util/subscriptionConstants');

const acceptSubscription = require('./accept-subscription');

const makeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.set = jest.fn(() => res);
  res.send = jest.fn(() => res);
  res.end = jest.fn(() => res);
  return res;
};

describe('POST /api/accept-subscription', () => {
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
    await acceptSubscription({ body: {} }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(assertProviderOnTransaction).not.toHaveBeenCalled();
  });

  it('returns 503 when billing is not configured', async () => {
    isStripeConfigured.mockReturnValue(false);
    const res = makeRes();

    await acceptSubscription({ body: { transactionId: 'tx-1' } }, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(assertProviderOnTransaction).not.toHaveBeenCalled();
  });

  it('returns 409 when the transaction is not awaiting provider approval', async () => {
    assertProviderOnTransaction.mockResolvedValue({
      transaction: { attributes: { lastTransition: TRANSITIONS.ACCEPT_SUBSCRIPTION } },
      sdk: {},
    });
    const res = makeRes();

    await acceptSubscription({ body: { transactionId: 'tx-1' } }, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(activateSubscription).not.toHaveBeenCalled();
  });

  it('accepts via the provider SDK and serializes the result', async () => {
    const sdk = { id: 'provider-sdk' };
    assertProviderOnTransaction.mockResolvedValue({
      transaction: { attributes: { lastTransition: TRANSITIONS.CONFIRM_PAYMENT } },
      sdk,
    });
    activateSubscription.mockResolvedValue({ stripeSubscriptionId: 'sub_1' });
    const res = makeRes();

    await acceptSubscription({ body: { transactionId: 'tx-1' } }, res);

    expect(activateSubscription).toHaveBeenCalledWith('tx-1', {
      transition: TRANSITIONS.ACCEPT_SUBSCRIPTION,
      marketplaceSdk: sdk,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.set).toHaveBeenCalledWith('Content-Type', 'application/transit+json');
    expect(serialize).toHaveBeenCalledWith({ data: { stripeSubscriptionId: 'sub_1' } });
  });

  it('delegates authorization failures to handleError', async () => {
    const error = new Error('Not authorized for this transaction.');
    error.status = 403;
    assertProviderOnTransaction.mockRejectedValue(error);
    const res = makeRes();

    await acceptSubscription({ body: { transactionId: 'tx-1' } }, res);

    expect(handleError).toHaveBeenCalledWith(res, error);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
