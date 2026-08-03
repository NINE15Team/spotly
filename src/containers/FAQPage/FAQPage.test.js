import React from 'react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';
import { FAQPageComponent } from './FAQPage';

const { screen } = testingLibrary;

describe('FAQPage', () => {
  it('renders hero and section headings from Figma', () => {
    render(<FAQPageComponent />);
    expect(screen.getByRole('heading', { level: 1, name: 'FAQ' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'For Drivers' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'For Hosts' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Billing & Account' })).toBeInTheDocument();
  });

  it('renders Figma FAQ questions and toggles an answer', async () => {
    const user = userEvent.setup();
    render(<FAQPageComponent />);

    const question = screen.getByRole('button', {
      name: 'How do I find and book a parking space?',
    });
    expect(question).toHaveAttribute('aria-expanded', 'false');

    await user.click(question);
    expect(question).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/use search to enter your destination/i)).toBeInTheDocument();
  });

  it('renders the support CTA from Figma', () => {
    render(<FAQPageComponent />);
    expect(screen.getByText('Still have questions?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /contact us/i })).toBeInTheDocument();
  });
});
