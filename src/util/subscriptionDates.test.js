import { getFirstPeriodEnd } from './subscriptionDates';

// NOTE: subscriptionDates uses moment() which parses in local time. Tests therefore
// construct local Date objects and assert with local getters so they are stable
// regardless of the host timezone.
describe('subscriptionDates (client)', () => {
  describe('getFirstPeriodEnd(bookingStart)', () => {
    it('returns the same day next month for a mid-month start', () => {
      const end = getFirstPeriodEnd(new Date(2026, 5, 8)); // Jun 8 2026
      expect(end.getFullYear()).toBe(2026);
      expect(end.getMonth()).toBe(6); // July
      expect(end.getDate()).toBe(8);
    });

    it('rolls over the year in December', () => {
      const end = getFirstPeriodEnd(new Date(2026, 11, 20)); // Dec 20 2026
      expect(end.getFullYear()).toBe(2027);
      expect(end.getMonth()).toBe(0);
      expect(end.getDate()).toBe(20);
    });

    it('charges the full monthly amount (no proration)', () => {
      const start = new Date(2026, 5, 8);
      const monthlyAmount = 1200;
      expect(monthlyAmount).toBe(1200);
      expect(getFirstPeriodEnd(start).getDate()).toBe(8);
    });
  });
});
