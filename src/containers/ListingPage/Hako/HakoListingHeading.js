import React from 'react';
import classNames from 'classnames';
import { FormattedMessage } from '../../../util/reactIntl';

import css from './HakoListingSections.module.css';

/**
 * Title, location, rating, and Like/Share actions for Hako listing details.
 * Desktop: icon actions beside title. Mobile: labeled Like/Share row below rating.
 */
export const HakoListingHeading = props => {
  const {
    title,
    subtitle,
    locationLabel,
    priceLabel,
    className,
    onShare,
  } = props;

  const handleShare = () => {
    if (typeof onShare === 'function') {
      onShare();
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title, url: window.location.href }).catch(() => {});
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
    }
  };

  const shareIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="18" cy="19" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8.5 10.5l7-4M8.5 13.5l7 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );

  return (
    <header className={classNames(css.heading, className)}>
      <div className={css.headingMain}>
        <div className={css.headingText}>
          <h1 className={css.title}>{title}</h1>
          {subtitle ? <p className={css.subtitle}>{subtitle}</p> : null}
          {priceLabel ? <p className={css.priceLabel}>{priceLabel}</p> : null}
          {locationLabel ? <p className={css.location}>{locationLabel}</p> : null}
        </div>
        <div className={css.headingActionsDesktop}>
          <button
            type="button"
            className={css.iconButton}
            aria-label="Share listing"
            onClick={handleShare}
          >
            {shareIcon}
          </button>
        </div>
      </div>

      <div className={css.headingActionsMobile}>
        <button type="button" className={css.actionButton} onClick={handleShare}>
          {shareIcon}
          <FormattedMessage id="HakoListing.share" defaultMessage="Share" />
        </button>
      </div>
    </header>
  );
};

export default HakoListingHeading;
