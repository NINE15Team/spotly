import React from 'react';
import classNames from 'classnames';
import { FormattedMessage } from '../../../util/reactIntl';
import { HAKO_ASSETS } from '../../LandingPage/Hako/assets';

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
    rating = '4.9',
    reviewCount = 42,
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

  const heartIcon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21s-6.7-4.35-9.33-7.4C.8 11.4 1.1 8.1 3.4 6.3c2-1.6 4.9-1.2 6.5.6L12 9l2.1-2.1c1.6-1.8 4.5-2.2 6.5-.6 2.3 1.8 2.6 5.1.73 7.3C18.7 16.65 12 21 12 21z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );

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
          <div className={css.ratingRow}>
            <div className={css.stars} aria-hidden="true">
              {[0, 1, 2, 3, 4].map(i => (
                <img key={i} src={HAKO_ASSETS.star} alt="" width={16} height={16} />
              ))}
            </div>
            <span className={css.ratingText}>
              {rating}{' '}
              <FormattedMessage
                id="HakoListing.reviewsCount"
                defaultMessage="({count} reviews)"
                values={{ count: reviewCount }}
              />
            </span>
          </div>
        </div>
        <div className={css.headingActionsDesktop}>
          <button type="button" className={css.iconButton} aria-label="Save listing">
            {heartIcon}
          </button>
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
        <button type="button" className={css.actionButton}>
          {heartIcon}
          <FormattedMessage id="HakoListing.like" defaultMessage="Like" />
        </button>
        <button type="button" className={css.actionButton} onClick={handleShare}>
          {shareIcon}
          <FormattedMessage id="HakoListing.share" defaultMessage="Share" />
        </button>
      </div>
    </header>
  );
};

export default HakoListingHeading;
