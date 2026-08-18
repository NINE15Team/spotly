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

  it('hides hours field for monthly storage', async () => {
    const user = userEvent.setup();
    render(<SectionHero onSearch={() => {}} />);

    expect(screen.getByLabelText('HakoLanding.hero.hours')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'HakoLanding.hero.monthlyStorage' }));
    expect(screen.queryByLabelText('HakoLanding.hero.hours')).not.toBeInTheDocument();
  });

  it('calls onSearch with the active listing mode when Search is clicked', async () => {
    const user = userEvent.setup();
    const onSearch = jest.fn();
    render(<SectionHero onSearch={onSearch} />);

    await user.click(screen.getByRole('button', { name: 'HakoLanding.hero.search' }));
    expect(onSearch).toHaveBeenCalledWith(expect.objectContaining({ mode: 'day-parking' }));
  });

  it('exposes an editable location field', async () => {
    render(<SectionHero onSearch={() => {}} locationLabel="Oakland" />);

    expect(await screen.findByDisplayValue('Oakland')).toBeInTheDocument();
  });

  it('opens a date picker and hours selector instead of plain text inputs', () => {
    render(<SectionHero onSearch={() => {}} />);

    const date = screen.getByLabelText('HakoLanding.hero.date');
    expect(date).toHaveAttribute('type', 'date');

    const hours = screen.getByLabelText('HakoLanding.hero.hours');
    expect(hours.tagName).toBe('SELECT');
    expect(hours).toHaveValue('3');
  });
});
