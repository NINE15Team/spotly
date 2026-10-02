import React from 'react';
import '@testing-library/jest-dom';
import Decimal from 'decimal.js';

import { types as sdkTypes } from '../../../util/sdkLoader';
import { renderWithProviders as render, testingLibrary } from '../../../util/testHelpers';

import SubscriptionOrderForm from './SubscriptionOrderForm';

const { Money, UUID } = sdkTypes;
const { screen } = testingLibrary;

const lineItems = [
  {
    code: 'line-item/month',
    unitPrice: new Money(10000, 'USD'),
    quantity: new Decimal(1),
    includeFor: ['customer', 'provider'],
    lineTotal: new Money(10000, 'USD'),
    reversal: false,
  },
];

const baseProps = {
  listingId: new UUID('listing-1'),
  isOwnListing: false,
  marketplaceName: 'Spotly',
  onFetchTransactionLineItems: jest.fn(),
  lineItems,
  fetchLineItemsInProgress: false,
  fetchLineItemsError: null,
  onSubmit: jest.fn(),
  timeZone: 'Etc/UTC',
  price: new Money(10000, 'USD'),
};

const getSubmitButton = () => screen.getByRole('button', { name: /Book|loading/i });

describe('SubscriptionOrderForm', () => {
  const renderForm = (ui, options = {}) =>
    render(ui, {
      messages: {
        'SubscriptionOrderForm.activeSubscriptionWarning':
          'You already have an active subscription for this listing. {link}',
        'SubscriptionOrderForm.viewSubscription': 'View your subscription',
        'SubscriptionOrderForm.listingAlreadySubscribed': 'This listing is already booked.',
        'SubscriptionOrderForm.ctaButton': 'Book',
      },
      ...options,
    });

  it('disables Book while availability is being checked', () => {
    renderForm(
      <SubscriptionOrderForm {...baseProps} checkSubscriptionInProgress hasActiveSubscription={false} />
    );

    expect(getSubmitButton()).toBeDisabled();
  });

  it('disables Book and shows own-subscription warning with link', () => {
    renderForm(
      <SubscriptionOrderForm
        {...baseProps}
        hasActiveSubscription
        isCurrentUserSubscription
        activeSubscriptionId="tx-own"
      />
    );

    expect(screen.getByText(/already have an active subscription/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View your subscription' })).toHaveAttribute(
      'href',
      expect.stringContaining('tx-own')
    );
    expect(getSubmitButton()).toBeDisabled();
  });

  it('disables Book and shows listing-taken message without a transaction link', () => {
    renderForm(
      <SubscriptionOrderForm
        {...baseProps}
        hasActiveSubscription
        isCurrentUserSubscription={false}
        activeSubscriptionId={null}
      />
    );

    expect(screen.getByText('This listing is already booked.')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(getSubmitButton()).toBeDisabled();
  });

  it('enables Book when the listing is available', () => {
    renderForm(
      <SubscriptionOrderForm
        {...baseProps}
        hasActiveSubscription={false}
        isCurrentUserSubscription={false}
        checkSubscriptionInProgress={false}
      />
    );

    expect(screen.getByRole('button', { name: 'Book' })).not.toBeDisabled();
  });
});
