import React from 'react';
import { bool, object } from 'prop-types';
import { compose } from 'redux';
import { connect } from 'react-redux';

import { propTypes } from '../../util/types';

import HakoLandingPage from './Hako/HakoLandingPage';
import FallbackPage from './FallbackPage';

/**
 * Landing page — Hako Figma HiFi custom layout.
 * Hosted CMS PageBuilder content is intentionally bypassed for pixel fidelity;
 * see PROGRESS.md.
 */
export const LandingPageComponent = props => {
  const { inProgress, error } = props;

  if (error && !inProgress) {
    return <FallbackPage error={error} />;
  }

  return <HakoLandingPage />;
};

LandingPageComponent.propTypes = {
  pageAssetsData: object,
  inProgress: bool,
  error: propTypes.error,
};

const mapStateToProps = state => {
  const { pageAssetsData, inProgress, error } = state.hostedAssets || {};
  return { pageAssetsData, inProgress, error };
};

const LandingPage = compose(connect(mapStateToProps))(LandingPageComponent);

export default LandingPage;
