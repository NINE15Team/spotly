import React, { Component, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import debounce from 'lodash/debounce';
import classNames from 'classnames';

import { isOriginInUse } from '../../util/search';
import { parse } from '../../util/urlHelpers';
import { createResourceLocatorString, pathByRouteName } from '../../util/routes';
import {
  isMonthlyListingType,
  listingTypeForSearch,
  parkingOptionFromListingType,
} from '../../util/hakoListingTypes';
import { makeGetListingsByIdSelector } from '../../ducks/marketplaceData.duck';
import { manageDisableScrolling, isScrollingDisabled } from '../../ducks/ui.duck';

import { Page } from '../../components';
import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';

import { setActiveListing } from './SearchPage.duck';
import {
  initialValues,
  validUrlQueryParamsFromProps,
  validFilterParams,
  getSearchPageResourceLocatorStringParams,
  getDerivedRenderData,
  onResetAll,
  onApplyFilters,
  createFilterValueChangeHandler,
  onSortBy,
} from './SearchPage.shared';

import FilterComponent from './FilterComponent';
import SearchMap from './SearchMap/SearchMap';
import MainPanelHeader from './MainPanelHeader/MainPanelHeader';
import SortBy from './SortBy/SortBy';
import SearchResultsPanel from './SearchResultsPanel/SearchResultsPanel';
import NoSearchResultsMaybe from './NoSearchResultsMaybe/NoSearchResultsMaybe';
import SearchPageAccessWrapper from './SearchPageAccessWrapper';
import SearchErrors from './SearchErrors';
import HakoSearchBar from './HakoSearchBar';
import HakoPriceByToggle from './HakoPriceByToggle';

import css from './SearchPage.module.css';

const SEARCH_WITH_MAP_DEBOUNCE = 300; // Little bit of debounce before search is initiated.

export class SearchPageComponent extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isMobileModalOpen: false,
      currentQueryParams: validUrlQueryParamsFromProps(props),
      priceBy: 'hour',
    };

    this.onMapMoveEnd = debounce(this.onMapMoveEnd.bind(this), SEARCH_WITH_MAP_DEBOUNCE);

    // Filter functions
    this.applyFilters = this.applyFilters.bind(this);
    this.cancelFilters = this.cancelFilters.bind(this);
    this.resetAll = this.resetAll.bind(this);
    this.getHandleChangedValueFn = this.getHandleChangedValueFn.bind(this);
    this.handleSearchBarSubmit = this.handleSearchBarSubmit.bind(this);

    // SortBy
    this.handleSortBy = this.handleSortBy.bind(this);
  }

  // Callback to determine if new search is needed
  // when map is moved by user or viewport has changed
  onMapMoveEnd(viewportBoundsChanged, data) {
    const { viewportBounds, viewportCenter } = data;
    const { params: currentPathParams } = this.props;

    const routes = this.props.routeConfiguration;
    const searchPagePath = currentPathParams.listingType
      ? pathByRouteName('SearchPageWithListingType', routes, currentPathParams)
      : pathByRouteName('SearchPage', routes);
    const currentPath =
      typeof window !== 'undefined' && window.location && window.location.pathname;

    // When using the ReusableMapContainer onMapMoveEnd can fire from other pages than SearchPage too
    const isSearchPage = currentPath === searchPagePath;

    // If mapSearch url param is given
    // or original location search is rendered once,
    // we start to react to "mapmoveend" events by generating new searches
    // (i.e. 'moveend' event in Mapbox and 'bounds_changed' in Google Maps)
    if (viewportBoundsChanged && isSearchPage) {
      const { history, location, config } = this.props;
      const { listingFields: listingFieldsConfig } = config?.listing || {};
      const { defaultFilters: defaultFiltersConfig } = config?.search || {};
      const activeListingTypes = config?.listing?.listingTypes.map(config => config.listingType);
      const listingCategories = config.categoryConfiguration.categories;
      const filterConfigs = {
        listingFieldsConfig,
        defaultFiltersConfig,
        listingCategories,
        activeListingTypes,
        currentPathParams,
      };

      // parse query parameters, including a custom attribute named category
      // when onMapMoveEnd is called, pagination needs to be reset.
      const { address, bounds, mapSearch, page, ...rest } = parse(location.search, {
        latlng: ['origin'],
        latlngBounds: ['bounds'],
      });

      const originMaybe = isOriginInUse(this.props.config) ? { origin: viewportCenter } : {};
      const dropNonFilterParams = false;

      const searchParams = {
        address,
        ...originMaybe,
        bounds: viewportBounds,
        mapSearch: true,
        ...validFilterParams(rest, filterConfigs, dropNonFilterParams),
      };

      const { routeName, pathParams } = getSearchPageResourceLocatorStringParams(routes, location);

      history.push(createResourceLocatorString(routeName, routes, pathParams, searchParams));
    }
  }

  // Apply the filters by redirecting to SearchPage with new filters.
  applyFilters() {
    const { history, routeConfiguration, config, params: currentPathParams, location } = this.props;
    onApplyFilters({
      history,
      routeConfiguration,
      config,
      location,
      currentPathParams,
      urlQueryParams: validUrlQueryParamsFromProps(this.props),
      currentQueryParams: this.state.currentQueryParams,
    });
  }

  // Close the filters by clicking cancel, revert to the initial params
  cancelFilters() {
    this.setState({ currentQueryParams: {} });
  }

  // Reset all filter query parameters
  resetAll(e) {
    const { history, routeConfiguration, config, location } = this.props;
    onResetAll({
      history,
      routeConfiguration,
      config,
      location,
      urlQueryParams: validUrlQueryParamsFromProps(this.props),
      setState: this.setState.bind(this),
    });
  }

  getHandleChangedValueFn(useHistoryPush) {
    const {
      history,
      routeConfiguration,
      config,
      location,
      params: currentPathParams = {},
    } = this.props;

    return createFilterValueChangeHandler(
      {
        history,
        routeConfiguration,
        config,
        location,
        currentPathParams,
        urlQueryParams: validUrlQueryParamsFromProps(this.props),
        setState: this.setState.bind(this),
        getState: () => this.state,
      },
      useHistoryPush
    );
  }

  handleSortBy(urlParam, values) {
    const { history, routeConfiguration, location } = this.props;
    onSortBy({
      history,
      routeConfiguration,
      location,
      urlQueryParams: validUrlQueryParamsFromProps(this.props),
      urlParam,
      values,
    });
  }

  handleSearchBarSubmit(values = {}) {
    const { history, routeConfiguration, location, config } = this.props;
    const routes = routeConfiguration;
    const { routeName, pathParams } = getSearchPageResourceLocatorStringParams(routes, location);
    const urlQueryParams = validUrlQueryParamsFromProps(this.props);
    const { listingFields: listingFieldsConfig } = config?.listing || {};
    const { defaultFilters: defaultFiltersConfig } = config?.search || {};
    const activeListingTypes = config?.listing?.listingTypes.map(c => c.listingType);
    const listingCategories = config.categoryConfiguration.categories;
    const filterConfigs = {
      listingFieldsConfig,
      defaultFiltersConfig,
      listingCategories,
      activeListingTypes,
      currentPathParams: this.props.params || {},
    };

    const locationValue = values.location;
    const selectedPlace = locationValue?.selectedPlace;
    const address =
      selectedPlace?.address ||
      (typeof locationValue === 'string' ? locationValue.trim() : locationValue?.search?.trim());
    const { origin, bounds } = selectedPlace || {};
    const originMaybe = origin && isOriginInUse(config) ? { origin } : {};
    const boundsMaybe = bounds ? { bounds } : {};
    const addressMaybe = address ? { address } : {};

    const parkingOption = values.parkingOption;
    const listingType = listingTypeForSearch(parkingOption);
    const isMonthly = isMonthlyListingType(listingType);
    const dateISO = values.date && /^\d{4}-\d{2}-\d{2}$/.test(values.date) ? values.date : null;
    const durationHours = values.duration ? String(values.duration).replace(/\D/g, '') : '';

    const searchParams = {
      ...validFilterParams(urlQueryParams, filterConfigs, false),
      ...addressMaybe,
      ...boundsMaybe,
      ...originMaybe,
      pub_listingType: listingType,
      dates: dateISO ? `${dateISO},${dateISO}` : undefined,
      duration: !isMonthly && durationHours ? durationHours : undefined,
      hours: undefined,
    };

    history.push(createResourceLocatorString(routeName, routes, pathParams, searchParams));
  }

  render() {
    const {
      intl,
      listings = [],
      location,
      pagination,
      scrollingDisabled,
      searchInProgress,
      searchListingsError,
      searchParams = {},
      activeListingId,
      onActivateListing,
      routeConfiguration,
      config,
      params: currentPathParams = {},
      currentUser,
    } = this.props;

    const {
      listingTypePathParam,
      sortConfig,
      validQueryParams,
      searchParamsInURL,
      availableFilters,
      selectedFilters,
      isValidDatesFilter,
      totalItems,
      listingsAreLoaded,
      conflictingFilterActive,
      showCreateListingsLink,
      title,
      description,
      schema,
      marketplaceCurrency,
      listingCategories,
    } = getDerivedRenderData({
      intl,
      location,
      config,
      routeConfiguration,
      searchParams,
      pagination,
      listings,
      searchInProgress,
      currentPathParams,
      currentUser,
    });

    const sortBy = mode => {
      return sortConfig.active ? (
        <SortBy
          sort={validQueryParams[sortConfig.queryParamName]}
          isConflictingFilterActive={!!conflictingFilterActive}
          hasConflictingFilters={!!(sortConfig.conflictingFilters?.length > 0)}
          selectedFilters={selectedFilters}
          onSelect={this.handleSortBy}
          showAsPopup
          mode={mode}
          labelId={`${mode}-search-page-sort-by`}
          contentPlacementOffset={-14}
        />
      ) : null;
    };
    const noResultsInfo = (
      <NoSearchResultsMaybe
        listingsAreLoaded={listingsAreLoaded}
        totalItems={totalItems}
        location={location}
        resetAll={this.resetAll}
        showCreateListingsLink={showCreateListingsLink}
      />
    );

    const { bounds, origin } = searchParamsInURL || {};
    const addressFromUrl = searchParamsInURL?.address || '';
    const listingTypeFromUrl = searchParamsInURL?.pub_listingType || '';
    const parkingOption = parkingOptionFromListingType(listingTypeFromUrl);
    const isMonthlySearch = isMonthlyListingType(parkingOption);
    const datesFromUrl = searchParamsInURL?.dates || '';
    const dateFromUrl = datesFromUrl.split(',')[0] || '';
    const durationFromUrl = searchParamsInURL?.duration || '';
    const locationInitialValue = addressFromUrl
      ? {
          search: addressFromUrl,
          selectedPlace: {
            address: addressFromUrl,
            origin,
            bounds,
          },
        }
      : null;

    const filterList = (
      <>
        <div className={css.priceBlock}>
          {!isMonthlySearch ? (
            <HakoPriceByToggle
              className={css.priceByInGroup}
              value={this.state.priceBy}
              onChange={priceBy => this.setState({ priceBy })}
            />
          ) : null}
          {availableFilters
            .filter(filterConfig => filterConfig.schemaType === 'price')
            .map(filterConfig => {
              const key = `SearchFiltersDesktop.${filterConfig.scope || 'built-in'}.${
                filterConfig.key
              }`;
              const filterId = `SearchFiltersDesktop.${filterConfig.key.toLowerCase()}`;
              return (
                <FilterComponent
                  key={key}
                  id={filterId}
                  className={classNames(css.filter, css.priceFilter)}
                  config={filterConfig}
                  containerId="SearchPageWithMap_Filters"
                  listingCategories={listingCategories}
                  marketplaceCurrency={marketplaceCurrency}
                  urlQueryParams={validQueryParams}
                  initialValues={initialValues(this.props, this.state.currentQueryParams)}
                  getHandleChangedValueFn={this.getHandleChangedValueFn}
                  intl={intl}
                  liveEdit
                  showAsPopup={false}
                  isDesktop
                  hideLabel={!isMonthlySearch}
                />
              );
            })}
        </div>
        {availableFilters
          .filter(filterConfig => filterConfig.schemaType !== 'price')
          .map(filterConfig => {
            const key = `SearchFiltersDesktop.${filterConfig.scope || 'built-in'}.${
              filterConfig.key
            }`;
            const filterId = `SearchFiltersDesktop.${filterConfig.key.toLowerCase()}`;
            return (
              <FilterComponent
                key={key}
                id={filterId}
                className={css.filter}
                config={filterConfig}
                containerId="SearchPageWithMap_Filters"
                listingCategories={listingCategories}
                marketplaceCurrency={marketplaceCurrency}
                urlQueryParams={validQueryParams}
                initialValues={initialValues(this.props, this.state.currentQueryParams)}
                getHandleChangedValueFn={this.getHandleChangedValueFn}
                intl={intl}
                liveEdit
                showAsPopup={false}
                isDesktop
              />
            );
          })}
      </>
    );

    return (
      <Page
        scrollingDisabled={scrollingDisabled}
        description={description}
        title={title}
        schema={schema}
      >
        <TopbarContainer rootClassName={css.topbar} currentSearchParams={validQueryParams} />
        <div className={css.hakoPage}>
          <HakoSearchBar
            initialValues={{
              location: locationInitialValue,
              parkingOption,
              date: dateFromUrl,
              duration: durationFromUrl,
            }}
            onSubmit={this.handleSearchBarSubmit}
          />
          <div className={css.hakoBody}>
            <aside className={css.hakoSidebar} data-testid="filterColumnAside" aria-label="Filters">
              <div className={css.hakoSidebarContent}>{filterList}</div>
            </aside>

            <div id="main-content" className={css.hakoMain} role="main">
              <div className={css.hakoMapSection} data-testid="searchMapContainer">
                <SearchMap
                  reusableContainerClassName={css.hakoMap}
                  rootClassName={css.mapRoot}
                  activeListingId={activeListingId}
                  bounds={bounds}
                  center={origin}
                  isSearchMapOpenOnMobile
                  location={location}
                  listings={listings || []}
                  onMapMoveEnd={this.onMapMoveEnd}
                  onCloseAsModal={() => {}}
                  messages={intl.messages}
                />
              </div>

              <div className={css.hakoResults}>
                <MainPanelHeader
                  className={css.hakoResultsHeader}
                  sortByComponent={sortBy('desktop')}
                  isSortByActive={sortConfig.active}
                  listingsAreLoaded={listingsAreLoaded}
                  resultsCount={totalItems}
                  searchInProgress={searchInProgress}
                  searchListingsError={searchListingsError}
                  noResultsInfo={noResultsInfo}
                  isHakoLayout
                />
                <div
                  className={classNames(css.hakoListings, {
                    [css.newSearchInProgress]: !(listingsAreLoaded || searchListingsError),
                  })}
                >
                  <SearchErrors
                    searchListingsError={searchListingsError}
                    isValidDatesFilter={isValidDatesFilter}
                  />
                  <SearchResultsPanel
                    className={css.searchListingsPanel}
                    listings={listings}
                    pagination={listingsAreLoaded ? pagination : null}
                    search={parse(location.search)}
                    setActiveListing={onActivateListing}
                    isMapVariant
                    useHakoCards
                    listingTypeParam={listingTypePathParam}
                    intl={intl}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <FooterContainer />
      </Page>
    );
  }
}

