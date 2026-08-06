import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../../../util/testHelpers';

import { SectionHowItWorks } from './SectionHowItWorks';

const { screen } = testingLibrary;

describe('SectionHowItWorks', () => {
  it('renders the section heading and subtitle message ids', () => {
    render(<SectionHowItWorks />);

    expect(
      screen.getByRole('heading', { name: 'HakoLanding.howItWorks.title' })
    ).toBeInTheDocument();
    expect(screen.getByText('HakoLanding.howItWorks.subtitle')).toBeInTheDocument();
  });

  it('renders three numbered step cards with title message ids', () => {
    render(<SectionHowItWorks />);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('HakoLanding.howItWorks.step1Title')).toBeInTheDocument();
    expect(screen.getByText('HakoLanding.howItWorks.step2Title')).toBeInTheDocument();
    expect(screen.getByText('HakoLanding.howItWorks.step3Title')).toBeInTheDocument();
  });

  it('exposes a landmark region for accessibility', () => {
    render(<SectionHowItWorks />);
    expect(
      screen.getByRole('region', { name: 'HakoLanding.howItWorks.title' })
    ).toBeInTheDocument();
  });
});
