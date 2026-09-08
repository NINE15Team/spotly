import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../util/reactIntl';
import { useConfiguration } from '../../../context/configurationContext';
import { getMeasurementEntries } from '../../../util/hakoListingDetails';

import css from './HakoListingSections.module.css';

/**
 * Size and weight limits for the spot.
 *
 * Values come from the listing's own public data via the hosted listing-fields
 * config. Units are part of the Console label (e.g. "Maximum vehicle length
 * (feet)"), so they always match what the provider actually entered — this used
 * to render fixed metric placeholders (2.11 m / 10 m / 4,000 kg) on every listing.
 */
export const HakoVehicleRestrictions = props => {
  const { publicData, className } = props;
  const config = useConfiguration();
  const listingFields = config?.listing?.listingFields || [];

  const entries = getMeasurementEntries(publicData, listingFields);

  if (entries.length === 0) {
    return null;
  }

  return (
    <section className={classNames(css.section, className)}>
      <h2 className={css.sectionTitle}>
        <FormattedMessage
          id="HakoListing.restrictionsTitle"
          defaultMessage="Size &amp; weight limits"
        />
      </h2>
      <ul className={css.restrictionList}>
        {entries.map(entry => (
          <li key={entry.key} className={css.restrictionItem}>
            {entry.label}: {entry.value}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default HakoVehicleRestrictions;
