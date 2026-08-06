import React from 'react';

import { HAKO_ASSETS } from '../../../LandingPage/Hako/assets';
import css from './TopbarSearchForm.module.css';

/**
 * Desktop search icon — Figma export from Hako nav (24×24).
 */
const IconSearchDesktop = () => (
  <img
    className={css.iconSvg}
    src={HAKO_ASSETS.search}
    alt=""
    width={24}
    height={24}
    role="presentation"
  />
);

export default IconSearchDesktop;
