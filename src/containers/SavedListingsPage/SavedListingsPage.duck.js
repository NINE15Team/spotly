import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { types as sdkTypes, createImageVariantConfig } from '../../util/sdkLoader';
import { storableError } from '../../util/errors';
import { addMarketplaceEntities } from '../../ducks/marketplaceData.duck';

const { UUID } = sdkTypes;

const resultIds = data => data.data.map(l => l.id);

/**
 * Fetches the listings the user has saved.
 *
 * Saved ids live in localStorage (see util/hakoSavedListings.js), so they are only
 * available in the browser — the page passes them in rather than the thunk reading
 * storage itself, which keeps this testable and safe during SSR.
 *
 * Listings that are deleted or closed simply come back missing from the response;
 * we render whatever the API still returns.
 */
export const fetchSavedListings = createAsyncThunk(
  'SavedListingsPage/fetchSavedListings',
  async ({ listingIds = [], config }, { dispatch, extra: sdk, rejectWithValue }) => {
    if (listingIds.length === 0) {
      return { ids: [] };
    }

    const { aspectWidth = 1, aspectHeight = 1, variantPrefix = 'listing-card' } =
      config?.layout?.listingImage || {};
    const aspectRatio = aspectHeight / aspectWidth;

    try {
      const response = await sdk.listings.query({
        ids: listingIds.map(id => new UUID(id)),
        include: ['images'],
        'fields.listing': ['title', 'geolocation', 'price', 'publicData'],
        'fields.image': [`variants.${variantPrefix}`, `variants.${variantPrefix}-2x`],
        ...createImageVariantConfig(`${variantPrefix}`, 400, aspectRatio),
        ...createImageVariantConfig(`${variantPrefix}-2x`, 800, aspectRatio),
      });

      dispatch(addMarketplaceEntities(response, { listingFields: config?.listing?.listingFields }));
      return { ids: resultIds(response.data) };
    } catch (e) {
      return rejectWithValue(storableError(e));
    }
  }
);

const savedListingsPageSlice = createSlice({
  name: 'SavedListingsPage',
  initialState: {
    listingIds: [],
    fetchInProgress: false,
    fetchError: null,
    // False until the first fetch settles, so the page can tell "still loading"
    // apart from "genuinely nothing saved".
    hasLoaded: false,
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchSavedListings.pending, state => {
        state.fetchInProgress = true;
        state.fetchError = null;
      })
      .addCase(fetchSavedListings.fulfilled, (state, action) => {
        state.listingIds = action.payload.ids;
        state.fetchInProgress = false;
        state.hasLoaded = true;
      })
      .addCase(fetchSavedListings.rejected, (state, action) => {
        state.fetchInProgress = false;
        state.fetchError = action.payload;
        state.listingIds = [];
        state.hasLoaded = true;
      });
  },
});

export default savedListingsPageSlice.reducer;