/**
 * SearchPage "container" (map layout): selects Redux state and dispatch handlers, then passes the
 * same prop surface as before to `SearchPageComponent` via `SearchPageAccessWrapper`.
 *
 * @param {Object} props - Router / route props from `routeConfiguration.js` and `Routes.js`
 * @returns {JSX.Element}
 */
const SearchPage = props => {
  const dispatch = useDispatch();
  const selectListingsById = useMemo(makeGetListingsByIdSelector, []);

  const currentUser = useSelector(state => state.user?.currentUser);
  const {
    pagination,
    searchInProgress,
    searchListingsError,
    searchParams,
    activeListingId,
  } = useSelector(state => state.SearchPage);
  const listings = useSelector(state =>
    selectListingsById(state, state.SearchPage.currentPageResultIds)
  );
  const scrollingDisabled = useSelector(state => isScrollingDisabled(state));

  const onManageDisableScrolling = useCallback(
    (componentId, disableScrolling) =>
      dispatch(manageDisableScrolling(componentId, disableScrolling)),
    [dispatch]
  );
  const onActivateListing = useCallback(listingId => dispatch(setActiveListing(listingId)), [
    dispatch,
  ]);

  return (
    <SearchPageAccessWrapper
      {...props}
      PageComponent={SearchPageComponent}
      currentUser={currentUser}
      listings={listings}
      pagination={pagination}
      scrollingDisabled={scrollingDisabled}
      searchInProgress={searchInProgress}
      searchListingsError={searchListingsError}
      searchParams={searchParams}
      activeListingId={activeListingId}
      onManageDisableScrolling={onManageDisableScrolling}
      onActivateListing={onActivateListing}
    />
  );
};

export default SearchPage;
