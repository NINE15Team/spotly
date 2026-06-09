import reducer, {
  loadSubscriptionsThunk,
  cancelSubscriptionThunk,
  openBillingPortalThunk,
} from './SubscriptionsPage.duck';
import { cancelSubscription, billingPortal } from '../../util/api';

jest.mock('../../util/api', () => ({
  cancelSubscription: jest.fn(),
  billingPortal: jest.fn(),
}));
jest.mock('../../ducks/marketplaceData.duck', () => ({
  addMarketplaceEntities: jest.fn(() => ({ type: 'app/marketplaceData/ADD_ENTITIES' })),
}));

const initialState = reducer(undefined, { type: '@@INIT' });
const getState = () => ({});

describe('SubscriptionsPage.duck reducer', () => {
  it('sets fetchInProgress on loadSubscriptions pending', () => {
    const state = reducer(initialState, loadSubscriptionsThunk.pending());
    expect(state.fetchInProgress).toBe(true);
    expect(state.fetchError).toBeNull();
  });

  it('stores transaction refs on loadSubscriptions fulfilled', () => {
    const payload = { data: { data: [{ id: { uuid: 'a' }, type: 'transaction' }] } };
    const state = reducer(initialState, loadSubscriptionsThunk.fulfilled(payload));
    expect(state.fetchInProgress).toBe(false);
    expect(state.transactionRefs).toEqual([{ id: { uuid: 'a' }, type: 'transaction' }]);
  });

  it('records the error on loadSubscriptions rejected', () => {
    const action = loadSubscriptionsThunk.rejected(null, 'id', undefined, { name: 'Error' });
    const state = reducer(initialState, action);
    expect(state.fetchInProgress).toBe(false);
    expect(state.fetchError).toEqual({ name: 'Error' });
  });
});

describe('loadSubscriptionsThunk', () => {
  it('queries only subscription-rental orders and stores the refs', async () => {
    const sdk = {
      transactions: {
        query: jest.fn().mockResolvedValue({
          data: {
            data: [
              { id: { uuid: 'a' }, type: 'transaction' },
              { id: { uuid: 'b' }, type: 'transaction' },
            ],
          },
        }),
      },
    };
    const dispatch = jest.fn();

    const resultAction = await loadSubscriptionsThunk()(dispatch, getState, sdk);

    expect(sdk.transactions.query).toHaveBeenCalledWith(
      expect.objectContaining({
        only: 'order',
        processNames: ['subscription-rental'],
        perPage: 50,
      })
    );
    const state = reducer(initialState, resultAction);
    expect(state.transactionRefs).toHaveLength(2);
  });

  it('rejects with a storable error when the query fails', async () => {
    const sdk = {
      transactions: { query: jest.fn().mockRejectedValue({ status: 500, message: 'nope' }) },
    };
    const dispatch = jest.fn();

    const resultAction = await loadSubscriptionsThunk()(dispatch, getState, sdk);
    const state = reducer(initialState, resultAction);

    expect(state.fetchInProgress).toBe(false);
    expect(state.fetchError).toBeTruthy();
  });
});

describe('cancelSubscriptionThunk', () => {
  it('calls the cancel-subscription API with the transaction id', async () => {
    cancelSubscription.mockResolvedValue({ data: {} });
    const dispatch = jest.fn();

    await cancelSubscriptionThunk({ transactionId: 'tx-1' })(dispatch, getState, {});

    expect(cancelSubscription).toHaveBeenCalledWith({ transactionId: 'tx-1' });
  });

  it('records cancelError when the API rejects', async () => {
    cancelSubscription.mockRejectedValue({ status: 409, message: 'bad state' });
    const dispatch = jest.fn();

    const resultAction = await cancelSubscriptionThunk({ transactionId: 'tx-1' })(
      dispatch,
      getState,
      {}
    );
    const state = reducer(initialState, resultAction);

    expect(state.cancelInProgress).toBe(false);
    expect(state.cancelError).toBeTruthy();
  });
});

describe('openBillingPortalThunk', () => {
  it('resolves with the billing portal url payload', async () => {
    billingPortal.mockResolvedValue({ url: 'https://portal.example' });
    const dispatch = jest.fn();

    const resultAction = await openBillingPortalThunk({ transactionId: 'tx-1' })(
      dispatch,
      getState,
      {}
    );

    expect(billingPortal).toHaveBeenCalledWith({ transactionId: 'tx-1' });
    expect(resultAction.payload).toEqual({ url: 'https://portal.example' });
  });
});
