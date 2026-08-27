/**
 * The location highlighted by the homepage "Featured spots" section.
 *
 * Listings are matched by geographic bounds rather than by the address string,
 * because the Marketplace API filters on coordinates — `address` is only a label.
 * Change this one object to feature a different state or city.
 */
export const FEATURED_LOCATION = {
  name: 'Michigan',
  // Bounding box covering Michigan, including the Upper Peninsula.
  bounds: {
    ne: { lat: 48.31, lng: -82.12 },
    sw: { lat: 41.7, lng: -90.42 },
  },
};

export default FEATURED_LOCATION;
