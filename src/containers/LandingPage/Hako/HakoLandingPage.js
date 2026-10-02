import React from 'react';
import { useHistory } from 'react-router-dom';
import { useSelector } from 'react-redux';

import { getListingsById } from '../../../ducks/marketplaceData.duck';
import { useRouteConfiguration } from '../../../context/routeConfigurationContext';
import { createResourceLocatorString } from '../../../util/routes';
import { isOriginInUse } from '../../../util/search';
import { listingTypeForSearch, isMonthlyListingType } from '../../../util/hakoListingTypes';
import { Page, LayoutComposer } from '../../../components';
import TopbarContainer from '../../TopbarContainer/TopbarContainer';
import { useConfiguration } from '../../../context/configurationContext';

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
  const config = useConfiguration();

  const { featuredListingIds, isFeaturedLocation } = useSelector(state => state.LandingPage);
  const featuredListings = useSelector(state => getListingsById(state, featuredListingIds));

  const handleSearch = ({ mode, locationLabel, origin, bounds, dateLabel, hoursLabel }) => {
    const listingType = listingTypeForSearch(mode);
    const isMonthly = isMonthlyListingType(listingType);
    const originMaybe = origin && isOriginInUse(config) ? { origin } : {};
    const boundsMaybe = bounds ? { bounds } : {};
    const addressMaybe = locationLabel ? { address: locationLabel } : {};

    // Carry the hero's date & hours into the search URL using the same param shape
    // HakoSearchBar writes (dates=YYYY-MM-DD,YYYY-MM-DD & duration=<hours>), so the
    // results page prefills the bar and filters availability for the requested slot.
    const dateISO = dateLabel && /^\d{4}-\d{2}-\d{2}$/.test(dateLabel) ? dateLabel : null;
    const datesMaybe = dateISO ? { dates: `${dateISO},${dateISO}` } : {};
    const durationHours = String(hoursLabel || '').replace(/\D/g, '');
    const durationMaybe = !isMonthly && durationHours ? { duration: durationHours } : {};

    const searchParams = {
      pub_listingType: listingType,
      ...addressMaybe,
      ...boundsMaybe,
      ...originMaybe,
      ...datesMaybe,
      ...durationMaybe,
    };
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
                <SectionFeaturedSpots
                  listings={featuredListings}
                  isFeaturedLocation={isFeaturedLocation}
                />
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
