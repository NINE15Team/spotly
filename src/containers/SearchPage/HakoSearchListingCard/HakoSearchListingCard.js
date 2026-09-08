import React from 'react';
import classNames from 'classnames';

import { useConfiguration } from '../../../context/configurationContext';
import { useIntl } from '../../../util/reactIntl';
import { formatMoney } from '../../../util/currency';
import { createSlug } from '../../../util/urlHelpers';
import { requireListingImage } from '../../../util/configHelpers';
import { NamedLink, ResponsiveImage } from '../../../components';
import { publicLocationLabel } from '../../../util/hakoLocation';

import css from './HakoSearchListingCard.module.css';

/**
 * Horizontal listing card for Hako Search Results (Figma search cards).
 */
export const HakoSearchListingCard = props => {
  const config = useConfiguration();
  const intl = useIntl();
  const { className, listing, setActiveListing } = props;

  if (!listing) {
    return null;
  }

  const id = listing?.id?.uuid;
  const { title = '', price, publicData } = listing?.attributes || {};
  const slug = createSlug(title);
  const { listingType } = publicData || {};
  const foundListingTypeConfig = (config.listing.listingTypes || []).find(
    conf => conf.listingType === listingType
  );
  const showListingImage = requireListingImage(foundListingTypeConfig);
  const firstImage = listing?.images?.[0] || null;
  const { variantPrefix = 'listing-card' } = config.layout?.listingImage || {};
  const variants = firstImage
    ? Object.keys(firstImage?.attributes?.variants || {}).filter(k => k.startsWith(variantPrefix))
    : [];

  // Approximate location only — exact addresses are shared after booking.
  const locationLabel = publicLocationLabel(publicData);

  // Tags come from the listing itself. There is deliberately no placeholder:
  // every card used to claim "Covered" and "EV" regardless of the real data.
  const tags = [];
  if (publicData?.spaceType) {
    tags.push(String(publicData.spaceType));
  }
  if (publicData?.amenities) {
    const amenities = Array.isArray(publicData.amenities)
      ? publicData.amenities
      : [publicData.amenities];
    amenities.slice(0, 2).forEach(a => tags.push(String(a)));
  }

  let priceLabel = null;
  if (price && price.currency === config.currency) {
    try {
      priceLabel = formatMoney(intl, price);
    } catch (e) {
      priceLabel = null;
    }
  }

  const setActivePropsMaybe = setActiveListing
    ? {
        onMouseEnter: () => setActiveListing(listing?.id),
        onMouseLeave: () => setActiveListing(null),
      }
    : null;

  return (
    <NamedLink
      className={classNames(css.root, className)}
      name="ListingPage"
      params={{ id, slug }}
      {...setActivePropsMaybe}
    >
      <div className={css.imageWrap}>
        {showListingImage && firstImage ? (
          <ResponsiveImage
            rootClassName={css.image}
            alt={title}
            image={firstImage}
            variants={variants}
            sizes="(min-width: 1200px) 200px, 100vw"
          />
        ) : (
          <div className={css.imagePlaceholder} aria-hidden="true" />
        )}
      </div>

      <div className={css.body}>
        <div className={css.topRow}>
          <div className={css.meta}>
            <h3 className={css.title}>{title}</h3>
            {locationLabel ? <p className={css.location}>{locationLabel}</p> : null}
          </div>
          {priceLabel ? <p className={css.price}>{priceLabel}</p> : null}
        </div>

        <div className={css.bottomRow}>
          <div className={css.tags}>
            {tags.slice(0, 2).map(tag => (
              <span key={tag} className={css.tag}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </NamedLink>
  );
};

export default HakoSearchListingCard;
