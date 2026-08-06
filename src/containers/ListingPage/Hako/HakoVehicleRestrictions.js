import React from 'react';
import classNames from 'classnames';
import { FormattedMessage } from '../../../util/reactIntl';

import css from './HakoListingSections.module.css';

const pickRestriction = (publicData, keys, fallback) => {
  for (const key of keys) {
    if (publicData?.[key] != null && publicData[key] !== '') {
      return publicData[key];
    }
  }
  return fallback;
};

/**
 * Vehicle restrictions list for Hako listing details.
 */
export const HakoVehicleRestrictions = props => {
  const { publicData = {}, className } = props;

  const height = pickRestriction(
    publicData,
    ['vehicleHeight', 'maxVehicleHeight', 'heightLimit'],
    '2.11 m'
  );
  const length = pickRestriction(
    publicData,
    ['vehicleLength', 'maxVehicleLength', 'lengthLimit'],
    '10 m'
  );
  const weight = pickRestriction(
    publicData,
    ['vehicleWeight', 'maxVehicleWeight', 'weightLimit'],
    '4,000 kg'
  );

  const items = [
    {
      id: 'height',
      message: (
        <FormattedMessage
          id="HakoListing.restrictionHeight"
          defaultMessage="Maximum vehicle height: {value}"
          values={{ value: height }}
        />
      ),
    },
    {
      id: 'length',
      message: (
        <FormattedMessage
          id="HakoListing.restrictionLength"
          defaultMessage="Maximum vehicle length: {value}"
          values={{ value: length }}
        />
      ),
    },
    {
      id: 'weight',
      message: (
        <FormattedMessage
          id="HakoListing.restrictionWeight"
          defaultMessage="Maximum vehicle weight: {value}"
          values={{ value: weight }}
        />
      ),
    },
  ];

  return (
    <section className={classNames(css.section, className)}>
      <h2 className={css.sectionTitle}>
        <FormattedMessage
          id="HakoListing.restrictionsTitle"
          defaultMessage="Vehicle Restrictions"
        />
      </h2>
      <ul className={css.restrictionList}>
        {items.map(item => (
          <li key={item.id} className={css.restrictionItem}>
            {item.message}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default HakoVehicleRestrictions;
