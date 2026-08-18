import React from 'react';
import classNames from 'classnames';
import { string } from 'prop-types';

import { NamedLink } from '../../../components';
import { HAKO_ASSETS } from '../../LandingPage/Hako/assets';

import css from './HakoLogo.module.css';

/**
 * Hako wordmark used in desktop and mobile/tablet topbars.
 * Figma header logo: 70×40 desktop, 64×30 mobile.
 */
const HakoLogo = props => {
  const { marketplaceName, layout = 'desktop' } = props;
  const isMobile = layout === 'mobile';

  return (
    <NamedLink
      name="LandingPage"
      className={classNames(css.logoLink, { [css.logoLinkMobile]: isMobile })}
      id={isMobile ? 'logo-topbar-mobile' : 'logo-topbar-desktop'}
    >
      <img
        className={classNames(css.logoImage, { [css.logoImageMobile]: isMobile })}
        src={HAKO_ASSETS.logoWordmark}
        alt={marketplaceName || 'Hako'}
      />
    </NamedLink>
  );
};

HakoLogo.propTypes = {
  marketplaceName: string,
  layout: string,
};

export default HakoLogo;
