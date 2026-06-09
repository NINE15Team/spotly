jest.mock('../api-util/sdk', () => ({
  handleError: jest.fn((res, e) => {
    res.status(e.status || 500).json({ message: e.message });
  }),
  serialize: jest.fn(x => x),
}));
jest.mock('../api-util/integrationSdk', () => ({
  isIntegrationSdkConfigured: jest.fn(),
  transitionTransaction: jest.fn(),
  showTransaction: jest.fn(),
}));

const { handleError } = require('../api-util/sdk');
const {
  isIntegrationSdkConfigured,
  transitionTransaction,
  showTransaction,
} = require('../api-util/integrationSdk');
const { TRANSITIONS } = require('../api-util/subscriptionConstants');

const operatorAbort = require('./operator-abort-subscription');

const makeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.set = jest.fn(() => res);
  res.send = jest.fn(() => res);
  res.end = jest.fn(() => res);
  return res;
};

describe('POST /api/operator-abort-subscription', () => {
  beforeEach(() => {
    isIntegrationSdkConfigured.mockReturnValue(true);
    handleError.mockImplementation((res, e) => {
      res.status(e.status || 500).json({ message: e.message });
    });
  });

  it('returns 400 when transactionId is missing', async () => {
    const res = makeRes();
    await operatorAbort({ body: {} }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(showTransaction).not.toHaveBeenCalled();
  });

  it('returns 503 when the Integration SDK is not configured', async () => {
    isIntegrationSdkConfigured.mockReturnValue(false);
    const res = makeRes();

    await operatorAbort({ body: { transactionId: 'tx-1' } }, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(showTransaction).not.toHaveBeenCalled();
  });

  it('returns 409 when the transaction is not in payment-confirmed', async () => {
    showTransaction.mockResolvedValue({
      data: { data: { attributes: { lastTransition: TRANSITIONS.ACCEPT_SUBSCRIPTION } } },
    });
    const res = makeRes();

    await operatorAbort({ body: { transactionId: 'tx-1' } }, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(transitionTransaction).not.toHaveBeenCalled();
  });

  it('runs transition/abort-subscription via the Integration SDK', async () => {
    showTransaction.mockResolvedValue({
      data: { data: { attributes: { lastTransition: TRANSITIONS.CONFIRM_PAYMENT } } },
    });
    transitionTransaction.mockResolvedValue({
      data: { data: { attributes: { lastTransition: TRANSITIONS.ABORT_SUBSCRIPTION } } },
    });
    const res = makeRes();

    await operatorAbort({ body: { transactionId: 'tx-1' } }, res);

    expect(transitionTransaction).toHaveBeenCalledWith({
      transactionId: 'tx-1',
      transition: TRANSITIONS.ABORT_SUBSCRIPTION,
      params: {},
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: TRANSITIONS.ABORT_SUBSCRIPTION,
    });
  });

  it('delegates failures to handleError', async () => {
    const error = new Error('boom');
    error.status = 500;
    showTransaction.mockRejectedValue(error);
    const res = makeRes();

    await operatorAbort({ body: { transactionId: 'tx-1' } }, res);

    expect(handleError).toHaveBeenCalledWith(res, error);
  });
});
