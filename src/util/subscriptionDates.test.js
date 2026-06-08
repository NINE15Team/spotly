import { getFirstPeriodEnd, getProrationRatio, BILLING_DAY_OF_MONTH } from './subscriptionDates';

// NOTE: subscriptionDates uses moment() which parses in local time. Tests therefore
// construct local Date objects and assert with local getters so they are stable
// regardless of the host timezone.
describe('subscriptionDates (client)', () => {
  describe('getFirstPeriodEnd(bookingStart)', () => {
    it('returns the next 1st of month for a mid-month start', () => {
      const end = getFirstPeriodEnd(new Date(2026, 5, 8)); // Jun 8 2026
      expect(end.getFullYear()).toBe(2026);
      expect(end.getMonth()).toBe(6); // July
      expect(end.getDate()).toBe(1);
    });

    it('rolls over the year in December', () => {
      const end = getFirstPeriodEnd(new Date(2026, 11, 20)); // Dec 20 2026
      expect(end.getFullYear()).toBe(2027);
      expect(end.getMonth()).toBe(0);
      expect(end.getDate()).toBe(1);
    });
  });

  describe('getProrationRatio(bookingStart, periodEnd)', () => {
    it('returns 1 when start is on the billing day of month', () => {
      const start = new Date(2026, 5, BILLING_DAY_OF_MONTH);
      const periodEnd = getFirstPeriodEnd(start);
      expect(getProrationRatio(start, periodEnd)).toBe(1);
    });

    it('returns a partial ratio for a mid-month start (Jun 8 -> 23/30)', () => {
      const start = new Date(2026, 5, 8);
      const periodEnd = getFirstPeriodEnd(start);
      expect(getProrationRatio(start, periodEnd)).toBeCloseTo(23 / 30, 5);
    });

    it('clamps the ratio between 0 and 1', () => {
      const start = new Date(2026, 5, 8);
      const periodEnd = getFirstPeriodEnd(start);
      const ratio = getProrationRatio(start, periodEnd);
      expect(ratio).toBeGreaterThanOrEqual(0);
      expect(ratio).toBeLessThanOrEqual(1);
    });
  });

  it('keeps client and amount calculation consistent ($12 -> 920 cents on Jun 8)', () => {
    const start = new Date(2026, 5, 8);
    const periodEnd = getFirstPeriodEnd(start);
    const proratedAmount = Math.round(1200 * getProrationRatio(start, periodEnd));
    expect(proratedAmount).toBe(920);
  });
});
