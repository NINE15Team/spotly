import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../../util/testHelpers';
import { HakoLandingPage } from './HakoLandingPage';

const { waitFor, screen, userEvent } = testingLibrary;

const mockPush = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({ push: mockPush }),
}));

describe('HakoLandingPage', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  // Regression: H-03 — hero date/hours were dropped when navigating to search results.
  it('carries the hero date and hours into the search URL for day parking', async () => {
    const user = userEvent.setup();
    render(<HakoLandingPage />);

    const dateInput = await screen.findByLabelText('HakoLanding.hero.date');
    const hoursSelect = screen.getByLabelText('HakoLanding.hero.hours');

    // Use a date safely in the future so it is accepted regardless of today's date.
    const future = new Date();
    future.setDate(future.getDate() + 10);
    const yyyy = future.getFullYear();
    const mm = `${future.getMonth() + 1}`.padStart(2, '0');
    const dd = `${future.getDate()}`.padStart(2, '0');
    const dateISO = `${yyyy}-${mm}-${dd}`;

    await user.clear(dateInput);
    await user.type(dateInput, dateISO);
    await user.selectOptions(hoursSelect, '5');
    await user.click(screen.getByRole('button', { name: 'HakoLanding.hero.search' }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    const url = mockPush.mock.calls[0][0];
    expect(url).toMatch(/pub_listingType=[^&]*day-parking/);
    expect(url).toContain(`dates=${dateISO}%2C${dateISO}`);
    expect(url).toContain('duration=5');
  });

  it('omits duration for monthly storage but keeps the start date', async () => {
    const user = userEvent.setup();
    render(<HakoLandingPage />);

    await user.click(
      await screen.findByRole('button', { name: 'HakoLanding.hero.monthlyStorage' })
    );
    await user.click(screen.getByRole('button', { name: 'HakoLanding.hero.search' }));

    expect(mockPush).toHaveBeenCalledTimes(1);
    const url = mockPush.mock.calls[0][0];
    expect(url).toMatch(/pub_listingType=[^&]*monthly-storage/);
    expect(url).toMatch(/dates=\d{4}-\d{2}-\d{2}%2C\d{4}-\d{2}-\d{2}/);
    expect(url).not.toContain('duration=');
  });

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
