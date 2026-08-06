import React from 'react';
import { arrayOf, shape, string } from 'prop-types';
import { FormattedMessage } from '../../../../util/reactIntl';
import { DEFAULT_REVIEWS, HAKO_ASSETS } from '../assets';

import css from './SectionReviews.module.css';

/**
 * Reviews section — Figma node 61:558
 */
export const SectionReviews = props => {
  const { reviews = DEFAULT_REVIEWS } = props;

  return (
    <section className={css.root} aria-labelledby="hako-reviews-heading">
      <div className={css.header}>
        <h2 id="hako-reviews-heading" className={css.heading}>
          <FormattedMessage
            id="HakoLanding.reviews.title"
            defaultMessage="Trusted by thousands of drivers"
          />
        </h2>
        <p className={css.subtitle}>
          <FormattedMessage
            id="HakoLanding.reviews.subtitle"
            defaultMessage="Real reviews from Hako customers across the country"
          />
        </p>
      </div>

      <div className={css.cards}>
        {reviews.map(review => (
          <article key={`${review.name}-${review.location}`} className={css.card}>
            <div className={css.stars} aria-label="5 out of 5 stars">
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
            <p className={css.quote}>{review.quote}</p>
            <div className={css.customer}>
              <div className={css.avatar} aria-hidden="true">
                <img
                  className={css.avatarIcon}
                  src={HAKO_ASSETS.user}
                  alt=""
                  width={20}
                  height={20}
                />
              </div>
              <div className={css.meta}>
                <span className={css.name}>{review.name}</span>
                <span className={css.location}>{review.location}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

SectionReviews.propTypes = {
  reviews: arrayOf(
    shape({
      quote: string.isRequired,
      name: string.isRequired,
      location: string.isRequired,
    })
  ),
};

export default SectionReviews;
