import {
  DEFAULT_MARKETPLACE_TIME_ZONE,
  US_TIME_ZONES,
  getOtherTimeZoneNames,
  isSelectableTimeZone,
  resolveDefaultTimeZone,
} from './timeZones';

const mockBrowserTimeZone = timeZone =>
  jest.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({ timeZone });

describe('timeZones', () => {
  describe('isSelectableTimeZone', () => {
    it('accepts zones the selector renders', () => {
      expect(isSelectableTimeZone('America/New_York')).toBe(true);
      expect(isSelectableTimeZone('Pacific/Honolulu')).toBe(true);
      expect(isSelectableTimeZone('Europe/Helsinki')).toBe(true);
    });

    it('rejects zones that would leave the <select> unmatched', () => {
      expect(isSelectableTimeZone('Etc/UTC')).toBe(false);
      expect(isSelectableTimeZone('UTC')).toBe(false);
      expect(isSelectableTimeZone('US/Eastern')).toBe(false);
      expect(isSelectableTimeZone(undefined)).toBe(false);
      expect(isSelectableTimeZone('')).toBe(false);
    });
  });

  describe('resolveDefaultTimeZone', () => {
    it('uses the browser time zone when it is selectable', () => {
      const spy = mockBrowserTimeZone('America/Chicago');
      try {
        expect(resolveDefaultTimeZone()).toBe('America/Chicago');
      } finally {
        spy.mockRestore();
      }
    });

    it('falls back to the marketplace default when the browser reports UTC (the "Africa" bug)', () => {
      const spy = mockBrowserTimeZone('UTC');
      try {
        const tz = resolveDefaultTimeZone();
        expect(tz).toBe(DEFAULT_MARKETPLACE_TIME_ZONE);
        expect(tz).toBe('America/New_York');
        expect(isSelectableTimeZone(tz)).toBe(true);
      } finally {
        spy.mockRestore();
      }
    });

    it('falls back to the marketplace default when the browser reports nothing', () => {
      const spy = mockBrowserTimeZone(undefined);
      try {
        expect(resolveDefaultTimeZone()).toBe(DEFAULT_MARKETPLACE_TIME_ZONE);
      } finally {
        spy.mockRestore();
      }
    });

    it('never returns a value the selector cannot show', () => {
      const tz = resolveDefaultTimeZone();
      expect(isSelectableTimeZone(tz)).toBe(true);
      expect(tz).not.toMatch(/^Etc\//);
    });
  });

  describe('selector option lists', () => {
    it('keeps the curated US zones out of the "other" group', () => {
      const others = getOtherTimeZoneNames();
      US_TIME_ZONES.forEach(({ value }) => {
        expect(others).not.toContain(value);
        expect(isSelectableTimeZone(value)).toBe(true);
      });
      expect(others).toContain('Europe/Helsinki');
      expect(others.some(tz => tz.startsWith('Etc/'))).toBe(false);
    });
  });
});
