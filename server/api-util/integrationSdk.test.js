// Integration API credentials must be present before the module is required,
// because integrationSdk.js reads them at load time.
process.env.SHARETRIBE_INTEGRATION_CLIENT_ID = 'test-integration-client-id';
process.env.SHARETRIBE_INTEGRATION_CLIENT_SECRET = 'test-integration-client-secret';

const mockTransition = jest.fn();
const mockQuery = jest.fn();

jest.mock('sharetribe-flex-integration-sdk', () => ({
  types: {
    BigDecimal: class BigDecimal {
      constructor(value) {
        this.value = value;
      }
    },
  },
  createInstance: jest.fn(),
}));

const { types } = require('sharetribe-flex-sdk');
const { UUID } = types;
const integrationSdkPkg = require('sharetribe-flex-integration-sdk');
const {
  normalizeUuid,
  transitionTransaction,
  findActiveSubscriptionForListing,
} = require('./integrationSdk');

// The mocked SDK instance reuses the same transition/query spies. resetMocks (jest config)
// clears implementations before every test, so we re-wire createInstance in beforeEach.
const mockInstance = { transactions: { transition: mockTransition, query: mockQuery } };

beforeEach(() => {
  integrationSdkPkg.createInstance.mockReturnValue(mockInstance);
});

describe('integrationSdk.normalizeUuid', () => {
  it('returns a plain string unchanged', () => {
    expect(normalizeUuid('6a26f729-b0f3-468b-80f0-e51b9715aa4f')).toBe(
      '6a26f729-b0f3-468b-80f0-e51b9715aa4f'
    );
  });

  it('extracts the uuid from a Sharetribe UUID instance', () => {
    const id = new UUID('6a26f729-b0f3-468b-80f0-e51b9715aa4f');
    expect(normalizeUuid(id)).toBe('6a26f729-b0f3-468b-80f0-e51b9715aa4f');
  });

  it('extracts the uuid from a plain { uuid } object', () => {
    expect(normalizeUuid({ uuid: 'abc-123' })).toBe('abc-123');
  });

  it('returns null for nullish or unrecognized input', () => {
    expect(normalizeUuid(null)).toBeNull();
    expect(normalizeUuid(undefined)).toBeNull();
    expect(normalizeUuid({})).toBeNull();
  });
});

describe('integrationSdk.transitionTransaction', () => {
  beforeEach(() => {
    mockTransition.mockReset();
    mockQuery.mockReset();
  });

  it('normalizes the transaction id and forwards the transition + params', async () => {
    mockTransition.mockResolvedValue({ data: { data: {} } });
    const id = new UUID('6a26f729-b0f3-468b-80f0-e51b9715aa4f');

    await transitionTransaction({
      transactionId: id,
      transition: 'transition/extend-subscription',
      params: { bookingStart: 'x' },
    });

    expect(mockTransition).toHaveBeenCalledWith({
      id: '6a26f729-b0f3-468b-80f0-e51b9715aa4f',
      transition: 'transition/extend-subscription',
      params: { bookingStart: 'x' },
    });
  });

  it('defaults params to an empty object', async () => {
    mockTransition.mockResolvedValue({ data: { data: {} } });

    await transitionTransaction({
      transactionId: 'plain-id',
      transition: 'transition/accept-subscription',
    });

    expect(mockTransition).toHaveBeenCalledWith({
      id: 'plain-id',
      transition: 'transition/accept-subscription',
      params: {},
    });
  });

  it('throws a 400 for an invalid transaction id', () => {
    expect(() =>
      transitionTransaction({ transactionId: null, transition: 'transition/expire' })
    ).toThrow(/Invalid transaction id/);
    expect(mockTransition).not.toHaveBeenCalled();
  });
});

describe('integrationSdk.findActiveSubscriptionForListing', () => {
  beforeEach(() => {
    mockTransition.mockReset();
    mockQuery.mockReset();
  });

  it('queries by customer + listing + process name', async () => {
    mockQuery.mockResolvedValue({ data: { data: [] } });

    await findActiveSubscriptionForListing('cust-1', 'listing-1', 'subscription-rental');

    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'cust-1',
        listingId: 'listing-1',
        processNames: ['subscription-rental'],
      })
    );
  });

  it('returns the first non-final subscription transaction', async () => {
    mockQuery.mockResolvedValue({
      data: {
        data: [
          { id: { uuid: 'cancelled' }, attributes: { lastTransition: 'transition/cancel-subscription' } },
          { id: { uuid: 'active' }, attributes: { lastTransition: 'transition/accept-subscription' } },
        ],
      },
    });

    const result = await findActiveSubscriptionForListing('c', 'l', 'subscription-rental');

    expect(result.id.uuid).toBe('active');
  });

  it('returns null when every transaction is in a final state', async () => {
    mockQuery.mockResolvedValue({
      data: {
        data: [
          { id: { uuid: 'a' }, attributes: { lastTransition: 'transition/expire' } },
          { id: { uuid: 'b' }, attributes: { lastTransition: 'transition/decline-subscription' } },
          { id: { uuid: 'c' }, attributes: { lastTransition: 'transition/expire-acceptance' } },
        ],
      },
    });

    expect(await findActiveSubscriptionForListing('c', 'l', 'subscription-rental')).toBeNull();
  });

  it('returns null when there are no transactions', async () => {
    mockQuery.mockResolvedValue({ data: { data: [] } });
    expect(await findActiveSubscriptionForListing('c', 'l', 'subscription-rental')).toBeNull();
  });
});
