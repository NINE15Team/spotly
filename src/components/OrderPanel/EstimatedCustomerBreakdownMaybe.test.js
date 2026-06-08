import React from 'react';
import '@testing-library/jest-dom';
import Decimal from 'decimal.js';

import { types as sdkTypes } from '../../util/sdkLoader';
import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';

import EstimatedCustomerBreakdownMaybe from './EstimatedCustomerBreakdownMaybe';

const { Money } = sdkTypes;
const { screen } = testingLibrary;

const subscriptionLineItems = [
  {
    code: 'line-item/day',
    includeFor: ['customer', 'provider'],
    quantity: new Decimal(1),
    unitPrice: new Money(920, 'USD'),
    lineTotal: new Money(920, 'USD'),
    reversal: false,
  },
];

const baseProps = {
  lineItems: subscriptionLineItems,
  timeZone: 'Etc/UTC',
  currency: 'USD',
  marketplaceName: 'MarketplaceX',
  processName: 'subscription-rental',
};

describe('EstimatedCustomerBreakdownMaybe (subscription)', () => {
  it('renders the breakdown when startDate/endDate are provided', () => {
    render(
      <EstimatedCustomerBreakdownMaybe
        {...baseProps}
        breakdownData={{ startDate: new Date(2026, 5, 8), endDate: new Date(2026, 6, 1) }}
      />
    );

    expect(screen.getByText('OrderBreakdown.baseUnitSubscription')).toBeInTheDocument();
    expect(screen.getByText('OrderBreakdown.total')).toBeInTheDocument();
  });

  it('also renders when only bookingStart/bookingEnd are provided (regression for the empty-breakdown bug)', () => {
    render(
      <EstimatedCustomerBreakdownMaybe
        {...baseProps}
        breakdownData={{ bookingStart: new Date(2026, 5, 8), bookingEnd: new Date(2026, 6, 1) }}
      />
    );

    expect(screen.getByText('OrderBreakdown.baseUnitSubscription')).toBeInTheDocument();
  });

  it('renders nothing when required booking dates are missing for a day-based unit', () => {
    render(<EstimatedCustomerBreakdownMaybe {...baseProps} breakdownData={{}} />);

    expect(screen.queryByText('OrderBreakdown.baseUnitSubscription')).not.toBeInTheDocument();
    expect(screen.queryByText('OrderBreakdown.total')).not.toBeInTheDocument();
  });
});
