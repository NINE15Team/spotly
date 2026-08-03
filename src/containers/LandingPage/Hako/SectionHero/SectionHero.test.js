import React from 'react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';

import { renderWithProviders as render, testingLibrary } from '../../../../util/testHelpers';

import { SectionHero } from './SectionHero';

const { screen } = testingLibrary;

describe('SectionHero', () => {
  it('renders the Figma hero headline message ids', () => {
    render(<SectionHero onSearch={() => {}} />);

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText('HakoLanding.hero.line1')).toBeInTheDocument();
    expect(screen.getByText('HakoLanding.hero.accent')).toBeInTheDocument();
  });

  it('toggles between Day Parking and Monthly Storage', async () => {
    const user = userEvent.setup();
    render(<SectionHero onSearch={() => {}} />);

    const day = screen.getByRole('button', { name: 'HakoLanding.hero.dayParking' });
    const monthly = screen.getByRole('button', { name: 'HakoLanding.hero.monthlyStorage' });

    expect(day).toHaveAttribute('aria-pressed', 'true');
    expect(monthly).toHaveAttribute('aria-pressed', 'false');

    await user.click(monthly);
    expect(monthly).toHaveAttribute('aria-pressed', 'true');
    expect(day).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onSearch with the active listing mode when Search is clicked', async () => {
    const user = userEvent.setup();
    const onSearch = jest.fn();
    render(<SectionHero onSearch={onSearch} />);

    await user.click(screen.getByRole('button', { name: 'HakoLanding.hero.search' }));
    expect(onSearch).toHaveBeenCalledWith(expect.objectContaining({ mode: 'day-parking' }));
  });
});
