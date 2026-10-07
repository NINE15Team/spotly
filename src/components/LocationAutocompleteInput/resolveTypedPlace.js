/**
 * Resolve free text typed into a location field (without picking a suggestion) to a place
 * with `origin` and `bounds`, using the first geocoder prediction. Search needs the bounds to
 * move the map/results; an address string alone leaves the previous (or world) viewport.
 *
 * The geocoder modules are loaded on demand to keep them out of the main bundle.
 *
 * @param {Object} config app configuration
 * @param {string} search the text the user typed
 * @returns {Promise<Object|null>} place `{ address, origin, bounds }`, or null when it can't be resolved
 */
const resolveTypedPlace = async (config, search) => {
  const text = (search || '').trim();
  if (!text) {
    return null;
  }

  try {
    const isGoogleMapsInUse = config.maps.mapProvider === 'googleMaps';
    const geocoderModule = isGoogleMapsInUse
      ? await import(/* webpackChunkName: "GeocoderGoogleMaps" */ './GeocoderGoogleMaps')
      : await import(/* webpackChunkName: "GeocoderMapbox" */ './GeocoderMapbox');
    const geocoder = new geocoderModule.default();
    const { predictions } = await geocoder.getPlacePredictions(
      text,
      config.maps.search.countryLimit,
      config.localization.locale
    );
    if (!predictions || predictions.length === 0) {
      return null;
    }
    return await geocoder.getPlaceDetails(
      predictions[0],
      config.maps.search.currentLocationBoundsDistance
    );
  } catch (e) {
    console.error(e);
    return null;
  }
};

export default resolveTypedPlace;
