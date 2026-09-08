import React from 'react';
import '@testing-library/jest-dom';

import {
  renderWithProviders as render,
  testingLibrary,
  getHostedConfiguration,
} from '../../../util/testHelpers';
import { createUser } from '../../../util/testData';

import {
  HakoBreadcrumbs,
  HakoListingHeading,
  HakoHostBar,
  HakoAmenities,
  HakoVehicleRestrictions,
} from './index';

const { screen } = testingLibrary;

// Mirrors the shape of the hosted listing-fields asset (Sharetribe Console).
const hostedConfigWithFields = {
  ...getHostedConfiguration(),
  listingFields: {
    listingFields: [
      {
        key: 'security_features',
        scope: 'public',
        schemaType: 'multi-enum',
        label: 'Security features',
        enumOptions: [
          { option: 'CCTV', label: 'CCTV' },
          { option: 'Gated', label: 'Gated' },
        ],
        filterConfig: { indexForSearch: false },
      },
      {
        key: 'Surface_type',
        scope: 'public',
        schemaType: 'enum',
        label: 'Surface type',
        enumOptions: [{ option: 'Paved', label: 'Paved' }],
        filterConfig: { indexForSearch: true, showFilter: true },
      },
      {
        key: 'Weight_limit',
        scope: 'public',
        schemaType: 'long',
        label: 'Weight limit (lbs)',
        numberConfig: { minimum: 1, maximum: 100000 },
        filterConfig: { indexForSearch: true },
      },
    ],
  },
};

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

  it('renders amenities and limits from the listing\'s own hosted fields', () => {
    // Both sections are data-driven: they used to show a fixed placeholder list
    // ("EV Charging", "2.11 m", …) on every listing regardless of the real data.
    render(
      <>
        <HakoAmenities
          publicData={{ security_features: ['CCTV', 'Gated'], Surface_type: 'Paved' }}
        />
        <HakoVehicleRestrictions publicData={{ Weight_limit: 4000 }} />
      </>,
      {
        config: hostedConfigWithFields,
        messages: {
          'HakoListing.amenitiesTitle': 'What this spot offers',
          'HakoListing.restrictionsTitle': 'Size & weight limits',
        },
      }
    );
    // Multi-enum options use their configured labels, one chip each.
    expect(screen.getByText('CCTV')).toBeInTheDocument();
    expect(screen.getByText('Gated')).toBeInTheDocument();
    // Single-selects are prefixed so the value has context.
    expect(screen.getByText('Surface type: Paved')).toBeInTheDocument();
    // Units come from the Console label.
    expect(screen.getByText(/Weight limit \(lbs\): 4000/)).toBeInTheDocument();
  });

  it('renders nothing when the listing has no matching field values', () => {
    const { container } = render(
      <>
        <HakoAmenities publicData={{}} />
        <HakoVehicleRestrictions publicData={{}} />
      </>,
      { config: hostedConfigWithFields }
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('never invents amenities that the listing does not have', () => {
    render(<HakoAmenities publicData={{ Surface_type: 'Paved' }} />, {
      config: hostedConfigWithFields,
      messages: { 'HakoListing.amenitiesTitle': 'What this spot offers' },
    });
    expect(screen.queryByText('EV Charging')).toBeNull();
    expect(screen.queryByText('Covered Stall')).toBeNull();
  });
});
