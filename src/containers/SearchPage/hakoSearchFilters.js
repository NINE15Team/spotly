/**
 * Hako Search Results sidebar filter helpers.
 *
 * The sidebar filters themselves are NOT defined here. They come entirely from the
 * hosted listing-fields asset (Sharetribe Console): a field shows up as a sidebar
 * filter when it has filterConfig.indexForSearch and filterConfig.showFilter set.
 * Adding/removing a field in Console is therefore reflected on the search page
 * automatically, with no code change.
 *
 * This module only lists the built-in filters that the Hako layout hides, because
 * they are already presented in the search bar above the results (listing type,
 * dates, keywords) and would otherwise be duplicated in the sidebar.
 */
export const HAKO_HIDDEN_SIDEBAR_FILTER_KEYS = ['listingType', 'dates', 'keywords'];
export const HAKO_HIDDEN_SIDEBAR_SCHEMA_TYPES = ['listingType', 'dates', 'keywords'];

export const isHakoHiddenSidebarFilter = filterConfig => {
  if (!filterConfig) {
    return false;
  }
  return (
    HAKO_HIDDEN_SIDEBAR_FILTER_KEYS.includes(filterConfig.key) ||
    HAKO_HIDDEN_SIDEBAR_SCHEMA_TYPES.includes(filterConfig.schemaType)
  );
};
