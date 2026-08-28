import { publicLocationLabel, publicLocationShort } from './hakoLocation';

const withAddress = address => ({ location: { address } });

describe('publicLocationLabel', () => {
  it('drops a street-level segment so the exact address is not public', () => {
    expect(
      publicLocationLabel(withAddress('6127 Echo Street, Los Angeles, California 90042, United States'))
    ).toBe('Los Angeles, California 90042, United States');
  });

  it('leaves city-level addresses untouched', () => {
    expect(publicLocationLabel(withAddress('New York City, New York 10001, United States'))).toBe(
      'New York City, New York 10001, United States'
    );
    expect(publicLocationLabel(withAddress('California City, California, United States'))).toBe(
      'California City, California, United States'
    );
  });

  it('keeps a non-numeric first segment (it is not a street number)', () => {
    expect(publicLocationLabel(withAddress('Test Track, Redbank Queensland 4301, Australia'))).toBe(
      'Test Track, Redbank Queensland 4301, Australia'
    );
  });

  it('never exposes the building / unit, which pinpoints the spot', () => {
    expect(publicLocationLabel({ location: { address: '', building: 'A 43' } })).toBe('');
    expect(publicLocationLabel({ location: { address: '12 Main St, Detroit', building: 'Stall 7' } }))
      .toBe('Detroit');
  });

  it('prefers an explicit neighborhood or city when present', () => {
    expect(publicLocationLabel({ neighborhood: 'Bayview', location: { address: '1 A St, SF' } })).toBe(
      'Bayview'
    );
    expect(publicLocationLabel({ city: 'Detroit', location: { address: '1 A St, SF' } })).toBe(
      'Detroit'
    );
  });

  it('never reduces a label to nothing', () => {
    // A bare street segment with nothing after it must still render something.
    expect(publicLocationLabel(withAddress('6127 Echo Street'))).toBe('6127 Echo Street');
  });

  it('handles missing data', () => {
    expect(publicLocationLabel(undefined)).toBe('');
    expect(publicLocationLabel({})).toBe('');
    expect(publicLocationLabel({ location: {} })).toBe('');
  });
});

describe('publicLocationShort', () => {
  it('returns the first non-street segment', () => {
    expect(
      publicLocationShort(withAddress('6127 Echo Street, Los Angeles, California 90042, United States'))
    ).toBe('Los Angeles');
  });

  it('returns an empty string when there is no location', () => {
    expect(publicLocationShort({})).toBe('');
  });
});
