const { types } = require('sharetribe-flex-sdk');
const { UUID } = types;
const { normalizeUuid } = require('./integrationSdk');

describe('integrationSdk.normalizeUuid', () => {
  it('returns a plain string unchanged', () => {
    expect(normalizeUuid('6a26f729-b0f3-468b-80f0-e51b9715aa4f')).toBe(
      '6a26f729-b0f3-468b-80f0-e51b9715aa4f'
    );
  });

  it('extracts the uuid from a Sharetribe UUID instance', () => {
    const id = new UUID('6a26f729-b0f3-468b-80f0-e51b9715aa4f');
    expect(normalizeUuid(id)).toBe('6a26f729-b0f3-468b-80f0-e51b9715aa4f');
  });

  it('extracts the uuid from a plain { uuid } object', () => {
    expect(normalizeUuid({ uuid: 'abc-123' })).toBe('abc-123');
  });

  it('returns null for nullish or unrecognized input', () => {
    expect(normalizeUuid(null)).toBeNull();
    expect(normalizeUuid(undefined)).toBeNull();
    expect(normalizeUuid({})).toBeNull();
  });
});
