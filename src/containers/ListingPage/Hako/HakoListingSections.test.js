import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../../util/testHelpers';
import { createUser } from '../../../util/testData';

import {
  HakoBreadcrumbs,
  HakoListingHeading,
  HakoHostBar,
  HakoAmenities,
  HakoVehicleRestrictions,
} from './index';

const { screen } = testingLibrary;

describe('Hako listing sections', () => {
  it('renders breadcrumbs', () => {
    render(<HakoBreadcrumbs title="Bayview Parkade Stall" locationLabel="North Vancouver" />, {
      messages: { 'HakoListing.breadcrumbSearch': 'Search' },
    });
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('North Vancouver')).toBeInTheDocument();
    expect(screen.getByText('Bayview Parkade Stall')).toBeInTheDocument();
  });

  it('renders listing heading with share action', () => {
    render(
      <HakoListingHeading
        title="Bayview Parkade Stall"
        subtitle="Secure & Covered"
        locationLabel="Bayview, San Francisco"
      />,
      { messages: { 'HakoListing.share': 'Share' } }
    );
    expect(screen.getByRole('heading', { name: 'Bayview Parkade Stall' })).toBeInTheDocument();
    expect(screen.getByText('Secure & Covered')).toBeInTheDocument();
    expect(screen.getByLabelText('Share listing')).toBeInTheDocument();
    expect(screen.getByText('Share')).toBeInTheDocument();
  });

  it('shows no ratings and no save/like control', () => {
    // Ratings were fabricated (a fixed 4.9 / 42 reviews) and the heart button led
    // nowhere, so both were removed until real data and a favourites feature exist.
    render(
      <HakoListingHeading title="Bayview Parkade Stall" locationLabel="Bayview, San Francisco" />,
      { messages: { 'HakoListing.share': 'Share' } }
    );
    expect(screen.queryByLabelText('Save listing')).toBeNull();
    expect(screen.queryByText('Like')).toBeNull();
    expect(screen.queryByText('4.9')).toBeNull();
  });

  it('renders host bar with contact', () => {
    const author = createUser('author-1');
    render(
      <HakoHostBar
        author={author}
        authorDisplayName="Marcus R."
        reviewCount={24}
        onContactUser={() => {}}
        showContact
      />,
      {
        messages: {
          'HakoListing.hostedBy': 'Hosted by {name}',
          'HakoListing.contactHost': 'Contact Host',
          'HakoListing.hostStats': 'Hako Host{memberMaybe} · {count} reviews',
        },
      }
    );
    expect(screen.getByText('Marcus R.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Contact Host' })).toBeInTheDocument();
  });

  it('renders amenities and restrictions', () => {
    render(
      <>
        <HakoAmenities publicData={{ amenities: ['EV Charging', 'Covered Stall'] }} />
        <HakoVehicleRestrictions publicData={{ vehicleHeight: '2 m' }} />
      </>,
      {
        messages: {
          'HakoListing.amenitiesTitle': 'What this spot offers',
          'HakoListing.restrictionsTitle': 'Vehicle Restrictions',
          'HakoListing.restrictionHeight': 'Maximum vehicle height: {value}',
          'HakoListing.restrictionLength': 'Maximum vehicle length: {value}',
          'HakoListing.restrictionWeight': 'Maximum vehicle weight: {value}',
        },
      }
    );
    expect(screen.getByText('EV Charging')).toBeInTheDocument();
    expect(screen.getByText('Covered Stall')).toBeInTheDocument();
    expect(screen.getByText(/Maximum vehicle height: 2 m/)).toBeInTheDocument();
  });
});
