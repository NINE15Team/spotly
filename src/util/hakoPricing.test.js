import {
  HOURS_PER_DAY,
  PRICE_BY_DAY,
  PRICE_BY_HOUR,
  priceUnitToDayFactor,
  sanitizePriceBy,
} from './hakoPricing';

describe('hakoPricing', () => {
  it('defaults to hour for missing or unsupported values', () => {
    expect(sanitizePriceBy(undefined)).toBe(PRICE_BY_HOUR);
    expect(sanitizePriceBy(null)).toBe(PRICE_BY_HOUR);
    expect(sanitizePriceBy('')).toBe(PRICE_BY_HOUR);
    // URL params are user-controlled, so anything unexpected must fall back
    expect(sanitizePriceBy('week')).toBe(PRICE_BY_HOUR);
    expect(sanitizePriceBy('<script>')).toBe(PRICE_BY_HOUR);
  });

  it('keeps supported values', () => {
    expect(sanitizePriceBy(PRICE_BY_HOUR)).toBe(PRICE_BY_HOUR);
    expect(sanitizePriceBy(PRICE_BY_DAY)).toBe(PRICE_BY_DAY);
  });

  it('scales an hourly range into the stored per-day unit', () => {
    expect(priceUnitToDayFactor(PRICE_BY_HOUR)).toBe(HOURS_PER_DAY);
  });

  it('leaves a daily range untouched', () => {
    expect(priceUnitToDayFactor(PRICE_BY_DAY)).toBe(1);
  });

  it('falls back to the hourly factor for invalid input', () => {
    expect(priceUnitToDayFactor('nonsense')).toBe(HOURS_PER_DAY);
  });

  it('converts a range so a listing is matched by its hourly rate', () => {
    // "Good Parking" costs $150/day, i.e. $6.25/hr.
    const dailyPriceInSubunits = 15000;
    const asDailyMax = hourlyMajorUnits =>
      hourlyMajorUnits * 100 * priceUnitToDayFactor(PRICE_BY_HOUR) + 1;

    // A max of $5/hr is below $6.25/hr, so the listing must fall outside the range.
    expect(dailyPriceInSubunits).toBeGreaterThan(asDailyMax(5));
    // A max of $7/hr is above $6.25/hr, so it must fall inside.
    expect(dailyPriceInSubunits).toBeLessThan(asDailyMax(7));
  });
});
