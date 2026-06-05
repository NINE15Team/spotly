const moment = require('moment');
const { BILLING_DAY_OF_MONTH } = require('./subscriptionConstants');

/**
 * Exclusive end of the first subscription period (next billing anchor on day 1).
 *
 * @param {Date|string} bookingStart
 * @returns {Date}
 */
const getFirstPeriodEnd = bookingStart => {
  const start = moment(bookingStart);
  if (start.date() === BILLING_DAY_OF_MONTH) {
    return start.clone().add(1, 'month').startOf('month').toDate();
  }
  return start.clone().add(1, 'month').startOf('month').toDate();
};

/**
 * Exclusive end of the period after currentPeriodEnd.
 *
 * @param {Date|string} currentPeriodEnd exclusive end of current period
 * @returns {Date}
 */
const getNextPeriodEnd = currentPeriodEnd => {
  return moment(currentPeriodEnd).add(1, 'month').startOf('month').toDate();
};

/**
 * Proration ratio for first charge when start is not on the 1st (0–1).
 *
 * @param {Date|string} bookingStart
 * @param {Date|string} periodEnd exclusive
 * @returns {number}
 */
const getProrationRatio = (bookingStart, periodEnd) => {
  const start = moment(bookingStart);
  const end = moment(periodEnd);
  if (start.date() === BILLING_DAY_OF_MONTH) {
    return 1;
  }
  const daysRemaining = end.diff(start, 'days', true);
  const daysInMonth = start.daysInMonth();
  if (daysInMonth <= 0) {
    return 1;
  }
  return Math.min(1, Math.max(0, daysRemaining / daysInMonth));
};

/**
 * Unix timestamp for Stripe trial_end / billing anchor (next 1st 00:00 UTC).
 */
const getStripeBillingAnchorUnix = bookingStart => {
  return moment(getFirstPeriodEnd(bookingStart)).unix();
};

module.exports = {
  getFirstPeriodEnd,
  getNextPeriodEnd,
  getProrationRatio,
  getStripeBillingAnchorUnix,
};
