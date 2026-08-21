import React from 'react';
import { FormattedMessage } from '../../../../util/reactIntl';
import { NamedLink } from '../../../../components';
import { HAKO_ASSETS } from '../assets';

import css from './HakoFooter.module.css';

/**
 * Hako desktop footer — Figma Footer-desktop
 */
export const HakoFooter = () => {
  return (
    <footer className={css.root} role="contentinfo">
      <div className={css.brand}>
        <div className={css.brandTop}>
          <NamedLink name="LandingPage" className={css.logoLink}>
            <img
              className={css.logo}
              src={HAKO_ASSETS.logoWordmark}
              alt="Hako"
              width={120}
              height={47}
            />
          </NamedLink>
          <img
            className={css.socials}
            src={HAKO_ASSETS.socials}
            alt=""
            width={72}
            height={27}
          />
        </div>
        <p className={css.copyright}>
          <FormattedMessage
            id="HakoLanding.footer.copyright"
            defaultMessage="© 2026 Hako, Inc. — Alpine, USA"
          />
        </p>
      </div>

      <nav className={css.column} aria-label="Explore">
        <p className={css.columnTitle}>
          <FormattedMessage id="HakoLanding.footer.explore" defaultMessage="Explore" />
        </p>
        <NamedLink name="SearchPage" className={css.link}>
          <FormattedMessage
            id="HakoLanding.footer.browseDay"
            defaultMessage="Browse day parking"
          />
        </NamedLink>
        <NamedLink name="SearchPage" className={css.link}>
          <FormattedMessage
            id="HakoLanding.footer.browseMonthly"
            defaultMessage="Browse monthly storage"
          />
        </NamedLink>
        <NamedLink name="NewListingPage" className={css.link}>
          <FormattedMessage id="HakoLanding.footer.postListing" defaultMessage="Post a Listing" />
        </NamedLink>
        <NamedLink name="BecomeAHostPage" className={css.link}>
          <FormattedMessage id="HakoLanding.footer.becomeAHost" defaultMessage="Become a Host" />
        </NamedLink>
        <NamedLink name="FAQPage" className={css.link}>
          <FormattedMessage id="HakoLanding.footer.faq" defaultMessage="FAQ" />
        </NamedLink>
      </nav>

      <nav className={css.column} aria-label="Company">
        <p className={css.columnTitle}>
          <FormattedMessage id="HakoLanding.footer.company" defaultMessage="Company" />
        </p>
        <NamedLink name="ContactPage" className={css.link}>
          <FormattedMessage id="HakoLanding.footer.contact" defaultMessage="Contact Us" />
        </NamedLink>
        <NamedLink name="AboutPage" className={css.link}>
          <FormattedMessage id="HakoLanding.footer.about" defaultMessage="About Us" />
        </NamedLink>
        <NamedLink name="CMSPage" params={{ pageId: 'terms-of-service' }} className={css.link}>
          <FormattedMessage id="HakoLanding.footer.terms" defaultMessage="Terms of Service" />
        </NamedLink>
        <NamedLink name="PrivacyPolicyPage" className={css.link}>
          <FormattedMessage id="HakoLanding.footer.privacy" defaultMessage="Privacy Policy" />
        </NamedLink>
      </nav>
    </footer>
  );
};

export default HakoFooter;
