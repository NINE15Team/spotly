import React from 'react';
import { arrayOf, shape, string } from 'prop-types';
import { FormattedMessage } from '../../../../util/reactIntl';
import { NamedLink } from '../../../../components';
import { DEFAULT_FEATURED_SPOTS, HAKO_ASSETS } from '../assets';

import css from './SectionFeaturedSpots.module.css';

const StarRow = ({ rating }) => (
  <div className={css.rating}>
    <div className={css.stars} aria-hidden="true">
      {[0, 1, 2, 3, 4].map(i => (
        <img key={i} className={css.star} src={HAKO_ASSETS.star} alt="" width={15} height={15} />
      ))}
    </div>
    <span className={css.ratingValue}>{rating}</span>
  </div>
);

/**
 * Featured spots section — Figma node 7:297
 */
export const SectionFeaturedSpots = props => {
  const { listings = DEFAULT_FEATURED_SPOTS } = props;

  return (
    <section className={css.root} aria-labelledby="hako-featured-heading">
      <div className={css.header}>
        <div className={css.titleRow}>
          <img className={css.icon} src={HAKO_ASSETS.distance} alt="" width={35} height={35} />
          <h2 id="hako-featured-heading" className={css.heading}>
            <FormattedMessage
              id="HakoLanding.featured.title"
              defaultMessage="Featured spots in San Franciso"
            />
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
          <article key={listing.id} className={css.card}>
            <div className={css.imagePlaceholder} aria-hidden="true" />
            <div className={css.cardBody}>
              <div className={css.cardTop}>
                <div className={css.cardMeta}>
                  <h3 className={css.cardTitle}>{listing.title}</h3>
                  <p className={css.cardLocation}>{listing.locationLabel}</p>
                </div>
                <p className={css.price}>
                  <span className={css.priceAmount}>{listing.price}</span>
                  <span>{listing.priceUnit}</span>
                </p>
              </div>
              <div className={css.cardFooter}>
                <div className={css.tags}>
                  {listing.tags.map(tag => (
                    <span key={tag} className={css.tag}>
                      {tag}
                    </span>
                  ))}
                </div>
                <StarRow rating={listing.rating} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

SectionFeaturedSpots.propTypes = {
  listings: arrayOf(
    shape({
      id: string.isRequired,
      title: string.isRequired,
      locationLabel: string,
      price: string,
      priceUnit: string,
      tags: arrayOf(string),
      rating: string,
    })
  ),
};

export default SectionFeaturedSpots;
