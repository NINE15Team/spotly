import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { types as sdkTypes } from '../../util/sdkLoader';
import { storableError } from '../../util/errors';
import { createImageVariantConfig } from '../../util/sdkLoader';
import { fetchPageAssets } from '../../ducks/hostedAssets.duck';
import { addMarketplaceEntities } from '../../ducks/marketplaceData.duck';
import { FEATURED_LOCATION } from './Hako/featuredLocation';

const { LatLng, LatLngBounds } = sdkTypes;

export const ASSET_NAME = 'landing-page';

const FEATURED_LISTINGS_COUNT = 3;

const resultIds = data => data.data.map(l => l.id);

const featuredQueryParams = (config, extraParams) => {
  const { aspectWidth = 1, aspectHeight = 1, variantPrefix = 'listing-card' } =
    config?.layout?.listingImage || {};
  const aspectRatio = aspectHeight / aspectWidth;

  return {
    perPage: FEATURED_LISTINGS_COUNT,
    include: ['images'],
    'fields.listing': ['title', 'geolocation', 'price', 'publicData'],
    'fields.image': [`variants.${variantPrefix}`, `variants.${variantPrefix}-2x`],
    ...createImageVariantConfig(`${variantPrefix}`, 400, aspectRatio),
    ...createImageVariantConfig(`${variantPrefix}-2x`, 800, aspectRatio),
    ...extraParams,
  };
};

/**
 * Loads the listings shown in the "Featured spots" section.
 *
 * Preference is for listings inside the featured location's bounds. If that area
 * has no published listings yet, fall back to the newest listings marketplace-wide
 * so the section is never empty — the heading reflects which of the two happened,
 * so it never claims a location the listings aren't actually in.
 */
const fetchFeaturedListingsPayloadCreator = async ({ config }, { dispatch, extra: sdk }) => {
  const sanitizeConfig = { listingFields: config?.listing?.listingFields };
  const { ne, sw } = FEATURED_LOCATION.bounds;
  const bounds = new LatLngBounds(new LatLng(ne.lat, ne.lng), new LatLng(sw.lat, sw.lng));

  const inLocation = await sdk.listings.query(featuredQueryParams(config, { bounds }));
  if (inLocation.data.data.length > 0) {
    dispatch(addMarketplaceEntities(inLocation, sanitizeConfig));
    return { response: inLocation, isFeaturedLocation: true };
  }

  const anywhere = await sdk.listings.query(
    featuredQueryParams(config, { sort: '-createdAt' })
  );
  dispatch(addMarketplaceEntities(anywhere, sanitizeConfig));
  return { response: anywhere, isFeaturedLocation: false };
};

export const fetchFeaturedListings = createAsyncThunk(
  'LandingPage/fetchFeaturedListings',
  async (arg, thunkAPI) => {
    try {
      return await fetchFeaturedListingsPayloadCreator(arg, thunkAPI);
    } catch (e) {
      return thunkAPI.rejectWithValue(storableError(e));
    }
  }
);

const landingPageSlice = createSlice({
  name: 'LandingPage',
  initialState: {
    featuredListingIds: [],
    // Whether the featured listings actually come from FEATURED_LOCATION
    isFeaturedLocation: false,
    fetchFeaturedInProgress: false,
    fetchFeaturedError: null,
  },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchFeaturedListings.pending, state => {
        state.fetchFeaturedInProgress = true;
        state.fetchFeaturedError = null;
      })
      .addCase(fetchFeaturedListings.fulfilled, (state, action) => {
        const { response, isFeaturedLocation } = action.payload;
        state.featuredListingIds = resultIds(response.data);
        state.isFeaturedLocation = isFeaturedLocation;
        state.fetchFeaturedInProgress = false;
      })
      .addCase(fetchFeaturedListings.rejected, (state, action) => {
        state.fetchFeaturedInProgress = false;
        state.fetchFeaturedError = action.payload;
        state.featuredListingIds = [];
      });
  },
});

export const loadData = (params, search, config) => dispatch => {
  const pageAsset = { landingPage: `content/pages/${ASSET_NAME}.json` };
  return Promise.all([
    dispatch(fetchPageAssets(pageAsset, true)),
    // Featured spots are supplementary: a failure here must not block the page.
    dispatch(fetchFeaturedListings({ config })),
  ]);
};

export default landingPageSlice.reducer;
