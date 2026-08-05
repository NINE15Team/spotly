import React, { useState } from 'react';
import classNames from 'classnames';

import { Page, LayoutSingleColumn, NamedLink } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';
import { HAKO_ASSETS } from '../LandingPage/Hako/assets';

import { FAQ_SECTIONS } from './faqData';
import css from './FAQPage.module.css';

const FaqItem = ({ item, isOpen, onToggle }) => {
  const panelId = `faq-panel-${item.question.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div className={css.card}>
      <button
        type="button"
        className={css.questionButton}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span className={css.questionText}>{item.question}</span>
        <span className={classNames(css.chevron, { [css.chevronOpen]: isOpen })} aria-hidden="true">
          <svg width="14" height="8" viewBox="0 0 14 8" fill="none" aria-hidden="true">
            <path
              d="M1 1l6 6 6-6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      {isOpen ? (
        <div id={panelId} className={css.answer} role="region">
          {item.answer}
        </div>
      ) : null}
    </div>
  );
};

/**
 * FAQ page — layout & copy from Figma FAQ desktop/mobile screenshots.
 */
export const FAQPageComponent = () => {
  const [openKey, setOpenKey] = useState(null);

  return (
    <Page title="Frequently Asked Questions | Hako" scrollingDisabled={false}>
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <section className={css.hero} aria-label="FAQ hero">
          <img
            className={css.heroImage}
            src={HAKO_ASSETS.listYourSpace}
            alt=""
            role="presentation"
          />
          <div className={css.heroOverlay} aria-hidden="true" />
          <div className={css.heroContent}>
            <p className={css.eyebrow}>Support</p>
            <h1 className={css.heroTitle}>Frequently Asked Questions</h1>
            <p className={css.heroSubtitle}>
              Find answers to the most common questions about using Hako for parking and storage.
            </p>
          </div>
        </section>

        <section className={css.content} aria-label="FAQ content">
          <div className={css.inner}>
            {FAQ_SECTIONS.map(section => (
              <div key={section.id} className={css.section}>
                <h2 className={css.sectionTitle}>{section.title}</h2>
                <div className={css.cards}>
                  {section.items.map(item => {
                    const key = `${section.id}:${item.question}`;
                    return (
                      <FaqItem
                        key={key}
                        item={item}
                        isOpen={openKey === key}
                        onToggle={() => setOpenKey(openKey === key ? null : key)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}

            <div className={css.support}>
              <h2 className={css.supportTitle}>Still have questions?</h2>
              <p className={css.supportBody}>
                Our support team is here to help. Reach out and we&apos;ll get back to you within 24
                hours.
              </p>
              <NamedLink name="ContactPage" className={css.supportCta}>
                Contact Us
              </NamedLink>
            </div>
          </div>
        </section>
      </LayoutSingleColumn>
    </Page>
  );
};

const FAQPage = FAQPageComponent;
export default FAQPage;
