const { getFirstPeriodEnd, getNextPeriodEnd } = require('./subscriptionDates');

// NOTE: subscriptionDates uses moment() which parses in local time. Tests therefore
// construct local Date objects (new Date(year, monthIndex, day)) and assert with local
// getters so they are stable regardless of the host timezone.
describe('subscriptionDates', () => {
  describe('getFirstPeriodEnd(bookingStart)', () => {
    it('returns the same day next month for a mid-month start', () => {
      const end = getFirstPeriodEnd(new Date(2026, 5, 8)); // Jun 8 2026
      expect(end.getFullYear()).toBe(2026);
      expect(end.getMonth()).toBe(6); // July
      expect(end.getDate()).toBe(8);
    });

    it('returns the same day next month when start is on the 1st', () => {
      const end = getFirstPeriodEnd(new Date(2026, 5, 1)); // Jun 1 2026
      expect(end.getMonth()).toBe(6); // July
      expect(end.getDate()).toBe(1);
    });

    it('rolls over the year in December', () => {
      const end = getFirstPeriodEnd(new Date(2026, 11, 15)); // Dec 15 2026
      expect(end.getFullYear()).toBe(2027);
      expect(end.getMonth()).toBe(0); // January
      expect(end.getDate()).toBe(15);
    });
  });

  describe('getNextPeriodEnd(currentPeriodEnd)', () => {
    it('advances one month from the current period end', () => {
      const next = getNextPeriodEnd(new Date(2026, 6, 8)); // Jul 8
      expect(next.getMonth()).toBe(7); // August
      expect(next.getDate()).toBe(8);
    });
  });
});
