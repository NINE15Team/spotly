jest.mock('../api-util/sdk', () => ({
  getSdk: jest.fn(),
  getTrustedSdk: jest.fn(),
  handleError: jest.fn(),
  serialize: jest.fn(x => x),
  fetchCommission: jest.fn(),
}));
jest.mock('../api-util/lineItems', () => ({
  transactionLineItemsWithTax: jest.fn(),
}));
jest.mock('../api-util/tax', () => ({ updatePaymentIntentTaxMetadata: jest.fn() }));
jest.mock('../api-util/negotiation', () => ({ isIntentionToMakeOffer: jest.fn(() => false) }));
jest.mock('../api-util/subscriptionService', () => ({ checkForExistingSubscription: jest.fn() }));
jest.mock('../log', () => ({ error: jest.fn(), info: jest.fn(), warn: jest.fn() }));

const { getSdk, getTrustedSdk, fetchCommission } = require('../api-util/sdk');
const sdkModule = require('../api-util/sdk');
const { transactionLineItemsWithTax } = require('../api-util/lineItems');
const { updatePaymentIntentTaxMetadata } = require('../api-util/tax');
const { isIntentionToMakeOffer } = require('../api-util/negotiation');
const { checkForExistingSubscription } = require('../api-util/subscriptionService');

const handleError = sdkModule.handleError;

const initiatePrivileged = require('./initiate-privileged');

// The handler runs an un-returned promise chain, so we drain the microtask queue.
const flush = () => new Promise(resolve => setImmediate(resolve));
const drain = async () => {
  await flush();
  await flush();
  await flush();
};

const LISTING_RESPONSE = {
  data: { data: { id: { uuid: 'listing-1' }, attributes: { price: { amount: 1500, currency: 'USD' } } } },
};
const COMMISSION_RESPONSE = {
  data: {
    data: [
      { type: 'jsonAsset', attributes: { data: { providerCommission: {}, customerCommission: {} } } },
    ],
  },
};

const makeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.set = jest.fn(() => res);
  res.send = jest.fn(() => res);
  res.end = jest.fn(() => res);
  return res;
};

let trustedSdk;

const setupSdk = ({ customerId = 'cust-1' } = {}) => {
  const sdk = {
    listings: { show: jest.fn().mockResolvedValue(LISTING_RESPONSE) },
    currentUser: { show: jest.fn().mockResolvedValue({ data: { data: { id: { uuid: customerId } } } }) },
  };
  getSdk.mockReturnValue(sdk);
  return sdk;
};

const makeBody = ({ isSpeculative = false, processAlias }) => ({
  isSpeculative,
  orderData: { currency: 'USD' },
  bodyParams: {
    transition: 'transition/request-payment',
    processAlias,
    params: { listingId: { uuid: 'listing-1' } },
  },
  queryParams: {},
});

