import React, { useEffect, useState } from 'react';
import classNames from 'classnames';
import { FormattedMessage, useIntl } from '../../../util/reactIntl';

import {
  SAVED_LISTINGS_CHANGED,
  isListingSaved,
  toggleSavedListing,
} from '../../../util/hakoSavedListings';

import css from './HakoListingSections.module.css';

/**
 * Title, location, and Save/Share actions for Hako listing details.
 * Desktop: icon actions beside title. Mobile: labeled row below.
 */
export const HakoListingHeading = props => {
  const { title, subtitle, locationLabel, priceLabel, className, listingId, onShare } = props;
  const intl = useIntl();

  // Resolved after mount: localStorage is not available during SSR, and reading
  // it while rendering would make the server and client markup disagree.
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!listingId) {
      return undefined;
    }
    setIsSaved(isListingSaved(listingId));

    const sync = () => setIsSaved(isListingSaved(listingId));
    // 'storage' covers other tabs; the custom event covers this document.
    window.addEventListener('storage', sync);
    window.addEventListener(SAVED_LISTINGS_CHANGED, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(SAVED_LISTINGS_CHANGED, sync);
    };
  }, [listingId]);

  const handleToggleSave = () => {
    if (!listingId) {
      return;
    }
    setIsSaved(toggleSavedListing(listingId));
  };

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

  const saveLabel = intl.formatMessage(
    isSaved
      ? { id: 'HakoListing.unsaveListing', defaultMessage: 'Remove from saved listings' }
      : { id: 'HakoListing.saveListing', defaultMessage: 'Save listing' }
  );

  const heartIcon = (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={isSaved ? 'currentColor' : 'none'}
      aria-hidden="true"
    >
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

  const saveButtonClasses = classNames(css.iconButton, { [css.iconButtonActive]: isSaved });

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
          {listingId ? (
            <button
              type="button"
              className={saveButtonClasses}
              aria-label={saveLabel}
              aria-pressed={isSaved}
              onClick={handleToggleSave}
            >
              {heartIcon}
            </button>
          ) : null}
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
        {listingId ? (
          <button
            type="button"
            className={classNames(css.actionButton, { [css.actionButtonActive]: isSaved })}
            aria-pressed={isSaved}
            onClick={handleToggleSave}
          >
            {heartIcon}
            {isSaved ? (
              <FormattedMessage id="HakoListing.saved" defaultMessage="Saved" />
            ) : (
              <FormattedMessage id="HakoListing.save" defaultMessage="Save" />
            )}
          </button>
        ) : null}
        <button type="button" className={css.actionButton} onClick={handleShare}>
          {shareIcon}
          <FormattedMessage id="HakoListing.share" defaultMessage="Share" />
        </button>
      </div>
    </header>
  );
};

export default HakoListingHeading;
