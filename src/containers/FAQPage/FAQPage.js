import React, { useState } from 'react';
import classNames from 'classnames';

import { Page, LayoutSingleColumn, NamedLink } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

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
          ▾
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
 * FAQ page — structure & question copy from Figma node 90:972.
 * Answer bodies are interim until open accordion states are pulled from Figma.
 */
export const FAQPageComponent = () => {
  const [openKey, setOpenKey] = useState(null);

  return (
    <Page title="FAQ | Hako" scrollingDisabled={false}>
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <section className={css.hero} aria-label="FAQ hero">
          <h1 className={css.heroTitle}>FAQ</h1>
          <p className={css.heroSubtitle}>Answers for drivers and hosts</p>
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
