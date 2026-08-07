import React from 'react';
import classNames from 'classnames';

import { Page, LayoutSingleColumn } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import { ABOUT_HERO, ABOUT_SECTIONS, ABOUT_VALUES } from './aboutData';
import css from './AboutPage.module.css';

const ValueIcon = ({ type }) => {
  if (type === 'earn') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 4h10a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2zm2 5h6v2H9V9zm0 4h6v2H9v-2z" />
      </svg>
    );
  }
  if (type === 'community') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm-7.5 8a5.5 5.5 0 0 1 11 0H4.5zm11.2-8.2a3.2 3.2 0 1 0 0-5.6 3.2 3.2 0 0 0 0 5.6zM16 12.8c2.4.4 4.5 2.1 4.5 4.7h-3.2c-.3-1.7-1.3-3.1-2.8-3.9.5-.2 1-.4 1.5-.8z" />
      </svg>
    );
  }
  // search
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10.5 3a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zm7.2 11.1 3.1 3.1-1.4 1.4-3.1-3.1 1.4-1.4z" />
    </svg>
  );
};

/**
 * About Us — layout & copy from Figma About Us desktop/mobile screenshots.
 */
export const AboutPageComponent = () => {
  return (
    <Page title="About Us | Hako" scrollingDisabled={false}>
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <section className={css.hero} aria-label="About Hako hero">
          <img
            className={css.heroImage}
            src={ABOUT_HERO.imageSrc}
            alt=""
            role="presentation"
          />
          <div className={css.heroOverlay} aria-hidden="true" />
          <div className={css.heroContent}>
            <p className={css.eyebrow}>{ABOUT_HERO.eyebrow}</p>
            <h1 className={css.heroTitle}>{ABOUT_HERO.title}</h1>
            <p className={css.heroBody}>{ABOUT_HERO.body}</p>
          </div>
        </section>

        {ABOUT_SECTIONS.map((section, index) => (
          <section
            key={section.id}
            className={classNames(css.splitSection, {
              [css.splitSectionAlt]: index > 0,
            })}
            aria-labelledby={`about-${section.id}-heading`}
          >
            <div
              className={classNames(css.splitInner, {
                [css.splitInnerImageFirst]: section.imageFirst,
              })}
            >
              <div className={css.splitText}>
                <h2 id={`about-${section.id}-heading`} className={css.splitTitle}>
                  {section.title}
                </h2>
                {section.paragraphs.map(paragraph => (
                  <p key={paragraph.slice(0, 24)} className={css.splitBody}>
                    {paragraph}
                  </p>
                ))}
              </div>
              <div className={css.mediaFrame}>
                {section.imageSrc ? (
                  <img
                    className={css.mediaImage}
                    src={section.imageSrc}
                    alt={section.imageAlt || ''}
                  />
                ) : (
                  <div className={css.mediaPlaceholder} aria-hidden="true" />
                )}
              </div>
            </div>
          </section>
        ))}

        <section className={css.valuesSection} aria-labelledby="about-values-heading">
          <div className={css.valuesInner}>
            <h2 id="about-values-heading" className={css.valuesTitle}>
              {ABOUT_VALUES.title}
            </h2>
            <div className={css.valueCards}>
              {ABOUT_VALUES.cards.map(card => (
                <article key={card.id} className={css.valueCard}>
                  <span className={css.iconCircle} aria-hidden="true">
                    <ValueIcon type={card.icon} />
                  </span>
                  <h3 className={css.valueCardTitle}>{card.title}</h3>
                  <p className={css.valueCardBody}>{card.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </LayoutSingleColumn>
    </Page>
  );
};

const AboutPage = AboutPageComponent;
export default AboutPage;
