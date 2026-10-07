import resolveTypedPlace from './resolveTypedPlace';

const mockGetPlacePredictions = jest.fn();
const mockGetPlaceDetails = jest.fn();
jest.mock('./GeocoderMapbox', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    getPlacePredictions: (...args) => mockGetPlacePredictions(...args),
    getPlaceDetails: (...args) => mockGetPlaceDetails(...args),
  })),
}));

const config = {
  maps: {
    mapProvider: 'mapbox',
    search: { countryLimit: ['US'], currentLocationBoundsDistance: 5000 },
  },
  localization: { locale: 'en' },
};

describe('resolveTypedPlace', () => {
  beforeEach(() => {
    mockGetPlacePredictions.mockReset();
    mockGetPlaceDetails.mockReset();
  });

  it('resolves the first prediction to a place with bounds', async () => {
    const place = { address: 'Austin, Texas, United States', bounds: {}, origin: {} };
    mockGetPlacePredictions.mockResolvedValue({
      search: 'Austin',
      predictions: [{ id: 'a' }, { id: 'b' }],
    });
    mockGetPlaceDetails.mockResolvedValue(place);

    await expect(resolveTypedPlace(config, ' Austin ')).resolves.toBe(place);
    expect(mockGetPlacePredictions).toHaveBeenCalledWith('Austin', ['US'], 'en');
    expect(mockGetPlaceDetails).toHaveBeenCalledWith({ id: 'a' }, 5000);
  });

  it('returns null for empty text, no predictions and geocoder errors', async () => {
    await expect(resolveTypedPlace(config, '  ')).resolves.toBeNull();

    mockGetPlacePredictions.mockResolvedValue({ search: 'zzz', predictions: [] });
    await expect(resolveTypedPlace(config, 'zzz')).resolves.toBeNull();

    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetPlacePredictions.mockRejectedValue(new Error('network'));
    await expect(resolveTypedPlace(config, 'Austin')).resolves.toBeNull();
  });
});
