import React from 'react';
import { FormattedMessage } from '../../../../util/reactIntl';
import { ExternalLink, NamedLink } from '../../../../components';
import { HAKO_ASSETS } from '../assets';

import css from './HakoFooter.module.css';

// Hako's only social profile. Other networks are intentionally not linked.
const HAKO_FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=61590539176388';

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
          <ExternalLink
            className={css.socialLink}
            href={HAKO_FACEBOOK_URL}
            title="Hako on Facebook"
          >
            <svg
              className={css.socialIcon}
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.5-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.91h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94z" />
            </svg>
            <span className={css.visuallyHidden}>
              <FormattedMessage
                id="HakoLanding.footer.facebook"
                defaultMessage="Hako on Facebook"
              />
            </span>
          </ExternalLink>
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
        <NamedLink name="SavedListingsPage" className={css.link}>
          <FormattedMessage id="HakoLanding.footer.savedSpots" defaultMessage="Saved Spots" />
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
