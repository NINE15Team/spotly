import React from 'react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';
import { ContactPageComponent } from './ContactPage';

const { screen } = testingLibrary;

describe('ContactPage', () => {
  it('renders hero and Figma form field labels', () => {
    render(<ContactPageComponent />);
    expect(screen.getByRole('heading', { level: 1, name: /contact us/i })).toBeInTheDocument();
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
});
