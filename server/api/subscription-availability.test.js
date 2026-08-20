jest.mock('../api-util/sdk', () => ({
  getSdk: jest.fn(),
  handleError: jest.fn((res, e) => {
    res.status(e.status || 500).json({ message: e.message });
  }),
}));
jest.mock('../api-util/integrationSdk', () => ({
  findActiveSubscriptionForListing: jest.fn(),
}));

const { getSdk, handleError } = require('../api-util/sdk');
const { findActiveSubscriptionForListing } = require('../api-util/integrationSdk');

const subscriptionAvailability = require('./subscription-availability');

const makeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const setupCurrentUser = customerId => {
  getSdk.mockReturnValue({
    currentUser: {
      show: jest.fn().mockResolvedValue({
        data: { data: { id: { uuid: customerId } } },
      }),
    },
  });
};

describe('POST /api/subscription-availability', () => {
  beforeEach(() => {
    handleError.mockImplementation((res, e) => {
      res.status(e.status || 500).json({ message: e.message });
    });
  });

  it('returns 400 when listingId is missing', async () => {
    const res = makeRes();
    await subscriptionAvailability({ body: {} }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(findActiveSubscriptionForListing).not.toHaveBeenCalled();
  });

  it('returns available when no active subscription exists', async () => {
    setupCurrentUser('cust-1');
    findActiveSubscriptionForListing.mockResolvedValue(null);
    const res = makeRes();

    await subscriptionAvailability({ body: { listingId: 'listing-1' } }, res);

    expect(findActiveSubscriptionForListing).toHaveBeenCalledWith(
      'listing-1',
      'subscription-rental'
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      isAvailable: true,
      isCurrentUserSubscription: false,
      activeSubscriptionId: null,
    });
  });

  it('returns own active subscription id for the current customer', async () => {
    setupCurrentUser('cust-1');
    findActiveSubscriptionForListing.mockResolvedValue({
      id: { uuid: 'tx-own' },
      relationships: { customer: { data: { id: { uuid: 'cust-1' } } } },
    });
    const res = makeRes();

    await subscriptionAvailability({ body: { listingId: { uuid: 'listing-1' } } }, res);

    expect(res.json).toHaveBeenCalledWith({
      isAvailable: false,
      isCurrentUserSubscription: true,
      activeSubscriptionId: 'tx-own',
    });
  });

  it('hides another customer transaction id', async () => {
    setupCurrentUser('cust-viewer');
    findActiveSubscriptionForListing.mockResolvedValue({
      id: { uuid: 'tx-other' },
      relationships: { customer: { data: { id: { uuid: 'cust-owner' } } } },
    });
    const res = makeRes();

    await subscriptionAvailability({ body: { listingId: 'listing-1' } }, res);

    expect(res.json).toHaveBeenCalledWith({
      isAvailable: false,
      isCurrentUserSubscription: false,
      activeSubscriptionId: null,
    });
  });

  it('treats anonymous viewers as non-owners without exposing the transaction id', async () => {
    getSdk.mockReturnValue({
      currentUser: {
        show: jest.fn().mockRejectedValue(Object.assign(new Error('unauthorized'), { status: 403 })),
      },
    });
    findActiveSubscriptionForListing.mockResolvedValue({
      id: { uuid: 'tx-secret' },
      relationships: { customer: { data: { id: { uuid: 'cust-owner' } } } },
    });
    const res = makeRes();

    await subscriptionAvailability({ body: { listingId: 'listing-1' } }, res);

    expect(res.json).toHaveBeenCalledWith({
      isAvailable: false,
      isCurrentUserSubscription: false,
      activeSubscriptionId: null,
    });
  });

  it('delegates Integration API failures to handleError', async () => {
    setupCurrentUser('cust-1');
    const error = Object.assign(new Error('integration down'), { status: 503 });
    findActiveSubscriptionForListing.mockRejectedValue(error);
    const res = makeRes();

    await subscriptionAvailability({ body: { listingId: 'listing-1' } }, res);

    expect(handleError).toHaveBeenCalledWith(res, error);
  });
});
