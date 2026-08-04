import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../../../util/testHelpers';
import TopbarDesktop from './TopbarDesktop';

const { screen } = testingLibrary;

const baseProps = {
  intl: {
    formatMessage: ({ id }, values) => (values ? `${id}:${JSON.stringify(values)}` : id),
  },
  config: {
    marketplaceName: 'Hako',
    topbar: {},
    search: { mainSearch: { searchType: 'keywords' } },
  },
  currentPage: 'LandingPage',
  currentUser: null,
  isAuthenticated: false,
  notificationCount: 0,
  onLogout: jest.fn(),
  onSearchSubmit: jest.fn(),
  initialSearchFormValues: {},
  showSearchForm: true,
  showCreateListingsLink: true,
  inboxTab: 'orders',
  customLinks: [],
};

describe('TopbarDesktop Hako header', () => {
  it('renders Figma nav links and auth actions for logged-out users', () => {
    render(<TopbarDesktop {...baseProps} />);

    expect(screen.getByRole('link', { name: /hako/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'TopbarDesktop.dayParking' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'TopbarDesktop.monthlyStorage' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'TopbarDesktop.postListing' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'TopbarDesktop.aboutUs' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'TopbarDesktop.faq' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'TopbarDesktop.becomeAHost' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'TopbarDesktop.login' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'TopbarDesktop.signup' })).toBeInTheDocument();
    expect(screen.getByTestId('keyword-search')).toBeInTheDocument();
  });

  it('marks Day Parking as the active nav item on the landing page', () => {
    render(<TopbarDesktop {...baseProps} />);
    const dayParking = screen.getByRole('link', { name: 'TopbarDesktop.dayParking' });
    expect(dayParking.className).toMatch(/navLinkActive/);
  });

  it('uses a compact search field with Hako placeholder copy', () => {
    render(<TopbarDesktop {...baseProps} />);
    const input = screen.getByTestId('keyword-search');
    expect(input).toHaveAttribute('placeholder', 'TopbarSearchForm.placeholder');
  });
});
