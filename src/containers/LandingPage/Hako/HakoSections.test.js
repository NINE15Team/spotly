import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../../util/testHelpers';

import { SectionFeaturedSpots } from './SectionFeaturedSpots';
import { SectionExploreLocations } from './SectionExploreLocations';
import { SectionReviews } from './SectionReviews';
import { SectionListYourSpace } from './SectionListYourSpace';
import { HakoFooter } from './HakoFooter';

const { screen } = testingLibrary;

describe('Homepage remaining sections', () => {
  it('SectionFeaturedSpots renders title and listing cards', () => {
    render(<SectionFeaturedSpots />);
    expect(screen.getByRole('heading', { name: 'HakoLanding.featured.title' })).toBeInTheDocument();
    expect(screen.getAllByText('Bayview Parkade Stall').length).toBe(3);
    expect(screen.getByText('HakoLanding.featured.viewAll')).toBeInTheDocument();
  });

  it('SectionExploreLocations renders all location cards', () => {
    render(<SectionExploreLocations />);
    expect(screen.getByRole('heading', { name: 'HakoLanding.explore.title' })).toBeInTheDocument();
    expect(screen.getByText('California')).toBeInTheDocument();
    expect(screen.getByText('Maryland')).toBeInTheDocument();
    expect(screen.getByText('Massachusetts')).toBeInTheDocument();
    expect(screen.getByText('Michigan')).toBeInTheDocument();
    expect(screen.getByText('New Jersey')).toBeInTheDocument();
    expect(screen.getByText('New York')).toBeInTheDocument();
    expect(screen.getByText('Pennsylvania')).toBeInTheDocument();
    expect(screen.getByText('Washington')).toBeInTheDocument();
  });

  it('SectionReviews renders review quotes and authors', () => {
    render(<SectionReviews />);
    expect(screen.getByRole('heading', { name: 'HakoLanding.reviews.title' })).toBeInTheDocument();
    expect(screen.getByText('Marcus T.')).toBeInTheDocument();
    expect(screen.getByText('Priya L.')).toBeInTheDocument();
    expect(screen.getByText('Jordan K.')).toBeInTheDocument();
  });

  it('SectionListYourSpace renders CTA linking to new listing', () => {
    render(<SectionListYourSpace />);
    expect(
      screen.getByRole('heading', { name: 'HakoLanding.listYourSpace.title' })
    ).toBeInTheDocument();
    expect(screen.getByText('HakoLanding.listYourSpace.cta')).toBeInTheDocument();
  });

  it('HakoFooter renders explore and company columns', () => {
    render(<HakoFooter />);
    expect(screen.getByText('HakoLanding.footer.copyright')).toBeInTheDocument();
    expect(screen.getByText('HakoLanding.footer.explore')).toBeInTheDocument();
    expect(screen.getByText('HakoLanding.footer.company')).toBeInTheDocument();
  });
});
