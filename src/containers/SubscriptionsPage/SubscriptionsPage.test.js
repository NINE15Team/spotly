import React from 'react';
import '@testing-library/jest-dom';

import { types as sdkTypes } from '../../util/sdkLoader';
import { createCurrentUser, fakeIntl } from '../../util/testData';
import { renderWithProviders as render, testingLibrary } from '../../util/testHelpers';

import { SubscriptionsPageComponent } from './SubscriptionsPage';

// The Topbar/Footer are Redux-connected containers irrelevant to the subscription list,
// so stub them out to keep the render light and store-independent.
jest.mock('../TopbarContainer/TopbarContainer', () => () => null);
jest.mock('../FooterContainer/FooterContainer', () => () => null);

const { Money } = sdkTypes;
const { screen, userEvent } = testingLibrary;

const makeListing = (id, title) => ({
  id: { uuid: id },
  type: 'listing',
  attributes: { title },
});

const makeTransaction = (id, lastTransition, listing, payinTotal) => ({
  id: { uuid: id },
  type: 'transaction',
  attributes: { lastTransition, payinTotal, processName: 'subscription-rental' },
  listing,
});

const baseProps = {
  scrollingDisabled: false,
  currentUser: createCurrentUser('me'),
  fetchInProgress: false,
  fetchError: null,
  transactions: [],
  cancelInProgress: false,
  cancelError: null,
  portalInProgress: false,
  onCancelSubscription: jest.fn(),
  onOpenBillingPortal: jest.fn(),
  intl: fakeIntl,
};

describe('SubscriptionsPageComponent', () => {
  it('shows the empty state when there are no subscriptions', () => {
    render(<SubscriptionsPageComponent {...baseProps} />);
    expect(screen.getByText('SubscriptionsPage.empty')).toBeInTheDocument();
  });

  it('shows the load error', () => {
    render(
      <SubscriptionsPageComponent {...baseProps} fetchError={{ type: 'error', name: 'Error' }} />
    );
    expect(screen.getByText('SubscriptionsPage.loadError')).toBeInTheDocument();
  });

  it('renders an active subscription with manage + cancel actions', () => {
    const listing = makeListing('listing-1', 'Cozy Spot');
    const tx = makeTransaction(
      'tx-1',
      'transition/accept-subscription',
      listing,
      new Money(1500, 'USD')
    );

    render(<SubscriptionsPageComponent {...baseProps} transactions={[tx]} />);

    expect(screen.getByText('Cozy Spot')).toBeInTheDocument();
    expect(screen.getByText('SubscriptionsPage.statusActive')).toBeInTheDocument();
    expect(screen.getByText('SubscriptionsPage.viewOrder')).toBeInTheDocument();
    expect(screen.getByText('SubscriptionsPage.updatePayment')).toBeInTheDocument();
    expect(screen.getByText('SubscriptionsPage.cancel')).toBeInTheDocument();
  });

  it('formats the monthly amount when a message template is available', () => {
    const listing = makeListing('listing-1', 'Cozy Spot');
    const tx = makeTransaction(
      'tx-1',
      'transition/accept-subscription',
      listing,
      new Money(1500, 'USD')
    );

    render(<SubscriptionsPageComponent {...baseProps} transactions={[tx]} />, {
      messages: { 'SubscriptionsPage.monthlyAmount': '{amount} / month' },
    });

    expect(screen.getByText(/\$15\.00 \/ month/)).toBeInTheDocument();
  });

  it('does not show manage actions for a payment-confirmed (activating) subscription', () => {
    const listing = makeListing('listing-1', 'Cozy Spot');
    const tx = makeTransaction(
      'tx-1',
      'transition/confirm-payment',
      listing,
      new Money(1500, 'USD')
    );

    render(<SubscriptionsPageComponent {...baseProps} transactions={[tx]} />);

    expect(screen.getByText('SubscriptionsPage.statusActivating')).toBeInTheDocument();
    expect(screen.queryByText('SubscriptionsPage.cancel')).not.toBeInTheDocument();
    expect(screen.queryByText('SubscriptionsPage.updatePayment')).not.toBeInTheDocument();
  });

  it('invokes the action handlers with the transaction id', async () => {
    const user = userEvent.setup();
    const onCancelSubscription = jest.fn();
    const onOpenBillingPortal = jest.fn();
    const listing = makeListing('listing-1', 'Cozy Spot');
    const tx = makeTransaction(
      'tx-1',
      'transition/accept-subscription',
      listing,
      new Money(1500, 'USD')
    );

    render(
      <SubscriptionsPageComponent
        {...baseProps}
        transactions={[tx]}
        onCancelSubscription={onCancelSubscription}
        onOpenBillingPortal={onOpenBillingPortal}
      />
    );

    await user.click(screen.getByText('SubscriptionsPage.updatePayment'));
    await user.click(screen.getByText('SubscriptionsPage.cancel'));

    expect(onOpenBillingPortal).toHaveBeenCalledWith(tx.id);
    expect(onCancelSubscription).toHaveBeenCalledWith(tx.id);
  });
});
