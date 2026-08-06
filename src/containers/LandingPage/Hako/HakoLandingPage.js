import React from 'react';
import { useHistory } from 'react-router-dom';

import { useRouteConfiguration } from '../../../context/routeConfigurationContext';
import { createResourceLocatorString } from '../../../util/routes';
import { Page, LayoutComposer } from '../../../components';
import TopbarContainer from '../../TopbarContainer/TopbarContainer';

import SectionHero from './SectionHero';
import SectionHowItWorks from './SectionHowItWorks';
import SectionFeaturedSpots from './SectionFeaturedSpots';
import SectionExploreLocations from './SectionExploreLocations';
import SectionReviews from './SectionReviews';
import SectionListYourSpace from './SectionListYourSpace';
import HakoFooter from './HakoFooter';

import css from './HakoLandingPage.module.css';

const layoutAreas = `
  topbar
  main
  footer
`;

/**
 * Custom Hako homepage matching Figma HiFi (node 1:2 / 29:2624).
 * Replaces CMS PageBuilder content for LandingPage visual fidelity.
 */
export const HakoLandingPage = () => {
  const history = useHistory();
  const routeConfiguration = useRouteConfiguration();

  const handleSearch = ({ mode }) => {
    const searchParams =
      mode === 'monthly-storage'
        ? { pub_listingType: 'monthly-storage' }
        : { pub_listingType: 'day-parking' };
    history.push(createResourceLocatorString('SearchPage', routeConfiguration, {}, searchParams));
  };

  return (
    <Page
      title="Hako — Find parking & storage near you"
      description="Book day parking and monthly storage on Hako."
      scrollingDisabled={false}
    >
      <LayoutComposer areas={layoutAreas} className={css.layout}>
        {props => {
          const { Topbar, Main, Footer } = props;
          return (
            <>
              <Topbar as="header" className={css.topbar}>
                <TopbarContainer />
              </Topbar>
              <Main as="main" className={css.main}>
                <SectionHero onSearch={handleSearch} />
                <SectionHowItWorks />
                <SectionFeaturedSpots />
                <SectionExploreLocations />
                <SectionReviews />
                <SectionListYourSpace />
              </Main>
              <Footer>
                <HakoFooter />
              </Footer>
            </>
          );
        }}
      </LayoutComposer>
    </Page>
  );
};

export default HakoLandingPage;
