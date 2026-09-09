import React from 'react';
import classNames from 'classnames';

import { FormattedMessage } from '../../../util/reactIntl';

import css from './HakoListingSections.module.css';

/**
 * Checkout / vacate policy shown at the end of every listing page.
 *
 * Static marketplace-wide copy, not listing data — it applies to every spot, so
 * it is intentionally not driven by publicData.
 */
export const HakoCheckoutNotice = ({ className }) => (
  <section className={classNames(css.section, className)}>
    <p className={css.checkoutNotice}>
      <FormattedMessage
        id="HakoListing.checkoutNotice"
        defaultMessage="Please vacate your parking spot or remove stored items by the agreed checkout time. Vehicles and belongings left past checkout are subject to towing/removal at the renter's expense."
      />
    </p>
  </section>
);

export default HakoCheckoutNotice;
