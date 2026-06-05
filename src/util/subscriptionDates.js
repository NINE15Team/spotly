import moment from 'moment';

const BILLING_DAY_OF_MONTH = 1;

/**
 * Exclusive end of the first subscription period (next 1st of month).
 *
 * @param {Date} bookingStart
 * @returns {Date}
 */
export const getFirstPeriodEnd = bookingStart => {
  const start = moment(bookingStart);
  return start.clone().add(1, 'month').startOf('month').toDate();
};

/**
 * Proration ratio for first charge when start is not on the 1st (0–1).
 */
export const getProrationRatio = (bookingStart, periodEnd) => {
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

export { BILLING_DAY_OF_MONTH };
