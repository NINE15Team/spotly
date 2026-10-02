import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';
import { userLocation } from '../../util/maps';
import { types as sdkTypes } from '../../util/sdkLoader';

import LocationAutocompleteInputImpl from './LocationAutocompleteInputImpl';

const { LatLng, LatLngBounds } = sdkTypes;
const { screen, userEvent, waitFor } = testingLibrary;

jest.mock('../../util/maps', () => ({
  ...jest.requireActual('../../util/maps'),
  userLocation: jest.fn(),
}));

const messages = {
  'LocationAutocompleteInput.currentLocation': 'Current location',
  'LocationAutocompleteInput.currentLocationLocating': 'Locating…',
  'LocationAutocompleteInput.currentLocationDenied':
    'Location access is blocked. Allow location for this site in your browser settings, or type an address.',
  'LocationAutocompleteInput.currentLocationUnavailable':
    "We couldn't get your location. Please try again or type an address.",
  'LocationAutocompleteInput.screenreader.search': 'Search',
};

// Mapbox geocoder computes bounds via window.mapboxgl; stub the bit it needs.
const installMapboxStub = () => {
  window.mapboxgl = {
    LngLat: function LngLat(lng, lat) {
      this.lng = lng;
      this.lat = lat;
      this.toBounds = () => ({
        getNorth: () => lat + 0.01,
        getEast: () => lng + 0.01,
        getSouth: () => lat - 0.01,
        getWest: () => lng - 0.01,
      });
    },
  };
};

const renderInput = (value, onChange) =>
  render(
    <LocationAutocompleteInputImpl
      input={{ name: 'location', value, onChange, onBlur: () => {}, onFocus: () => {} }}
      meta={{}}
      placeholder="Where?"
      closeOnBlur
    />,
    { messages }
  );

describe('LocationAutocompleteInputImpl — "Current location" (H-11)', () => {
  beforeEach(() => {
    installMapboxStub();
    userLocation.mockReset();
  });

  it('offers "Current location" even when the field is pre-filled with a selected place', async () => {
    const user = userEvent.setup();
    renderInput(
      { search: 'San Francisco', predictions: [], selectedPlace: { address: 'San Francisco' } },
      () => {}
    );

    await user.click(screen.getByPlaceholderText('Where?'));
    expect(await screen.findByText('Current location')).toBeInTheDocument();
  });

  it('labels the selected place "Current location" instead of leaving the address empty', async () => {
    const user = userEvent.setup();
    userLocation.mockResolvedValue(new LatLng(37.77, -122.42));
    const onChange = jest.fn();
    renderInput({ search: '', predictions: [], selectedPlace: null }, onChange);

    await user.click(screen.getByPlaceholderText('Where?'));
    const option = await screen.findByText('Current location');
    await user.click(option);

    // Immediately shows a locating state in the field instead of an empty, disabled input
    expect(onChange.mock.calls.some(c => c[0]?.search === 'Locating…')).toBe(true);

    await waitFor(() => {
      const selected = onChange.mock.calls.map(c => c[0]).find(v => v?.selectedPlace);
      expect(selected).toBeTruthy();
      expect(selected.search).toBe('Current location');
      expect(selected.selectedPlace.address).toBe('Current location');
      expect(selected.selectedPlace.origin).toBeInstanceOf(LatLng);
      expect(selected.selectedPlace.bounds).toBeInstanceOf(LatLngBounds);
    });
  });

  it('tells the user when location permission was denied', async () => {
    const user = userEvent.setup();
    userLocation.mockRejectedValue({ code: 1, message: 'User denied Geolocation' });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    renderInput({ search: '', predictions: [], selectedPlace: null }, () => {});

    await user.click(screen.getByPlaceholderText('Where?'));
    await user.click(await screen.findByText('Current location'));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Location access is blocked/);
    console.error.mockRestore();
  });

  it('tells the user when the location could not be determined', async () => {
    const user = userEvent.setup();
    userLocation.mockRejectedValue({ code: 3, message: 'Timeout expired' });
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const onChange = jest.fn();
    renderInput({ search: '', predictions: [], selectedPlace: null }, onChange);

    await user.click(screen.getByPlaceholderText('Where?'));
    await user.click(await screen.findByText('Current location'));

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't get your location/);
    // The "Locating…" text is cleared so the user can type an address instead
    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(last.search).toBe('');
    expect(last.selectedPlace).toBeNull();
    console.error.mockRestore();
  });
});
