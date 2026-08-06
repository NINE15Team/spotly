import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';

import { LandingPageComponent } from './LandingPage';

const { waitFor } = testingLibrary;

describe('LandingPage', () => {
  it('renders the Fallback page on error', async () => {
    const errorMessage = 'LandingPage failed';
    let e = new Error(errorMessage);
    e.type = 'error';
    e.name = 'Test';

    const { getByText } = render(
      <LandingPageComponent pageAssetsData={null} inProgress={false} error={e} />
    );

    await waitFor(() => {
      expect(getByText('Oops, something went wrong!')).toBeInTheDocument();
      expect(getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('renders the Hako homepage when there is no error', async () => {
    const { getByRole } = render(
      <LandingPageComponent pageAssetsData={null} inProgress={false} error={null} />
    );

    await waitFor(() => {
      expect(getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(getByRole('heading', { name: 'HakoLanding.howItWorks.title' })).toBeInTheDocument();
    });
  });
});
