/**
 * Saved ("liked") listings, persisted in localStorage.
 *
 * Deliberately frontend-only: there is no favourites API, so likes live in the
 * browser. That means they are per-device and per-browser, and are lost when the
 * user clears site data — moving them to the account needs a backend field.
 *
 * Every read/write is guarded: localStorage throws in private-mode Safari and in
 * SSR there is no window at all, and a listing page must never break because a
 * like could not be stored.
 */

const STORAGE_KEY = 'hako_saved_listings';

/** Custom event so open tabs/components stay in sync within the same document. */
export const SAVED_LISTINGS_CHANGED = 'hako:saved-listings-changed';

const canUseStorage = () => typeof window !== 'undefined' && !!window.localStorage;

/**
 * @returns {string[]} saved listing ids (never null)
 */
export const getSavedListingIds = () => {
  if (!canUseStorage()) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(id => typeof id === 'string') : [];
  } catch (e) {
    return [];
  }
};

/**
 * @param {string} listingId
 * @returns {boolean}
 */
export const isListingSaved = listingId =>
  !!listingId && getSavedListingIds().includes(listingId);

const persist = ids => {
  if (!canUseStorage()) {
    return ids;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent(SAVED_LISTINGS_CHANGED, { detail: { ids } }));
  } catch (e) {
    // Storage full or blocked — the in-memory result is still returned so the
    // UI stays responsive for this page view.
  }
  return ids;
};

/**
 * Adds or removes a listing.
 * @param {string} listingId
 * @returns {boolean} whether the listing is saved after toggling
 */
export const toggleSavedListing = listingId => {
  if (!listingId) {
    return false;
  }
  const ids = getSavedListingIds();
  const isSaved = ids.includes(listingId);
  persist(isSaved ? ids.filter(id => id !== listingId) : [...ids, listingId]);
  return !isSaved;
};
