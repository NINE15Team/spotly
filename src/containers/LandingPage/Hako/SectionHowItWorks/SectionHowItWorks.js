import React from 'react';
import { FormattedMessage } from '../../../../util/reactIntl';
import { HAKO_ASSETS, HOW_IT_WORKS_STEPS } from '../assets';

import css from './SectionHowItWorks.module.css';

/**
 * Homepage "How it works" section — Figma node 7:186
 */
export const SectionHowItWorks = () => {
  return (
    <section className={css.root} aria-labelledby="hako-how-it-works-heading">
      <div className={css.titleBlock}>
        <div className={css.headingRow}>
          <img
            className={css.icon}
            src={HAKO_ASSETS.featureSearch}
            alt=""
            width={30}
            height={30}
          />
          <h2 id="hako-how-it-works-heading" className={css.heading}>
            <FormattedMessage id="HakoLanding.howItWorks.title" defaultMessage="How it works" />
          </h2>
        </div>
        <p className={css.subtitle}>
          <FormattedMessage
            id="HakoLanding.howItWorks.subtitle"
            defaultMessage="Book a spot in under 2 minutes"
          />
        </p>
      </div>

      <div className={css.cards}>
        {HOW_IT_WORKS_STEPS.map(step => (
          <article key={step.step} className={css.card}>
            <div className={css.cardTitle}>
              <span className={css.stepBadge}>{step.step}</span>
              <h3 className={css.cardHeading}>
                <FormattedMessage
                  id={step.titleId}
                  defaultMessage={
                    step.step === 1
                      ? 'Search by location'
                      : step.step === 2
                      ? 'Book instantly'
                      : 'Park & go'
                  }
                />
              </h3>
            </div>
            <p className={css.cardBody}>
              <FormattedMessage
                id={step.descriptionId}
                defaultMessage={
                  step.step === 1
                    ? 'Enter your destination and dates. Browse spots on the map or in list view.'
                    : step.step === 2
                    ? 'Pay securely via Stripe. No cash, no waiting — your spot is reserved immediately.'
                    : 'Get directions and access instructions via email and SMS confirmation.'
                }
              />
            </p>
          </article>
        ))}
      </div>
    </section>
  );
};

export default SectionHowItWorks;