describe('POST /api/initiate-privileged — subscription double-booking guard', () => {
  beforeEach(() => {
    // resetMocks (jest config) clears implementations before every test.
    sdkModule.serialize.mockImplementation(x => x);
    isIntentionToMakeOffer.mockReturnValue(false);
    transactionLineItemsWithTax.mockResolvedValue({
      lineItems: ['li-booking'],
      taxCalculationId: null,
    });
    updatePaymentIntentTaxMetadata.mockResolvedValue(undefined);
    fetchCommission.mockResolvedValue(COMMISSION_RESPONSE);
    trustedSdk = {
      transactions: {
        initiate: jest.fn().mockResolvedValue({ status: 200, statusText: 'OK', data: { data: {} } }),
        initiateSpeculative: jest
          .fn()
          .mockResolvedValue({ status: 200, statusText: 'OK', data: { data: {} } }),
      },
    };
    getTrustedSdk.mockResolvedValue(trustedSdk);
  });

  it('rejects a non-speculative subscription when an active one already exists', async () => {
    setupSdk();
    const error = new Error(
      'This listing already has an active subscription. Only one subscription per listing is allowed.'
    );
    error.status = 409;
    checkForExistingSubscription.mockRejectedValue(error);
    const res = makeRes();

    initiatePrivileged(
      { body: makeBody({ isSpeculative: false, processAlias: 'subscription-rental/release-6' }) },
      res
    );
    await drain();

    expect(checkForExistingSubscription).toHaveBeenCalledWith('listing-1', 'subscription-rental');
    expect(getTrustedSdk).not.toHaveBeenCalled();
    expect(trustedSdk.transactions.initiate).not.toHaveBeenCalled();
    expect(handleError).toHaveBeenCalledWith(res, error);
  });

  it('upgrades stale subscription-rental/release-1 to release-6 on initiate', async () => {
    setupSdk();
    checkForExistingSubscription.mockResolvedValue(undefined);
    const res = makeRes();

    initiatePrivileged(
      { body: makeBody({ isSpeculative: false, processAlias: 'subscription-rental/release-1' }) },
      res
    );
    await drain();

    expect(trustedSdk.transactions.initiate).toHaveBeenCalledWith(
      expect.objectContaining({ processAlias: 'subscription-rental/release-6' }),
      {}
    );
  });

  it('initiates a subscription with computed line items when no active one exists', async () => {
    setupSdk();
    checkForExistingSubscription.mockResolvedValue(undefined);
    transactionLineItemsWithTax.mockResolvedValue({
      lineItems: ['li-subscription'],
      taxCalculationId: null,
    });
    const res = makeRes();

    initiatePrivileged(
      { body: makeBody({ isSpeculative: false, processAlias: 'subscription-rental/release-6' }) },
      res
    );
    await drain();

    expect(checkForExistingSubscription).toHaveBeenCalledWith('listing-1', 'subscription-rental');
    expect(transactionLineItemsWithTax).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ processAlias: 'subscription-rental/release-6' }),
      expect.anything(),
      expect.anything()
    );
    expect(trustedSdk.transactions.initiate).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ lineItems: ['li-subscription'] }),
      }),
      {}
    );
  });

  it('skips the guard for speculative subscription requests', async () => {
    setupSdk();
    const res = makeRes();

    initiatePrivileged(
      { body: makeBody({ isSpeculative: true, processAlias: 'subscription-rental/release-6' }) },
      res
    );
    await drain();

    expect(checkForExistingSubscription).not.toHaveBeenCalled();
    expect(trustedSdk.transactions.initiateSpeculative).toHaveBeenCalled();
  });

  it('skips the guard for non-subscription processes', async () => {
    setupSdk();
    const res = makeRes();

    initiatePrivileged(
      { body: makeBody({ isSpeculative: false, processAlias: 'default-booking/release-2' }) },
      res
    );
    await drain();

    expect(checkForExistingSubscription).not.toHaveBeenCalled();
    expect(transactionLineItemsWithTax).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ processAlias: 'default-booking/release-2' }),
      expect.anything(),
      expect.anything()
    );
    expect(trustedSdk.transactions.initiate).toHaveBeenCalled();
  });

  it('updates PaymentIntent tax metadata after a non-speculative initiate with a tax calculation', async () => {
    setupSdk();
    checkForExistingSubscription.mockResolvedValue(undefined);
    transactionLineItemsWithTax.mockResolvedValue({
      lineItems: ['li-booking', 'li-tax'],
      taxCalculationId: 'taxcalc_123',
    });
    const res = makeRes();

    initiatePrivileged(
      { body: makeBody({ isSpeculative: false, processAlias: 'default-booking/release-2' }) },
      res
    );
    await drain();

    expect(updatePaymentIntentTaxMetadata).toHaveBeenCalledWith(
      expect.objectContaining({ taxCalculationId: 'taxcalc_123' })
    );
  });

  it('does not touch PaymentIntent tax metadata for speculative requests', async () => {
    setupSdk();
    transactionLineItemsWithTax.mockResolvedValue({
      lineItems: ['li-booking', 'li-tax'],
      taxCalculationId: 'taxcalc_123',
    });
    const res = makeRes();

    initiatePrivileged(
      { body: makeBody({ isSpeculative: true, processAlias: 'default-booking/release-2' }) },
      res
    );
    await drain();

    expect(updatePaymentIntentTaxMetadata).not.toHaveBeenCalled();
  });
});
