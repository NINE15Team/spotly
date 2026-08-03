import React from 'react';
import { FormattedMessage } from '../../../../util/reactIntl';
import { NamedLink } from '../../../../components';
import { HAKO_ASSETS } from '../assets';

import css from './SectionListYourSpace.module.css';

/**
 * List your space CTA — Figma node 12:423
 */
export const SectionListYourSpace = () => {
  return (
    <section className={css.root} aria-labelledby="hako-list-space-heading">
      <div className={css.background} aria-hidden="true">
        <img className={css.backgroundImage} src={HAKO_ASSETS.listYourSpace} alt="" />
        <div className={css.overlayMultiply} />
        <div className={css.overlayGradient} />
      </div>

      <div className={css.content}>
        <div className={css.text}>
          <h2 id="hako-list-space-heading" className={css.heading}>
            <FormattedMessage
              id="HakoLanding.listYourSpace.title"
              defaultMessage="Have a parking space or storage area?"
            />
          </h2>
          <p className={css.subtitle}>
            <FormattedMessage
              id="HakoLanding.listYourSpace.subtitle"
              defaultMessage="List it on Hako and start earning, {highlight}"
              values={{
                highlight: (
                  <span className={css.highlight}>
                    <FormattedMessage
                      id="HakoLanding.listYourSpace.highlight"
                      defaultMessage="it's free to sign up."
                    />
                  </span>
                ),
              }}
            />
          </p>
        </div>
        <NamedLink name="NewListingPage" className={css.cta}>
          <FormattedMessage
            id="HakoLanding.listYourSpace.cta"
            defaultMessage="List Your Space"
          />
        </NamedLink>
      </div>
    </section>
  );
};

export default SectionListYourSpace;
