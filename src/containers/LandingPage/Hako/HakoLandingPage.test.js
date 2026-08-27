import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../../util/testHelpers';
import { HakoLandingPage } from './HakoLandingPage';

const { waitFor } = testingLibrary;

describe('HakoLandingPage', () => {
  it('renders all primary homepage sections from the Figma design', async () => {
    const { getByRole, getByText, getAllByText } = render(<HakoLandingPage />);

    await waitFor(() => {
      expect(getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(getByRole('heading', { name: 'HakoLanding.howItWorks.title' })).toBeInTheDocument();
      expect(getByRole('heading', { name: 'HakoLanding.explore.title' })).toBeInTheDocument();
      expect(getByRole('heading', { name: 'HakoLanding.reviews.title' })).toBeInTheDocument();
      expect(getByRole('heading', { name: 'HakoLanding.listYourSpace.title' })).toBeInTheDocument();
      expect(getByText('HakoLanding.footer.copyright')).toBeInTheDocument();
    });
  });

  // Featured spots render from fetched listings, so they are absent here (empty
  // store) and covered by HakoSections.test.js instead.
  it('omits the featured spots section when no listings have been fetched', async () => {
    const { queryByRole } = render(<HakoLandingPage />);

    await waitFor(() => {
      expect(queryByRole('heading', { name: 'HakoLanding.featured.title' })).toBeNull();
      expect(queryByRole('heading', { name: 'HakoLanding.featured.titleInLocation' })).toBeNull();
    });
  });
});
