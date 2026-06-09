import moment from 'moment';

/**
 * Exclusive end of the first subscription period (same day next month).
 *
 * @param {Date} bookingStart
 * @returns {Date}
 */
export const getFirstPeriodEnd = bookingStart => {
  return moment(bookingStart).add(1, 'month').toDate();
};
