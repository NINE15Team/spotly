import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../util/reactIntl';

import css from './MainPanelHeader.module.css';

/**
 * MainPanelHeader component
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {React.Node} props.children - The children
 * @param {React.Node} props.sortByComponent - The sort by component
 * @param {boolean} props.isSortByActive - Whether the sort by is active
 * @param {boolean} props.listingsAreLoaded - Whether the listings are loaded
 * @param {number} props.resultsCount - The results count
 * @param {boolean} props.searchInProgress - Whether the search is in progress
 * @param {React.Node} props.noResultsInfo - The no results info
 * @param {boolean} [props.isHakoLayout] - Hako Search Results header layout
 * @returns {JSX.Element}
 */
const MainPanelHeader = props => {
  const {
    rootClassName,
    className,
    children,
    sortByComponent,
    isSortByActive,
    listingsAreLoaded,
    resultsCount,
    searchInProgress = false,
    noResultsInfo,
    isHakoLayout = false,
  } = props;

  const classes = classNames(rootClassName || css.root, className, {
    [css.hakoRoot]: isHakoLayout,
  });

  return (
    <div className={classes}>
      <div className={classNames(css.searchOptions, { [css.hakoSearchOptions]: isHakoLayout })}>
        <h1 className={classNames(css.searchResultSummary, { [css.hakoSummary]: isHakoLayout })}>
          <span className={css.resultsFound}>
            {searchInProgress ? (
              <FormattedMessage id="MainPanelHeader.loadingResults" />
            ) : isHakoLayout ? (
              <FormattedMessage
                id="MainPanelHeader.hakoFoundResults"
                defaultMessage="{count, number} {count, plural, one {SPOT MATCHES YOUR SEARCH} other {SPOTS MATCH YOUR SEARCH}}"
                values={{ count: resultsCount }}
              />
            ) : (
              <FormattedMessage
                id="MainPanelHeader.foundResults"
                values={{ count: resultsCount }}
              />
            )}
          </span>
        </h1>
        {isSortByActive ? (
          <div className={classNames(css.sortyByWrapper, { [css.hakoSortWrapper]: isHakoLayout })}>
            <span className={classNames(css.sortyBy, { [css.hakoSortLabel]: isHakoLayout })}>
              <FormattedMessage
                id={isHakoLayout ? 'MainPanelHeader.hakoSortBy' : 'MainPanelHeader.sortBy'}
                defaultMessage={isHakoLayout ? 'Sort:' : 'Sort by:'}
              />
            </span>
            {sortByComponent}
          </div>
        ) : null}
      </div>

      {children}

      {noResultsInfo ? noResultsInfo : null}
    </div>
  );
};

export default MainPanelHeader;
