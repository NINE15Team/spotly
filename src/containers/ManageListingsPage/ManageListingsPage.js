import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { compose } from 'redux';
import { connect } from 'react-redux';
import classNames from 'classnames';

import { useRouteConfiguration } from '../../context/routeConfigurationContext';
import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { pathByRouteName } from '../../util/routes';
import { hasPermissionToPostListings, showCreateListingLinkForUser } from '../../util/userHelpers';
import { NO_ACCESS_PAGE_POST_LISTINGS } from '../../util/urlHelpers';
import { propTypes, LISTING_STATE_DRAFT, LISTING_STATE_PUBLISHED, LISTING_STATE_CLOSED } from '../../util/types';
import { isErrorNoPermissionToPostListings } from '../../util/errors';
import { isScrollingDisabled, manageDisableScrolling } from '../../ducks/ui.duck';

import {
  H1,
  Page,
  PaginationLinks,
  UserNav,
  LayoutSingleColumn,
  NamedLink,
} from '../../components';

import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';

import ManageListingCard from './ManageListingCard/ManageListingCard';

import {
  closeListing,
  openListing,
  getOwnListingsById,
  discardDraft,
} from './ManageListingsPage.duck';
import css from './ManageListingsPage.module.css';
import DiscardDraftModal from './DiscardDraftModal/DiscardDraftModal';

const FILTER_ALL = 'all';
const FILTER_ACTIVE = 'active';
const FILTER_DRAFTS = 'drafts';
const FILTER_PAUSED = 'paused';

const matchesFilter = (listing, filter) => {
  const state = listing?.attributes?.state;
  if (filter === FILTER_ACTIVE) return state === LISTING_STATE_PUBLISHED;
  if (filter === FILTER_DRAFTS) return state === LISTING_STATE_DRAFT;
  if (filter === FILTER_PAUSED) return state === LISTING_STATE_CLOSED;
  return true;
};

const sortListings = (listings, sortKey) => {
  const copy = [...listings];
  if (sortKey === 'title') {
    return copy.sort((a, b) =>
      (a.attributes?.title || '').localeCompare(b.attributes?.title || '')
    );
  }
  // recently updated (fallback: createdAt)
  return copy.sort((a, b) => {
    const aTime = new Date(a.attributes?.lastTransitionedAt || a.attributes?.createdAt || 0).getTime();
    const bTime = new Date(b.attributes?.lastTransitionedAt || b.attributes?.createdAt || 0).getTime();
    return bTime - aTime;
  });
};

const PaginationLinksMaybe = props => {
  const { listingsAreLoaded, pagination, page } = props;
  return listingsAreLoaded && pagination && pagination.totalPages > 1 ? (
    <PaginationLinks
      className={css.pagination}
      pageName="ManageListingsPage"
      pageSearchParams={{ page }}
      pagination={pagination}
    />
  ) : null;
};

/**
 * The ManageListingsPage component (Hako Your listings).
 */
