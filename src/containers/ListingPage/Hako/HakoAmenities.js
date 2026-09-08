import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../util/reactIntl';
import { useConfiguration } from '../../../context/configurationContext';
import { getAmenityEntries } from '../../../util/hakoListingDetails';

import css from './HakoListingSections.module.css';

/**
 * "What this spot offers" chips.
 *
 * Rendered from the listing's own public data via the hosted listing-fields
 * config — there is no placeholder list, so a spot never claims to offer
 * something it does not have.
 */
export const HakoAmenities = props => {
  const { publicData, className } = props;
  const config = useConfiguration();
  const listingFields = config?.listing?.listingFields || [];

  const entries = getAmenityEntries(publicData, listingFields);

  if (entries.length === 0) {
    return null;
  }

  // Multi-selects contribute one chip per selected option; single-selects show
  // "Label: Value" so the value has context (e.g. "Surface type: Paved").
  const chips = entries.flatMap(entry =>
    entry.schemaType === 'multi-enum'
      ? entry.values.map(value => ({ id: `${entry.key}-${value}`, text: value }))
      : [{ id: entry.key, text: `${entry.label}: ${entry.value}` }]
  );

  return (
    <section className={classNames(css.section, className)}>
      <h2 className={css.sectionTitle}>
        <FormattedMessage id="HakoListing.amenitiesTitle" defaultMessage="What this spot offers" />
      </h2>
      <ul className={css.amenityGrid}>
        {chips.map(chip => (
          <li key={chip.id} className={css.amenityChip}>
            <span className={css.amenityIcon} aria-hidden="true">
              ✓
            </span>
            <span>{chip.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default HakoAmenities;
