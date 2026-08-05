import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';
import { BecomeAHostPageComponent } from './BecomeAHostPage';

const { screen } = testingLibrary;

describe('BecomeAHostPage', () => {
  it('renders hero eyebrow, title, and mission copy', () => {
    render(<BecomeAHostPageComponent />);
    expect(screen.getByText('Turn your space into income')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Become a Host' })).toBeInTheDocument();
    expect(
      screen.getByText(/Got a driveway, garage, or empty lot sitting unused/i)
    ).toBeInTheDocument();
  });

  it('renders Hosting Made Simple cards', () => {
    render(<BecomeAHostPageComponent />);
    expect(screen.getByRole('heading', { name: 'Hosting Made Simple' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'List in Minutes' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Get Paid Reliably' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: "You're in Control" })).toBeInTheDocument();
  });

  it('renders Why Host section and Sign Up CTA', () => {
    render(<BecomeAHostPageComponent />);
    expect(screen.getByRole('heading', { name: 'Why Host with Hako' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign Up' })).toBeInTheDocument();
  });
});
