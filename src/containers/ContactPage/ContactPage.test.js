import React from 'react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';
import { ContactPageComponent, composeEnquiry } from './ContactPage';

const { screen } = testingLibrary;

describe('ContactPage', () => {
  it('renders hero and Figma form field labels', () => {
    render(<ContactPageComponent />);
    expect(screen.getByText('Support')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /contact us/i })).toBeInTheDocument();
    expect(screen.getByText(/we typically respond within 24 hours/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/subject/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
  });

  it('requires fields before submit', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<ContactPageComponent onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: /send message/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('composes a mailto handoff carrying every submitted field', () => {
    const enquiry = composeEnquiry(
      {
        name: 'Jane Doe',
        email: 'jane@example.com',
        subject: 'billing',
        message: 'My card was charged twice.',
      },
      'info@hakoparking.com'
    );

    expect(enquiry.subject).toBe('Hako enquiry: Billing & account');
    expect(enquiry.body).toContain('Name: Jane Doe');
    expect(enquiry.body).toContain('Email: jane@example.com');
    expect(enquiry.body).toContain('Subject: Billing & account');
    expect(enquiry.body).toContain('My card was charged twice.');

    expect(enquiry.href).toContain('mailto:info%40hakoparking.com');
    expect(enquiry.href).toContain(encodeURIComponent('Hako enquiry: Billing & account'));
    expect(enquiry.href).toContain(encodeURIComponent('My card was charged twice.'));
  });

  it('escapes characters that would otherwise break the mailto URL', () => {
    const enquiry = composeEnquiry(
      { name: 'A&B', email: 'a@b.com', subject: 'other', message: 'Line one\nQ? R&D #1' },
      'info@hakoparking.com'
    );

    // Raw &, ?, # and newlines inside the body would truncate the mailto.
    const query = enquiry.href.split('?')[1];
    expect(query.split('&').length).toBe(2);
    expect(query).not.toContain('#');
  });

  it('falls back to copyable text when no recipient address is configured', () => {
    const enquiry = composeEnquiry({ name: 'Jane', subject: 'other', message: 'Hi' }, '');
    expect(enquiry.href).toBeNull();
  });

  it('shows the enquiry and the copy fallback after submitting', async () => {
    const user = userEvent.setup();
    render(<ContactPageComponent />);

    await user.type(screen.getByLabelText(/your name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/email address/i), 'jane@example.com');
    await user.selectOptions(screen.getByLabelText(/subject/i), 'drivers');
    await user.type(screen.getByLabelText(/message/i), 'I cannot find my booking.');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(screen.getByRole('button', { name: /copy message/i })).toBeInTheDocument();
    expect(screen.getByText(/I cannot find my booking\./)).toBeInTheDocument();
  });
});
