import React from 'react';
import classNames from 'classnames';

import { useConfiguration } from '../../../context/configurationContext';
import { useIntl, FormattedMessage } from '../../../util/reactIntl';
import { formatMoney } from '../../../util/currency';
import { createSlug } from '../../../util/urlHelpers';
import { requireListingImage } from '../../../util/configHelpers';
import { NamedLink, ResponsiveImage, AspectRatioWrapper } from '../../../components';
import { HAKO_ASSETS } from '../../LandingPage/Hako/assets';

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
  const {
    aspectWidth = 1,
    aspectHeight = 1,
    variantPrefix = 'listing-card',
  } = config.layout.listingImage;
  const variants = firstImage
    ? Object.keys(firstImage?.attributes?.variants || {}).filter(k => k.startsWith(variantPrefix))
    : [];

  const locationLabel =
    publicData?.location?.address ||
    publicData?.neighborhood ||
    publicData?.city ||
    '';

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
  if (tags.length === 0) {
    tags.push('Covered', 'EV');
  }

  const rating =
    listing?.attributes?.metadata?.rating ||
    publicData?.rating ||
    listing?.attributes?.publicData?.reviewsAverage ||
    '4.9';
  const reviewCount =
    listing?.attributes?.metadata?.reviewsTotal || publicData?.reviewsTotal || '42';

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
          <AspectRatioWrapper width={aspectWidth} height={aspectHeight} className={css.aspect}>
            <ResponsiveImage
              rootClassName={css.image}
              alt={title}
              image={firstImage}
              variants={variants}
              sizes="200px"
            />
          </AspectRatioWrapper>
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
          <div className={css.rating}>
            <div className={css.stars} aria-hidden="true">
              {[0, 1, 2, 3, 4].map(i => (
                <img
                  key={i}
                  className={css.star}
                  src={HAKO_ASSETS.star}
                  alt=""
                  width={15}
                  height={15}
                />
              ))}
            </div>
            <span className={css.ratingText}>
              {rating}{' '}
              <FormattedMessage
                id="HakoSearchListingCard.reviews"
                defaultMessage="({count} reviews)"
                values={{ count: reviewCount }}
              />
            </span>
          </div>
        </div>
      </div>
    </NamedLink>
  );
};

export default HakoSearchListingCard;
