/**
 * Hako "Price by" (Hour / Day) search helpers.
 *
 * Listings store a single price, denominated per day. There is no separate hourly
 * price to filter against, so the Hour/Day toggle converts the *range the user
 * typed* into the stored per-day unit before querying:
 *
 *   priceBy=day   ->  range is already per-day, used as-is
 *   priceBy=hour  ->  range is per-hour, so multiply by HOURS_PER_DAY to get the
 *                     equivalent per-day range
 *
 * A "day" of parking is treated as a full 24 hours. If Hako ever sells a shorter
 * standard parking day (e.g. a 12-hour business day), change HOURS_PER_DAY and
 * both the filter and any derived labels follow.
 */

export const PRICE_BY_HOUR = 'hour';
export const PRICE_BY_DAY = 'day';
export const DEFAULT_PRICE_BY = PRICE_BY_HOUR;

export const PRICE_BY_OPTIONS = [PRICE_BY_HOUR, PRICE_BY_DAY];

/** Hours in one parking "day". */
export const HOURS_PER_DAY = 24;

/**
 * Normalizes an arbitrary (URL-supplied) value to a supported priceBy option.
 * @param {string} value
 * @returns {'hour'|'day'}
 */
export const sanitizePriceBy = value =>
  PRICE_BY_OPTIONS.includes(value) ? value : DEFAULT_PRICE_BY;

/**
 * Multiplier that converts a price expressed in the selected unit into the
 * per-day unit that listings are stored in.
 * @param {string} priceBy
 * @returns {number}
 */
export const priceUnitToDayFactor = priceBy =>
  sanitizePriceBy(priceBy) === PRICE_BY_HOUR ? HOURS_PER_DAY : 1;
