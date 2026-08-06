import React from 'react';
import classNames from 'classnames';
import { FormattedMessage } from '../../../util/reactIntl';

import css from './HakoListingSections.module.css';

const DEFAULT_AMENITIES = [
  'Disabled Access',
  'EV Charging',
  'Security Camera',
  'Covered Stall',
  'Well lit at night',
  'Gated Access',
];

const normalizeAmenities = publicData => {
  const raw =
    publicData?.amenities ||
    publicData?.amenity ||
    publicData?.features ||
    publicData?.whatThisSpotOffers ||
    null;

  if (!raw) {
    return DEFAULT_AMENITIES;
  }
  if (Array.isArray(raw)) {
    return raw.map(String);
  }
  if (typeof raw === 'string') {
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  }
  return DEFAULT_AMENITIES;
};

/**
 * "What this spot offers" amenity chips.
 */
export const HakoAmenities = props => {
  const { publicData, className } = props;
  const amenities = normalizeAmenities(publicData);

  if (!amenities.length) {
    return null;
  }

  return (
    <section className={classNames(css.section, className)}>
      <h2 className={css.sectionTitle}>
        <FormattedMessage
          id="HakoListing.amenitiesTitle"
          defaultMessage="What this spot offers"
        />
      </h2>
      <ul className={css.amenityGrid}>
        {amenities.map(label => (
          <li key={label} className={css.amenityChip}>
            <span className={css.amenityIcon} aria-hidden="true">
              ✓
            </span>
            <span>{label.replace(/_/g, ' ')}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default HakoAmenities;
