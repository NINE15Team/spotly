import React from 'react';
import classNames from 'classnames';
import { FormattedMessage } from '../../../util/reactIntl';
import { NamedLink } from '../../../components';

import css from './HakoListingSections.module.css';

/**
 * Breadcrumb trail for Hako listing details.
 */
export const HakoBreadcrumbs = props => {
  const { title, locationLabel, className } = props;
  return (
    <nav className={classNames(css.breadcrumbs, className)} aria-label="Breadcrumb">
      <NamedLink name="SearchPage" className={css.breadcrumbLink}>
        <FormattedMessage id="HakoListing.breadcrumbSearch" defaultMessage="Search" />
      </NamedLink>
      <span className={css.breadcrumbSep} aria-hidden="true">
        {' > '}
      </span>
      {locationLabel ? (
        <>
          <span className={css.breadcrumbMuted}>{locationLabel}</span>
          <span className={css.breadcrumbSep} aria-hidden="true">
            {' > '}
          </span>
        </>
      ) : null}
      <span className={css.breadcrumbCurrent}>{title}</span>
    </nav>
  );
};

export default HakoBreadcrumbs;