export const ManageListingsPageComponent = props => {
  const [discardDraftModalOpen, setDiscardDraftModalOpen] = useState(null);
  const [discardDraftModalId, setDiscardDraftModalId] = useState(null);
  const [statusFilter, setStatusFilter] = useState(FILTER_ALL);
  const [sortKey, setSortKey] = useState('recent');
  const history = useHistory();
  const routeConfiguration = useRouteConfiguration();
  const config = useConfiguration();
  const intl = useIntl();

  const {
    currentUser,
    closingListing,
    closingListingError,
    discardingDraft,
    discardingDraftError,
    listings = [],
    onCloseListing,
    onDiscardDraft,
    onOpenListing,
    openingListing,
    openingListingError,
    pagination,
    queryInProgress,
    queryListingsError,
    queryParams,
    scrollingDisabled,
    onManageDisableScrolling,
  } = props;

  useEffect(() => {
    if (isErrorNoPermissionToPostListings(openingListingError?.error)) {
      const noAccessPagePath = pathByRouteName('NoAccessPage', routeConfiguration, {
        missingAccessRight: NO_ACCESS_PAGE_POST_LISTINGS,
      });
      history.push(noAccessPagePath);
    }
  }, [openingListingError]);

  const handleOpenListing = listingId => {
    const hasPostingRights = hasPermissionToPostListings(currentUser);

    if (!hasPostingRights) {
      const noAccessPagePath = pathByRouteName('NoAccessPage', routeConfiguration, {
        missingAccessRight: NO_ACCESS_PAGE_POST_LISTINGS,
      });
      history.push(noAccessPagePath);
    } else {
      onOpenListing(listingId);
    }
  };

  const openDiscardDraftModal = listingId => {
    setDiscardDraftModalId(listingId);
    setDiscardDraftModalOpen(true);
  };

  const handleDiscardDraft = () => {
    onDiscardDraft(discardDraftModalId);
    setDiscardDraftModalOpen(false);
    setDiscardDraftModalId(null);
  };

  const hasPaginationInfo = !!pagination && pagination.totalItems != null;
  const listingsAreLoaded = !queryInProgress && hasPaginationInfo;
  const totalItems = pagination?.totalItems || 0;

  const counts = useMemo(() => {
    return listings.reduce(
      (acc, l) => {
        const state = l?.attributes?.state;
        if (state === LISTING_STATE_PUBLISHED) acc.active += 1;
        else if (state === LISTING_STATE_DRAFT) acc.drafts += 1;
        else if (state === LISTING_STATE_CLOSED) acc.paused += 1;
        return acc;
      },
      { active: 0, drafts: 0, paused: 0 }
    );
  }, [listings]);

  const visibleListings = useMemo(() => {
    return sortListings(
      listings.filter(l => matchesFilter(l, statusFilter)),
      sortKey
    );
  }, [listings, statusFilter, sortKey]);

  const loadingResults = (
    <div className={css.messagePanel}>
      <H1 as="h2" className={css.heading}>
        <FormattedMessage id="ManageListingsPage.loadingOwnListings" />
      </H1>
    </div>
  );

  const queryError = (
    <div className={css.messagePanel}>
      <H1 as="h2" className={css.heading}>
        <FormattedMessage id="ManageListingsPage.queryError" />
      </H1>
    </div>
  );

  const closingErrorListingId = !!closingListingError && closingListingError.listingId;
  const openingErrorListingId = !!openingListingError && openingListingError.listingId;
  const discardingErrorListingId = !!discardingDraftError && discardingDraftError.listingId;

  const panelWidth = 62.5;
  const renderSizes = [
    `(max-width: 767px) 100vw`,
    `(max-width: 1920px) ${panelWidth / 2}vw`,
    `${panelWidth / 3}vw`,
  ].join(', ');

  const showManageListingsLink = showCreateListingLinkForUser(config, currentUser);
  const canCreate = showCreateListingLinkForUser(config, currentUser);

  const filters = [
    {
      id: FILTER_ALL,
      label: intl.formatMessage(
        { id: 'ManageListingsPage.filterAll', defaultMessage: 'All ({count})' },
        { count: listings.length || totalItems }
      ),
    },
    {
      id: FILTER_ACTIVE,
      label: intl.formatMessage(
        { id: 'ManageListingsPage.filterActive', defaultMessage: 'Active ({count})' },
        { count: counts.active }
      ),
    },
    {
      id: FILTER_DRAFTS,
      label: intl.formatMessage({
        id: 'ManageListingsPage.filterDraftsLabel',
        defaultMessage: 'Drafts',
      }),
      badge: counts.drafts,
    },
    {
      id: FILTER_PAUSED,
      label: intl.formatMessage({
        id: 'ManageListingsPage.filterPaused',
        defaultMessage: 'Paused',
      }),
    },
  ];

  return (
    <Page
      title={intl.formatMessage({ id: 'ManageListingsPage.title' })}
      scrollingDisabled={scrollingDisabled}
    >
      <LayoutSingleColumn
        topbar={
          <>
            <TopbarContainer />
            <UserNav
              currentPage="ManageListingsPage"
              showManageListingsLink={showManageListingsLink}
            />
          </>
        }
        footer={<FooterContainer />}
      >
        {queryInProgress ? loadingResults : null}
        {queryListingsError ? queryError : null}

        <div className={css.listingPanel}>
          <div className={css.pageHeader}>
            <div className={css.pageHeaderText}>
              <H1 className={css.heading}>
                <FormattedMessage
                  id="ManageListingsPage.hakoTitle"
                  defaultMessage="Your listings."
                />
              </H1>
              {listingsAreLoaded ? (
                <p className={css.subheading}>
                  <FormattedMessage
                    id="ManageListingsPage.youHaveListingsCaps"
                    defaultMessage="You have {count} {count, plural, one {listing} other {listings}}"
                    values={{ count: totalItems }}
                  />
                </p>
              ) : null}
            </div>
            {canCreate && listingsAreLoaded && totalItems > 0 ? (
              <NamedLink className={css.createListingDesktop} name="NewListingPage">
                <FormattedMessage
                  id="ManageListingsPage.createListingPlus"
                  defaultMessage="+ Post a New Listing"
                />
              </NamedLink>
            ) : null}
          </div>

          {listingsAreLoaded && totalItems === 0 ? (
            <div className={css.noResultsContainer}>
              <p className={css.createListingParagraph}>
                <NamedLink className={css.createListingLink} name="NewListingPage">
                  <FormattedMessage id="ManageListingsPage.createListing" />
                </NamedLink>
              </p>
            </div>
          ) : null}

          {listingsAreLoaded && totalItems > 0 ? (
            <div className={css.toolbar}>
              <div className={css.filters} role="group" aria-label="Filter listings">
                {filters.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    className={classNames(css.filterBtn, {
                      [css.filterBtnActive]: statusFilter === f.id,
                    })}
                    onClick={() => setStatusFilter(f.id)}
                    aria-pressed={statusFilter === f.id}
                  >
                    {f.label}
                    {typeof f.badge === 'number' && f.badge > 0 ? (
                      <span className={css.filterBadge}>{f.badge}</span>
                    ) : null}
                  </button>
                ))}
              </div>
              <label className={css.sort}>
                <span className={css.sortLabel}>
                  <FormattedMessage id="ManageListingsPage.sortBy" defaultMessage="Sort by:" />
                </span>
                <select
                  className={css.sortSelect}
                  value={sortKey}
                  onChange={e => setSortKey(e.target.value)}
                >
                  <option value="recent">
                    {intl.formatMessage({
                      id: 'ManageListingsPage.sortRecent',
                      defaultMessage: 'Recently updated',
                    })}
                  </option>
                  <option value="title">
                    {intl.formatMessage({
                      id: 'ManageListingsPage.sortTitle',
                      defaultMessage: 'Title',
                    })}
                  </option>
                </select>
              </label>
            </div>
          ) : null}

          <ul className={css.listingCards}>
            {visibleListings.map(l => (
              <li key={l.id.uuid} className={css.listingCard}>
                <ManageListingCard
                  listing={l}
                  actionsInProgressListingId={openingListing || closingListing || discardingDraft}
                  onCloseListing={onCloseListing}
                  onOpenListing={handleOpenListing}
                  onDiscardDraft={openDiscardDraftModal}
                  hasOpeningError={
                    !!openingErrorListingId && openingErrorListingId.uuid === l.id.uuid
                  }
                  hasClosingError={
                    !!closingErrorListingId && closingErrorListingId.uuid === l.id.uuid
                  }
                  hasDiscardingError={
                    !!discardingErrorListingId && discardingErrorListingId.uuid === l.id.uuid
                  }
                  renderSizes={renderSizes}
                />
              </li>
            ))}
          </ul>

          {canCreate && listingsAreLoaded && totalItems > 0 ? (
            <NamedLink className={css.createListingMobile} name="NewListingPage">
              <FormattedMessage
                id="ManageListingsPage.createListingPlus"
                defaultMessage="+ Post a New Listing"
              />
            </NamedLink>
          ) : null}

          {onManageDisableScrolling && discardDraftModalOpen ? (
            <DiscardDraftModal
              id="ManageListingsPage"
              isOpen={discardDraftModalOpen}
              onManageDisableScrolling={onManageDisableScrolling}
              onCloseModal={() => setDiscardDraftModalOpen(false)}
              onDiscardDraft={handleDiscardDraft}
              focusElementId={
                discardDraftModalId ? `discardButton_${discardDraftModalId.uuid}` : null
              }
            />
          ) : null}

          <PaginationLinksMaybe
            listingsAreLoaded={listingsAreLoaded}
            pagination={pagination}
            page={queryParams ? queryParams.page : 1}
          />
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

const mapStateToProps = state => {
  const { currentUser } = state.user;
  const {
    currentPageResultIds,
    pagination,
    queryInProgress,
    queryListingsError,
    queryParams,
    openingListing,
    openingListingError,
    closingListing,
    closingListingError,
    discardingDraft,
    discardingDraftError,
  } = state.ManageListingsPage;
  const listings = getOwnListingsById(state, currentPageResultIds);
  return {
    currentUser,
    currentPageResultIds,
    listings,
    pagination,
    queryInProgress,
    queryListingsError,
    queryParams,
    scrollingDisabled: isScrollingDisabled(state),
    openingListing,
    openingListingError,
    closingListing,
    closingListingError,
    discardingDraft,
    discardingDraftError,
  };
};

const mapDispatchToProps = dispatch => ({
  onCloseListing: listingId => dispatch(closeListing(listingId)),
  onOpenListing: listingId => dispatch(openListing(listingId)),
  onDiscardDraft: listingId => dispatch(discardDraft(listingId)),
  onManageDisableScrolling: (componentId, disableScrolling) =>
    dispatch(manageDisableScrolling(componentId, disableScrolling)),
});

const ManageListingsPage = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(ManageListingsPageComponent);

export default ManageListingsPage;
