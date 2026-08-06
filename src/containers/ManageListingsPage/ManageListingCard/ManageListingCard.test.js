import React from 'react';
import '@testing-library/jest-dom';

import { types as sdkTypes } from '../../../util/sdkLoader';
import {
  getHostedConfiguration,
  renderWithProviders as render,
  testingLibrary,
} from '../../../util/testHelpers';
import { createOwnListing, createStock, fakeIntl } from '../../../util/testData';
import { LISTING_STATE_CLOSED, LISTING_STATE_DRAFT, LISTING_STATE_PENDING_APPROVAL } from '../../../util/types';

import { ManageListingCard } from './ManageListingCard';

const { Money } = sdkTypes;
const noop = () => null;

const getConfig = listingTypes => {
  const hostedConfig = getHostedConfiguration();
  return {
    ...hostedConfig,
    listingTypes: {
      listingTypes,
    },
  };
};

const bookingType = {
  id: 'daily-booking',
  transactionProcess: {
    name: 'default-booking',
    alias: 'default-booking/release-1',
  },
  unitType: 'day',
};

const purchaseType = {
  id: 'sell-bicycles',
  transactionProcess: {
    name: 'default-purchase',
    alias: 'default-purchase/release-1',
  },
  unitType: 'item',
  stockType: 'multipleItems',
};

describe('ManageListingCard (Hako)', () => {
  it('renders published booking listing with Edit and Availability', () => {
    const listing = createOwnListing('listing-day', {
      title: 'Bayview Parkade Stall',
      price: new Money(20000, 'USD'),
      publicData: {
        listingType: 'daily-booking',
        transactionProcessAlias: 'default-booking/release-1',
        unitType: 'day',
      },
    });

    const { getByText, getByRole } = render(
      <ManageListingCard
        listing={listing}
        intl={fakeIntl}
        onCloseListing={noop}
        onOpenListing={noop}
        onDiscardDraft={noop}
        hasClosingError={false}
        hasOpeningError={false}
        hasDiscardingError={false}
      />,
      { config: getConfig([bookingType]) }
    );

    expect(getByText('Bayview Parkade Stall')).toBeInTheDocument();
    expect(getByText('ManageListingCard.statusActive')).toBeInTheDocument();
    expect(getByRole('link', { name: 'ManageListingCard.editListingShort' })).toBeInTheDocument();
    expect(getByRole('link', { name: 'ManageListingCard.availabilityShort' })).toBeInTheDocument();
    expect(getByText('ManageListingCard.views')).toBeInTheDocument();
  });

  it('renders draft listing with Finish Listing and Discard', () => {
    const listing = createOwnListing('listing-draft', {
      title: 'Test',
      state: LISTING_STATE_DRAFT,
      price: new Money(18000, 'USD'),
      publicData: {
        listingType: 'daily-booking',
        transactionProcessAlias: 'default-booking/release-1',
        unitType: 'day',
      },
    });

    const { getByText, getByRole } = render(
      <ManageListingCard
        listing={listing}
        intl={fakeIntl}
        onCloseListing={noop}
        onOpenListing={noop}
        onDiscardDraft={noop}
        hasClosingError={false}
        hasOpeningError={false}
        hasDiscardingError={false}
      />,
      { config: getConfig([bookingType]) }
    );

    expect(getByText('Test')).toBeInTheDocument();
    expect(getByText('ManageListingCard.statusDraft')).toBeInTheDocument();
    expect(getByRole('link', { name: 'ManageListingCard.finishListingDraft' })).toBeInTheDocument();
    expect(getByRole('button', { name: 'ManageListingCard.discard' })).toBeInTheDocument();
  });

  it('renders closed listing as Paused with Open listing', () => {
    const listing = createOwnListing('listing-closed', {
      title: 'Paused spot',
      state: LISTING_STATE_CLOSED,
      price: new Money(10000, 'USD'),
      publicData: {
        listingType: 'daily-booking',
        transactionProcessAlias: 'default-booking/release-1',
        unitType: 'day',
      },
    });

    const { getByText, getByRole } = render(
      <ManageListingCard
        listing={listing}
        intl={fakeIntl}
        onCloseListing={noop}
        onOpenListing={noop}
        onDiscardDraft={noop}
        hasClosingError={false}
        hasOpeningError={false}
        hasDiscardingError={false}
      />,
      { config: getConfig([bookingType]) }
    );

    expect(getByText('ManageListingCard.statusPaused')).toBeInTheDocument();
    expect(getByRole('button', { name: 'ManageListingCard.openListing' })).toBeInTheDocument();
  });

  it('renders purchase listing with Stock action', () => {
    const listing = createOwnListing(
      'listing-item',
      {
        title: 'Storage unit',
        price: new Money(5000, 'USD'),
        publicData: {
          listingType: 'sell-bicycles',
          transactionProcessAlias: 'default-purchase/release-1',
          unitType: 'item',
        },
      },
      { currentStock: createStock('stock-1', { quantity: 3 }) }
    );

    const { getByRole } = render(
      <ManageListingCard
        listing={listing}
        intl={fakeIntl}
        onCloseListing={noop}
        onOpenListing={noop}
        onDiscardDraft={noop}
        hasClosingError={false}
        hasOpeningError={false}
        hasDiscardingError={false}
      />,
      { config: getConfig([purchaseType]) }
    );

    expect(getByRole('link', { name: 'ManageListingCard.editListingShort' })).toBeInTheDocument();
    expect(getByRole('link', { name: 'ManageListingCard.manageStockShort' })).toBeInTheDocument();
  });

  it('renders pending approval badge', () => {
    const listing = createOwnListing('listing-pending', {
      title: 'Pending listing',
      state: LISTING_STATE_PENDING_APPROVAL,
      price: new Money(10000, 'USD'),
      publicData: {
        listingType: 'daily-booking',
        transactionProcessAlias: 'default-booking/release-1',
        unitType: 'day',
      },
    });

    const { getByText } = render(
      <ManageListingCard
        listing={listing}
        intl={fakeIntl}
        onCloseListing={noop}
        onOpenListing={noop}
        onDiscardDraft={noop}
        hasClosingError={false}
        hasOpeningError={false}
        hasDiscardingError={false}
      />,
      { config: getConfig([bookingType]) }
    );

    expect(getByText('ManageListingCard.statusPending')).toBeInTheDocument();
  });
});
