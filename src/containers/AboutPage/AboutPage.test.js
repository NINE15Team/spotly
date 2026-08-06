import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';
import { AboutPageComponent } from './AboutPage';

const { screen } = testingLibrary;

describe('AboutPage', () => {
  it('renders hero eyebrow, title, and mission copy', () => {
    render(<AboutPageComponent />);
    expect(screen.getByText('About Hako')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'What Drives Us' })).toBeInTheDocument();
    expect(
      screen.getByText(/make parking and storage simple, accessible, and community-driven/i)
    ).toBeInTheDocument();
  });

  it('renders Why We Built and Meet the Team sections', () => {
    render(<AboutPageComponent />);
    expect(screen.getByRole('heading', { name: 'Why We Built Hako' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Meet the Team' })).toBeInTheDocument();
    expect(screen.getByText(/Alpine is a premium automotive technology brand/i)).toBeInTheDocument();
  });

  it('renders value proposition cards from Figma', () => {
    render(<AboutPageComponent />);
    expect(
      screen.getByRole('heading', { name: 'Space for everyone, everywhere.' })
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Find Space Instantly' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Earn from Your Space' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Trusted Community' })).toBeInTheDocument();
  });
});
