import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../../util/testHelpers';

import HakoSearchBar from './HakoSearchBar';
import HakoPriceByToggle from '../HakoPriceByToggle';

const { screen, userEvent } = testingLibrary;

describe('HakoSearchBar', () => {
  it('renders parking option, location, date, duration fields and CTA', () => {
    render(<HakoSearchBar />, {
      messages: {
        'HakoSearchBar.dayParking': 'Day Parking',
        'HakoSearchBar.update': 'Update',
        'HakoSearchBar.search': 'Search',
        'HakoSearchBar.locationPlaceholder': 'Any city/region',
        'HakoSearchBar.datePlaceholder': 'Date',
        'HakoSearchBar.durationPlaceholder': 'Duration',
      },
    });

    expect(screen.getByLabelText('Search filters')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Any city/region')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Date')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Duration')).toBeInTheDocument();
    expect(screen.getByText('Update')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('calls onSubmit with field values', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<HakoSearchBar onSubmit={onSubmit} />, {
      messages: {
        'HakoSearchBar.update': 'Update',
        'HakoSearchBar.search': 'Search',
        'HakoSearchBar.locationPlaceholder': 'Any city/region',
      },
    });

    await user.type(screen.getByPlaceholderText('Any city/region'), 'San Francisco');
    await user.click(screen.getByText('Update').closest('button'));

    expect(onSubmit).toHaveBeenCalled();
    expect(onSubmit.mock.calls[0][0].location).toBe('San Francisco');
  });
});

describe('HakoPriceByToggle', () => {
  it('toggles between hour and day', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    render(<HakoPriceByToggle value="hour" onChange={onChange} />, {
      messages: {
        'HakoPriceByToggle.label': 'Price by',
        'HakoPriceByToggle.hour': 'Hour',
        'HakoPriceByToggle.day': 'Day',
      },
    });

    expect(screen.getByText('Price by')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Day' }));
    expect(onChange).toHaveBeenCalledWith('day');
  });
});
