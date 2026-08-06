import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';
import FooterContainer from './FooterContainer';

const { screen } = testingLibrary;

describe('FooterContainer', () => {
  it('renders the Hako footer by default', () => {
    render(<FooterContainer />);
    expect(screen.getByText('HakoLanding.footer.copyright')).toBeInTheDocument();
    expect(screen.getByText('HakoLanding.footer.explore')).toBeInTheDocument();
    expect(screen.getByText('HakoLanding.footer.company')).toBeInTheDocument();
  });
});
