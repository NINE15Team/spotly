import React from 'react';
import classNames from 'classnames';
import { FormattedMessage } from '../../../../util/reactIntl';
import { NamedLink } from '../../../../components';
import { EXPLORE_LOCATIONS, HAKO_ASSETS } from '../assets';

import css from './SectionExploreLocations.module.css';

/**
 * Explore by Location — Figma node 61:809
 */
export const SectionExploreLocations = () => {
  const row1 = EXPLORE_LOCATIONS.slice(0, 4);
  const row2 = EXPLORE_LOCATIONS.slice(4);

  const renderCard = location => (
    <NamedLink
      key={location.name}
      name="SearchPage"
      to={{ search: `?address=${encodeURIComponent(location.name)}` }}
      className={classNames(css.card, location.tone === 'green' ? css.cardGreen : css.cardBlue)}
    >
      {location.image ? (
        <img className={css.cardImage} src={location.image} alt="" />
      ) : null}
      <div className={css.cardOverlay} aria-hidden="true" />
      <div className={css.cardInfo}>
        <span className={css.cardName}>{location.name}</span>
        <span className={css.cardCta}>
          <FormattedMessage id="HakoLanding.explore.viewListings" defaultMessage="View Listings" />
          <img
            className={css.cardArrow}
            src={HAKO_ASSETS.arrowRightAlt}
            alt=""
            width={17}
            height={17}
          />
        </span>
      </div>
    </NamedLink>
  );

  return (
    <section className={css.root} aria-labelledby="hako-explore-heading">
      <div className={css.titleBlock}>
        <div className={css.headingRow}>
          <img className={css.icon} src={HAKO_ASSETS.map} alt="" width={30} height={30} />
          <h2 id="hako-explore-heading" className={css.heading}>
            <FormattedMessage
              id="HakoLanding.explore.title"
              defaultMessage="Explore by Location"
            />
          </h2>
        </div>
        <p className={css.subtitle}>
          <FormattedMessage
            id="HakoLanding.explore.subtitle"
            defaultMessage="Find the perfect parking spot in cities across the US"
          />
        </p>
      </div>

      <div className={css.row}>{row1.map(renderCard)}</div>
      <div className={css.row}>{row2.map(renderCard)}</div>
    </section>
  );
};

export default SectionExploreLocations;
