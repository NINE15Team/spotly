import React from 'react';
import '@testing-library/jest-dom';

import { renderWithProviders as render, testingLibrary } from '../../../util/testHelpers';

import HakoSearchBar from './HakoSearchBar';
import HakoPriceByToggle from '../HakoPriceByToggle';

const { screen, userEvent, waitFor } = testingLibrary;

const searchBarMessages = {
  'HakoSearchBar.dayParking': 'Day Parking',
  'HakoSearchBar.monthlyStorage': 'Monthly Storage',
  'HakoSearchBar.update': 'Update',
  'HakoSearchBar.search': 'Search',
  'HakoSearchBar.locationPlaceholder': 'Any city/region',
  'HakoSearchBar.date': 'Date',
  'HakoSearchBar.startDate': 'Start date',
  'HakoSearchBar.duration': 'Duration',
  'HakoSearchBar.durationPlaceholder': 'Duration',
  'HakoSearchBar.hoursOption': '{count, plural, one {# hour} other {# hours}}',
};

describe('HakoSearchBar', () => {
  it('renders parking option, location, date picker and duration select for day parking', async () => {
    render(<HakoSearchBar />, {
      messages: searchBarMessages,
    });

    expect(screen.getByLabelText('Search filters')).toBeInTheDocument();
    expect(await screen.findByPlaceholderText('Any city/region')).toBeInTheDocument();

    const dateInput = screen.getByLabelText('Date');
    expect(dateInput).toHaveAttribute('type', 'date');
    expect(dateInput.tagName).toBe('INPUT');

    const durationSelect = screen.getByLabelText('Duration');
    expect(durationSelect.tagName).toBe('SELECT');
    expect(screen.getByText('Update')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('shows start date and hides duration for monthly storage', async () => {
    render(<HakoSearchBar initialValues={{ parkingOption: 'monthly-storage' }} />, {
      messages: searchBarMessages,
    });

    expect(screen.getByText('Monthly Storage')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByLabelText('Start date')).toHaveAttribute('type', 'date');
    });
    expect(screen.queryByLabelText('Duration')).not.toBeInTheDocument();
  });

  it('calls onSubmit with parking option', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    render(<HakoSearchBar onSubmit={onSubmit} />, {
      messages: searchBarMessages,
    });

    await screen.findByPlaceholderText('Any city/region');
    await user.click(screen.getByText('Update').closest('button'));

    expect(onSubmit).toHaveBeenCalled();
    expect(onSubmit.mock.calls[0][0].parkingOption).toBe('day-parking');
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
