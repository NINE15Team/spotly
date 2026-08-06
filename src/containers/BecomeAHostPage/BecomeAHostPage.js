import React from 'react';

import { Page, LayoutSingleColumn, NamedLink } from '../../components';
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import { HOST_HERO, HOST_SIMPLE, HOST_WHY } from './hostData';
import css from './BecomeAHostPage.module.css';

const HostIcon = ({ type }) => {
  if (type === 'shield') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2l8 3v6c0 5.25-3.4 9.74-8 11-4.6-1.26-8-5.75-8-11V5l8-3zm0 2.18L6 6.3v4.7c0 4.1 2.54 7.6 6 8.82 3.46-1.22 6-4.72 6-8.82V6.3l-6-2.12zm-1.2 10.52L8.3 12.2l1.4-1.4 1.1 1.1 3.4-3.4 1.4 1.4-4.8 4.8z" />
      </svg>
    );
  }
  if (type === 'control') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.5.42l-.36 2.54c-.6.24-1.15.55-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.7 8.48a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.82 14.58a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.43.34.7.22l2.39-.96c.48.39 1.03.7 1.63.94l.36 2.54c.05.24.26.42.5.42h3.8c.24 0 .45-.18.5-.42l.36-2.54c.6-.24 1.15-.55 1.63-.94l2.39.96c.27.11.56.02.7-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z" />
      </svg>
    );
  }
  // list / camera-style
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4h10a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2zm2 5h6v2H9V9zm0 4h6v2H9v-2z" />
    </svg>
  );
};

/**
 * Become a Host — layout & copy from Figma Become a Host desktop/mobile screenshots.
 */
export const BecomeAHostPageComponent = () => {
  return (
    <Page title="Become a Host | Hako" scrollingDisabled={false}>
      <LayoutSingleColumn topbar={<TopbarContainer />} footer={<FooterContainer />}>
        <section className={css.hero} aria-label="Become a Host hero">
          <img className={css.heroImage} src={HOST_HERO.imageSrc} alt="" role="presentation" />
          <div className={css.heroOverlay} aria-hidden="true" />
          <div className={css.heroContent}>
            <p className={css.eyebrow}>{HOST_HERO.eyebrow}</p>
            <h1 className={css.heroTitle}>{HOST_HERO.title}</h1>
            <p className={css.heroBody}>{HOST_HERO.body}</p>
          </div>
        </section>

        <section className={css.simpleSection} aria-labelledby="host-simple-heading">
          <div className={css.simpleInner}>
            <h2 id="host-simple-heading" className={css.simpleTitle}>
              {HOST_SIMPLE.title}
            </h2>
            <div className={css.simpleCards}>
              {HOST_SIMPLE.cards.map(card => (
                <article key={card.id} className={css.simpleCard}>
                  <span className={css.iconCircle} aria-hidden="true">
                    <HostIcon type={card.icon} />
                  </span>
                  <h3 className={css.simpleCardTitle}>{card.title}</h3>
                  <p className={css.simpleCardBody}>{card.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={css.whySection} aria-labelledby="host-why-heading">
          <div className={css.whyInner}>
            <div className={css.whyText}>
              <h2 id="host-why-heading" className={css.whyTitle}>
                {HOST_WHY.title}
              </h2>
              {HOST_WHY.paragraphs.map(paragraph => (
                <p key={paragraph.slice(0, 28)} className={css.whyBody}>
                  {paragraph}
                </p>
              ))}
              <NamedLink name="SignupPage" className={css.cta}>
                {HOST_WHY.ctaLabel}
              </NamedLink>
            </div>
            <div className={css.mediaPlaceholder} aria-hidden="true" />
          </div>
        </section>
      </LayoutSingleColumn>
    </Page>
  );
};

const BecomeAHostPage = BecomeAHostPageComponent;
export default BecomeAHostPage;
