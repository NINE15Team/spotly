import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { storableError } from '../../util/errors';
import { addMarketplaceEntities } from '../../ducks/marketplaceData.duck';
import { cancelSubscription, billingPortal } from '../../util/api';
import { SUBSCRIPTION_PROCESS_NAME } from '../../transactions/transaction';

const entityRefs = entities =>
  entities.map(entity => ({
    id: entity.id,
    type: entity.type,
  }));

const loadSubscriptionsPayloadCreator = (_, { dispatch, rejectWithValue, extra: sdk }) => {
  return sdk.transactions
    .query({
      only: 'order',
      processNames: SUBSCRIPTION_PROCESS_NAME,
      include: ['listing', 'provider', 'booking'],
      'fields.transaction': [
        'processName',
        'lastTransition',
        'lastTransitionedAt',
        'payinTotal',
        'metadata',
      ],
      'fields.listing': ['title', 'publicData'],
      perPage: 50,
    })
    .then(response => {
      dispatch(addMarketplaceEntities(response));
      return response;
    })
    .catch(e => rejectWithValue(storableError(e)));
};

export const loadSubscriptionsThunk = createAsyncThunk(
  'SubscriptionsPage/loadSubscriptions',
  loadSubscriptionsPayloadCreator
);

export const loadData = () => dispatch => dispatch(loadSubscriptionsThunk());

const cancelSubscriptionPayloadCreator = ({ transactionId }, { rejectWithValue }) => {
  return cancelSubscription({ transactionId }).catch(e => rejectWithValue(storableError(e)));
};

export const cancelSubscriptionThunk = createAsyncThunk(
  'SubscriptionsPage/cancelSubscription',
  cancelSubscriptionPayloadCreator
);

const openBillingPortalPayloadCreator = ({ transactionId }, { rejectWithValue }) => {
  return billingPortal({ transactionId })
    .then(response => response)
    .catch(e => rejectWithValue(storableError(e)));
};

export const openBillingPortalThunk = createAsyncThunk(
  'SubscriptionsPage/openBillingPortal',
  openBillingPortalPayloadCreator
);

const subscriptionsPageSlice = createSlice({
  name: 'SubscriptionsPage',
  initialState: {
    fetchInProgress: false,
    fetchError: null,
    transactionRefs: [],
    cancelInProgress: false,
    cancelError: null,
    portalInProgress: false,
    portalError: null,
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(loadSubscriptionsThunk.pending, state => {
        state.fetchInProgress = true;
        state.fetchError = null;
      })
      .addCase(loadSubscriptionsThunk.fulfilled, (state, action) => {
        state.fetchInProgress = false;
        state.transactionRefs = entityRefs(action.payload.data.data);
      })
      .addCase(loadSubscriptionsThunk.rejected, (state, action) => {
        state.fetchInProgress = false;
        state.fetchError = action.payload;
      })
      .addCase(cancelSubscriptionThunk.pending, state => {
        state.cancelInProgress = true;
        state.cancelError = null;
      })
      .addCase(cancelSubscriptionThunk.fulfilled, state => {
        state.cancelInProgress = false;
      })
      .addCase(cancelSubscriptionThunk.rejected, (state, action) => {
        state.cancelInProgress = false;
        state.cancelError = action.payload;
      })
      .addCase(openBillingPortalThunk.pending, state => {
        state.portalInProgress = true;
        state.portalError = null;
      })
      .addCase(openBillingPortalThunk.fulfilled, state => {
        state.portalInProgress = false;
      })
      .addCase(openBillingPortalThunk.rejected, (state, action) => {
        state.portalInProgress = false;
        state.portalError = action.payload;
      });
  },
});

export default subscriptionsPageSlice.reducer;
