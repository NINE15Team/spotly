const {
  getFirstPeriodEnd,
  getNextPeriodEnd,
  getProrationRatio,
  getStripeBillingAnchorUnix,
} = require('./subscriptionDates');

// NOTE: subscriptionDates uses moment() which parses in local time. Tests therefore
// construct local Date objects (new Date(year, monthIndex, day)) and assert with local
// getters so they are stable regardless of the host timezone.
describe('subscriptionDates', () => {
  describe('getFirstPeriodEnd(bookingStart)', () => {
    it('returns the next 1st of month for a mid-month start', () => {
      const end = getFirstPeriodEnd(new Date(2026, 5, 8)); // Jun 8 2026
      expect(end.getFullYear()).toBe(2026);
      expect(end.getMonth()).toBe(6); // July
      expect(end.getDate()).toBe(1);
    });

    it('returns the next 1st of month even when start is on the 1st', () => {
      const end = getFirstPeriodEnd(new Date(2026, 5, 1)); // Jun 1 2026
      expect(end.getMonth()).toBe(6); // July
      expect(end.getDate()).toBe(1);
    });

    it('rolls over the year in December', () => {
      const end = getFirstPeriodEnd(new Date(2026, 11, 15)); // Dec 15 2026
      expect(end.getFullYear()).toBe(2027);
      expect(end.getMonth()).toBe(0); // January
      expect(end.getDate()).toBe(1);
    });
  });

  describe('getNextPeriodEnd(currentPeriodEnd)', () => {
    it('advances one month from the current period end', () => {
      const next = getNextPeriodEnd(new Date(2026, 6, 1)); // Jul 1
      expect(next.getMonth()).toBe(7); // August
      expect(next.getDate()).toBe(1);
    });
  });

  describe('getProrationRatio(bookingStart, periodEnd)', () => {
    it('returns 1 when start is on the 1st (full month)', () => {
      const start = new Date(2026, 5, 1);
      const periodEnd = getFirstPeriodEnd(start);
      expect(getProrationRatio(start, periodEnd)).toBe(1);
    });

    it('returns a partial ratio for a mid-month start', () => {
      const start = new Date(2026, 5, 8); // Jun 8, 30-day month
      const periodEnd = getFirstPeriodEnd(start); // Jul 1
      const ratio = getProrationRatio(start, periodEnd);
      // 23 days remaining of 30 in June
      expect(ratio).toBeCloseTo(23 / 30, 5);
    });

    it('clamps the ratio between 0 and 1', () => {
      const start = new Date(2026, 5, 8);
      const periodEnd = getFirstPeriodEnd(start);
      const ratio = getProrationRatio(start, periodEnd);
      expect(ratio).toBeGreaterThanOrEqual(0);
      expect(ratio).toBeLessThanOrEqual(1);
    });

    it('produces the expected prorated amount for a $12 listing (Jun 8 -> 920 cents)', () => {
      const start = new Date(2026, 5, 8);
      const periodEnd = getFirstPeriodEnd(start);
      const ratio = getProrationRatio(start, periodEnd);
      const proratedAmount = Math.round(1200 * ratio);
      expect(proratedAmount).toBe(920); // 1200 * 23/30 = 920
    });
  });

  describe('getStripeBillingAnchorUnix(bookingStart)', () => {
    it('returns the unix timestamp for the first period end', () => {
      const start = new Date(2026, 5, 8);
      const anchor = getStripeBillingAnchorUnix(start);
      const expected = Math.floor(new Date(2026, 6, 1).getTime() / 1000);
      expect(anchor).toBe(expected);
    });
  });
});
