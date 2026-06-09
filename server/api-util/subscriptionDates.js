const moment = require('moment');

/**
 * Exclusive end of the first subscription period (same day next month).
 *
 * @param {Date|string} bookingStart
 * @returns {Date}
 */
const getFirstPeriodEnd = bookingStart => {
  return moment(bookingStart).add(1, 'month').toDate();
};

/**
 * Exclusive end of the period after currentPeriodEnd.
 *
 * @param {Date|string} currentPeriodEnd exclusive end of current period
 * @returns {Date}
 */
const getNextPeriodEnd = currentPeriodEnd => {
  return moment(currentPeriodEnd).add(1, 'month').toDate();
};

module.exports = {
  getFirstPeriodEnd,
  getNextPeriodEnd,
};
