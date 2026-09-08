import { publicLocationLabel, publicLocationShort } from './hakoLocation';

const withAddress = address => ({ location: { address } });

describe('publicLocationLabel', () => {
  it('shows only City, State from a full street address', () => {
    expect(
      publicLocationLabel(withAddress('1500 Atlantic Boulevard, Auburn Hills, Michigan 48326, United States'))
    ).toBe('Auburn Hills, Michigan');
    expect(
      publicLocationLabel(withAddress('6127 Echo Street, Los Angeles, California 90042, United States'))
    ).toBe('Los Angeles, California');
  });

  it('prefers the structured city/state when Sharetribe stored them', () => {
    expect(
      publicLocationLabel({
        location: {
          address: '4439 Gale Street, Livermore, California 94550, United States',
          city: 'Livermore',
          state: 'CA',
        },
      })
    ).toBe('Livermore, CA');
  });

  it('drops the country and postal code', () => {
    const label = publicLocationLabel(
      withAddress('1500 Atlantic Boulevard, Auburn Hills, Michigan 48326, United States')
    );
    expect(label).not.toMatch(/United States/);
    expect(label).not.toMatch(/48326/);
  });

  it('never exposes the street line or the building / unit', () => {
    const label = publicLocationLabel({
      location: { address: '1500 Atlantic Boulevard, Auburn Hills, Michigan 48326', building: 'Stall 7' },
    });
    expect(label).toBe('Auburn Hills, Michigan');
    expect(label).not.toMatch(/Atlantic|Stall/);
  });

  it('handles city-level addresses that have no street line', () => {
    expect(publicLocationLabel(withAddress('New York City, New York 10001, United States'))).toBe(
      'New York City, New York'
    );
    expect(publicLocationLabel(withAddress('California City, California, United States'))).toBe(
      'California City, California'
    );
  });

  it('handles non-US addresses without mangling them', () => {
    expect(publicLocationLabel(withAddress('Testico, Savona, Italy'))).toBe('Testico, Savona');
  });

  it('handles missing data', () => {
    expect(publicLocationLabel(undefined)).toBe('');
    expect(publicLocationLabel({})).toBe('');
    expect(publicLocationLabel({ location: {} })).toBe('');
  });
});

describe('publicLocationShort', () => {
  it('returns the city only', () => {
    expect(
      publicLocationShort(withAddress('1500 Atlantic Boulevard, Auburn Hills, Michigan 48326, United States'))
    ).toBe('Auburn Hills');
  });

  it('returns an empty string when there is no location', () => {
    expect(publicLocationShort({})).toBe('');
  });
});
