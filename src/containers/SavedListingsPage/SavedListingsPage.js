import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { FormattedMessage } from '../../util/reactIntl';
import { useConfiguration } from '../../context/configurationContext';
import { getListingsById } from '../../ducks/marketplaceData.duck';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import {
  SAVED_LISTINGS_CHANGED,
  getSavedListingIds,
} from '../../util/hakoSavedListings';

import { H1, Page, LayoutSingleColumn, NamedLink, IconSpinner } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';
import HakoSearchListingCard from '../SearchPage/HakoSearchListingCard/HakoSearchListingCard';

import { fetchSavedListings } from './SavedListingsPage.duck';
import css from './SavedListingsPage.module.css';

/**
 * Listings the user has saved with the heart control.
 *
 * Saved ids live in localStorage, so this page is device-local and needs no login.
 * It reads the ids after mount (localStorage does not exist during SSR) and then
 * fetches those listings.
 */
export const SavedListingsPage = () => {
  const dispatch = useDispatch();
  const config = useConfiguration();

  const { listingIds, fetchInProgress, fetchError, hasLoaded } = useSelector(
    state => state.SavedListingsPage
  );
  const listings = useSelector(state => getListingsById(state, listingIds));
  const scrollingDisabled = useSelector(isScrollingDisabled);

  // Ids read from storage — separate from the fetched listings, so that
  // un-saving on this page can update the list without a refetch.
  const [savedIds, setSavedIds] = useState(null);

  useEffect(() => {
    const sync = () => setSavedIds(getSavedListingIds());
    sync();
    // Keep in step with the heart being toggled here or in another tab.
    window.addEventListener('storage', sync);
    window.addEventListener(SAVED_LISTINGS_CHANGED, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(SAVED_LISTINGS_CHANGED, sync);
    };
  }, []);

  useEffect(() => {
    if (savedIds !== null) {
      dispatch(fetchSavedListings({ listingIds: savedIds, config }));
    }
    // config is stable for the lifetime of the page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, savedIds]);

  // Only show listings that are still saved, in the order they were saved.
  const visibleListings =
    savedIds === null
      ? []
      : savedIds
          .map(id => listings.find(l => l.id?.uuid === id))
          .filter(Boolean);

  const isLoading = savedIds === null || (fetchInProgress && !hasLoaded);
  const isEmpty = !isLoading && !fetchError && visibleListings.length === 0;

  return (
    <Page
      title="Saved spots"
      scrollingDisabled={scrollingDisabled}
      description="Spots you have saved on this device."
    >
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <div className={css.root}>
          <header className={css.header}>
            <H1 className={css.title}>
              <FormattedMessage id="SavedListingsPage.title" defaultMessage="Saved spots" />
            </H1>
            {!isLoading && !isEmpty ? (
              <p className={css.count}>
                <FormattedMessage
                  id="SavedListingsPage.count"
                  defaultMessage="{count, plural, one {# saved spot} other {# saved spots}}"
                  values={{ count: visibleListings.length }}
                />
              </p>
            ) : null}
          </header>

          {isLoading ? (
            <div className={css.stateBlock}>
              <IconSpinner />
            </div>
          ) : fetchError ? (
            <div className={css.stateBlock}>
              <p className={css.stateText}>
                <FormattedMessage
                  id="SavedListingsPage.error"
                  defaultMessage="We couldn't load your saved spots. Please try again."
                />
              </p>
            </div>
          ) : isEmpty ? (
            <div className={css.stateBlock}>
              <p className={css.stateText}>
                <FormattedMessage
                  id="SavedListingsPage.empty"
                  defaultMessage="You haven't saved any spots yet. Tap the heart on a listing to save it here."
                />
              </p>
              <NamedLink name="SearchPage" className={css.browseLink}>
                <FormattedMessage
                  id="SavedListingsPage.browse"
                  defaultMessage="Browse spots"
                />
              </NamedLink>
            </div>
          ) : (
            <div className={css.list}>
              {visibleListings.map(listing => (
                <HakoSearchListingCard key={listing.id.uuid} listing={listing} />
              ))}
            </div>
          )}

          {!isLoading && !isEmpty ? (
            <p className={css.deviceNote}>
              <FormattedMessage
                id="SavedListingsPage.deviceNote"
                defaultMessage="Saved spots are stored on this device and this browser only."
              />
            </p>
          ) : null}
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

export default SavedListingsPage;
