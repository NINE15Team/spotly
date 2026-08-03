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
      expect(getByRole('heading', { name: 'HakoLanding.featured.title' })).toBeInTheDocument();
      expect(getByRole('heading', { name: 'HakoLanding.explore.title' })).toBeInTheDocument();
      expect(getByRole('heading', { name: 'HakoLanding.reviews.title' })).toBeInTheDocument();
      expect(getByRole('heading', { name: 'HakoLanding.listYourSpace.title' })).toBeInTheDocument();
      expect(getByText('HakoLanding.footer.copyright')).toBeInTheDocument();
      expect(getAllByText(/Bayview Parkade Stall/i).length).toBeGreaterThanOrEqual(1);
    });
  });
});
