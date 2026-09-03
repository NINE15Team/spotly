import React from 'react';
import { arrayOf, bool, object } from 'prop-types';

import { FormattedMessage, useIntl } from '../../../../util/reactIntl';
import { formatMoney } from '../../../../util/currency';
import { createSlug } from '../../../../util/urlHelpers';
import { useConfiguration } from '../../../../context/configurationContext';
import { NamedLink, ResponsiveImage } from '../../../../components';
import { HAKO_ASSETS } from '../assets';
import { FEATURED_LOCATION } from '../featuredLocation';
import { publicLocationLabel } from '../../../../util/hakoLocation';
import { isSubscriptionProcessAlias } from '../../../../transactions/transaction';
import { isMonthlyListingType } from '../../../../util/hakoListingTypes';

import css from './SectionFeaturedSpots.module.css';

const FeaturedSpotCard = ({ listing }) => {
  const intl = useIntl();
  const config = useConfiguration();

  const id = listing.id?.uuid;
  const { title = '', price, publicData } = listing.attributes || {};
  const slug = createSlug(title);
  // Approximate location only — exact addresses are shared after booking.
  const locationLabel = publicLocationLabel(publicData);

  let priceLabel = null;
  if (price && price.currency === config.currency) {
    try {
      priceLabel = formatMoney(intl, price);
    } catch (e) {
      priceLabel = null;
    }
  }
  // Subscription listings are billed monthly even though unitType is "day".
  const isSubscription =
    isSubscriptionProcessAlias(publicData?.transactionProcessAlias) ||
    isMonthlyListingType(publicData?.listingType);
  const priceUnit = isSubscription
    ? intl.formatMessage({ id: 'HakoLanding.featured.perMonth', defaultMessage: '/month' })
    : publicData?.unitType
    ? `/${publicData.unitType}`
    : '';

  const firstImage = listing.images?.[0] || null;
  const { variantPrefix = 'listing-card' } = config.layout?.listingImage || {};
  const variants = firstImage
    ? Object.keys(firstImage.attributes?.variants || {}).filter(k => k.startsWith(variantPrefix))
    : [];

  return (
    <NamedLink className={css.card} name="ListingPage" params={{ id, slug }}>
      {firstImage ? (
        <ResponsiveImage
          rootClassName={css.cardImage}
          alt={title}
          image={firstImage}
          variants={variants}
          sizes="(min-width: 1024px) 33vw, 100vw"
        />
      ) : (
        <div className={css.imagePlaceholder} aria-hidden="true" />
      )}
      <div className={css.cardBody}>
        <div className={css.cardTop}>
          <div className={css.cardMeta}>
            <h3 className={css.cardTitle}>{title}</h3>
            {locationLabel ? <p className={css.cardLocation}>{locationLabel}</p> : null}
          </div>
          {priceLabel ? (
            <p className={css.price}>
              <span className={css.priceAmount}>{priceLabel}</span>
              <span>{priceUnit}</span>
            </p>
          ) : null}
        </div>
      </div>
    </NamedLink>
  );
};

/**
 * Featured spots section — Figma node 7:297.
 *
 * Renders real published listings. `isFeaturedLocation` tells us whether they
 * actually came from FEATURED_LOCATION, so the heading only names the location
 * when the listings are genuinely there.
 */
export const SectionFeaturedSpots = props => {
  const { listings = [], isFeaturedLocation = false } = props;

  // Nothing to show (e.g. the query failed) — omit the section rather than
  // rendering an empty shell.
  if (listings.length === 0) {
    return null;
  }

  const heading = isFeaturedLocation ? (
    <FormattedMessage
      id="HakoLanding.featured.titleInLocation"
      defaultMessage="Featured spots in {location}"
      values={{ location: FEATURED_LOCATION.name }}
    />
  ) : (
    <FormattedMessage id="HakoLanding.featured.title" defaultMessage="Featured spots" />
  );

  return (
    <section className={css.root} aria-labelledby="hako-featured-heading">
      <div className={css.header}>
        <div className={css.titleRow}>
          <img className={css.icon} src={HAKO_ASSETS.distance} alt="" width={35} height={35} />
          <h2 id="hako-featured-heading" className={css.heading}>
            {heading}
          </h2>
        </div>
        <NamedLink name="SearchPage" className={css.viewAll}>
          <span>
            <FormattedMessage id="HakoLanding.featured.viewAll" defaultMessage="VIEW ALL" />
          </span>
          <img
            className={css.viewAllIcon}
            src={HAKO_ASSETS.arrowRight}
            alt=""
            width={24}
            height={24}
          />
        </NamedLink>
      </div>

      <div className={css.cards}>
        {listings.map(listing => (
          <FeaturedSpotCard key={listing.id?.uuid} listing={listing} />
        ))}
      </div>
    </section>
  );
};

SectionFeaturedSpots.propTypes = {
  listings: arrayOf(object),
  isFeaturedLocation: bool,
};

export default SectionFeaturedSpots;
