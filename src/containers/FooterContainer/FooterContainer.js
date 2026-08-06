import React from 'react';
import { useConfiguration } from '../../context/configurationContext';
import loadable from '@loadable/component';

import HakoFooter from '../LandingPage/Hako/HakoFooter';

const SectionBuilder = loadable(
  () => import(/* webpackChunkName: "SectionBuilder" */ '../PageBuilder/PageBuilder'),
  {
    resolveComponent: components => components.SectionBuilder,
  }
);

/**
 * Site footer. Prefers the Hako Figma footer; falls back to hosted CMS footer
 * only if explicitly forced via config (not used by default).
 */
const FooterComponent = () => {
  const { footer = {}, topbar } = useConfiguration();

  // Always render Hako footer for brand consistency with Figma HiFi.
  // Hosted CMS footer asset is ignored while the Figma redesign is in progress.
  // See PROGRESS.md — Needs my review.
  if (process.env.REACT_APP_USE_CMS_FOOTER === 'true' && Object.keys(footer).length > 0) {
    const footerSection = {
      ...footer,
      sectionId: 'footer',
      sectionType: 'footer',
      linkLogoToExternalSite: topbar?.logoLink,
    };
    return <SectionBuilder sections={[footerSection]} />;
  }

  return <HakoFooter />;
};

export default FooterComponent;
