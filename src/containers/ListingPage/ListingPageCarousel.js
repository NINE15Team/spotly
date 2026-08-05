import React, { useState, useEffect } from 'react';
import { useCallback } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import classNames from 'classnames';

// Utils
import { formatMoney } from '../../util/currency';
import { FormattedMessage } from '../../util/reactIntl';
import { LISTING_STATE_CLOSED, propTypes } from '../../util/types';
import { OFFER, REQUEST } from '../../transactions/transaction';

// Global ducks (for Redux actions and thunks)
import { getMarketplaceEntities } from '../../ducks/marketplaceData.duck';
import { manageDisableScrolling, isScrollingDisabled } from '../../ducks/ui.duck';
import { initializeCardPaymentData } from '../../ducks/stripe.duck.js';

// Shared components
import {
  H4,
  Page,
  NamedLink,
  OrderPanel,
  LayoutSingleColumn,
} from '../../components';

// Related components and modules
import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';
import NotFoundPage from '../NotFoundPage/NotFoundPage';

import {
  sendInquiry,
  setInitialValues,
  fetchTimeSlots,
  fetchTransactionLineItems,
} from './ListingPage.duck';

import {
  LoadingPage,
  ErrorPage,
  handleContactUser,
  handleSubmitInquiry,
  handleNavigateToMakeOfferPage,
  handleNavigateToRequestQuotePage,
  handleSubmit,
  priceForSchemaMaybe,
  getDerivedRenderData,
} from './ListingPage.shared';
import Notifications from './Notifications/Notifications';
import SectionReviews from './SectionReviews';
import SectionAuthorMaybe from './SectionAuthorMaybe';
import SectionMapMaybe from './SectionMapMaybe';
import SectionGallery from './SectionGallery';
import ListingPageAccessWrapper from './ListingPageAccessWrapper';
import {
  HakoBreadcrumbs,
  HakoListingHeading,
  HakoHostBar,
  HakoAmenities,
  HakoVehicleRestrictions,
} from './Hako';

import css from './ListingPage.module.css';
import hakoCss from './Hako/HakoListingSections.module.css';

const MIN_LENGTH_FOR_LONG_WORDS_IN_TITLE = 16;

export const ListingPageComponent = props => {
  const [inquiryModalOpen, setInquiryModalOpen] = useState(
    props.inquiryModalOpenForListingId === props.params.id
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    isAuthenticated,
    currentUser,
    getListing,
    getOwnListing,
    intl,
    onManageDisableScrolling,
    params: rawParams,
    location,
    scrollingDisabled,
    showListingError,
    reviews = [],
    fetchReviewsError,
    sendInquiryInProgress,
    sendInquiryError,
    history,
    callSetInitialValues,
    onSendInquiry,
    onInitializeCardPaymentData,
    config,
    routeConfiguration,
    showOwnListingsOnly,
    ...restOfProps
  } = props;

  const derivedData = getDerivedRenderData({
    rawParams,
    getListing,
    getOwnListing,
    showOwnListingsOnly,
    currentUser,
    config,
    intl,
    location,
    longWordMinLength: MIN_LENGTH_FOR_LONG_WORDS_IN_TITLE,
    longWordClassName: css.longWord,
    payoutDetailsWarningClassName: css.payoutDetailsWarning,
  });
  const {
    listingId,
    isVariant,
    currentListing,
    listingSlug,
    params,
    listingPathParamType,
    listingTab,
    description,
    geolocation,
    price,
    title,
    publicData,
    richTitle,
    isOwnListing,
    showListingImage,
    processType,
    ensuredAuthor,
    noPayoutDetailsSetWithOwnListing,
    payoutDetailsWarning,
    authorDisplayName,
    schemaTitle,
    facebookImages,
    twitterImages,
    schemaImages,
    productURL,
    availabilityMaybe,
    noIndexMaybe,
    hasInvalidListingData,
  } = derivedData;

  const topbar = <TopbarContainer />;

  if (showListingError && showListingError.status === 404) {
    // 404 listing not found
    return <NotFoundPage staticContext={props.staticContext} />;
  } else if (showListingError) {
    // Other error in fetching listing
    return <ErrorPage topbar={topbar} scrollingDisabled={scrollingDisabled} intl={intl} />;
  } else if (!currentListing.id) {
    // Still loading the listing
    return <LoadingPage topbar={topbar} scrollingDisabled={scrollingDisabled} intl={intl} />;
  }

  if (hasInvalidListingData) {
    // Listing should always contain listingType, transactionProcessAlias and unitType)
    return (
      <ErrorPage topbar={topbar} scrollingDisabled={scrollingDisabled} intl={intl} invalidListing />
    );
  }
  const unitType = publicData.unitType;
  const isNegotiation = processType === 'negotiation';

  const locationLabel =
    publicData?.location?.address ||
    publicData?.location?.building ||
    publicData?.city ||
    publicData?.neighborhood ||
    '';
  const locationShort =
    publicData?.neighborhood ||
    publicData?.city ||
    (typeof locationLabel === 'string' ? locationLabel.split(',')[0] : '') ||
    '';
  const subtitle =
    publicData?.subtitle ||
    publicData?.tagline ||
    publicData?.spaceType ||
    null;
  const ratingDisplay =
    currentListing?.attributes?.metadata?.rating || publicData?.rating || '4.9';
  const reviewCount =
    currentListing?.attributes?.metadata?.reviewsTotal ||
    publicData?.reviewsTotal ||
    (reviews?.length > 0 ? reviews.length : 42);

  let priceLabel = null;
  if (price && price.currency === config.currency) {
    try {
      priceLabel = intl.formatMessage(
        { id: 'HakoListing.startingFrom', defaultMessage: 'Starting from {price}' },
        { price: formatMoney(intl, price) }
      );
    } catch (e) {
      priceLabel = null;
    }
  }

  const showContactHost = !(processType === 'inquiry' || (isNegotiation && unitType === OFFER));

  const commonParams = { params, history, routes: routeConfiguration };
  const onContactUser = handleContactUser({
    ...commonParams,
    currentUser,
    callSetInitialValues,
    setInitialValues, // from ListingPage.duck.js (set initial values for the listing page)
    location,
    setInquiryModalOpen,
  });
  // Note: this is for inquire transition to inquiry state in booking, purchase and negotiation processes.
  // Inquiry process is handled through handleSubmit.
  const onSubmitInquiry = handleSubmitInquiry({
    ...commonParams,
    getListing,
    onSendInquiry,
    setInquiryModalOpen,
  });

  const handleOrderSubmit = values => {
    const isCurrentlyClosed = currentListing.attributes.state === LISTING_STATE_CLOSED;
    if (isOwnListing || isCurrentlyClosed) {
      window.scrollTo(0, 0);
    } else if (isNegotiation && unitType === REQUEST) {
      // This is to navigate to MakeOfferPage when InvokeNegotiationForm is submitted
      const onNavigateToMakeOfferPage = handleNavigateToMakeOfferPage({
        ...commonParams,
        getListing,
      });
      onNavigateToMakeOfferPage(values);
    } else if (isNegotiation && unitType === OFFER) {
      // This is to navigate to MakeOfferPage when InvokeNegotiationForm is submitted
      const onNavigateToRequestQuotePage = handleNavigateToRequestQuotePage({
        ...commonParams,
        getListing,
      });
      onNavigateToRequestQuotePage(values);
    } else {
      const onSubmit = handleSubmit({
        ...commonParams,
        currentUser,
        callSetInitialValues,
        getListing,
        onInitializeCardPaymentData,
      });
      onSubmit(values);
    }
  };

  return (
    <Page
      title={schemaTitle}
      scrollingDisabled={scrollingDisabled}
      author={authorDisplayName}
      description={description}
      facebookImages={facebookImages}
      twitterImages={twitterImages}
      {...noIndexMaybe}
      schema={{
        '@context': 'http://schema.org',
        '@type': 'Product',
        description: description,
        name: schemaTitle,
        image: schemaImages,
        offers: {
          '@type': 'Offer',
          url: productURL,
          ...priceForSchemaMaybe(price),
          ...availabilityMaybe,
        },
      }}
    >
      <LayoutSingleColumn className={css.pageRoot} topbar={topbar} footer={<FooterContainer />}>
        <div className={css.contentWrapperForProductLayout}>
          <div className={css.mainColumnForProductLayout}>
            <Notifications
              mounted={mounted}
              listing={currentListing}
              isOwnListing={isOwnListing}
              noPayoutDetailsSetWithOwnListing={noPayoutDetailsSetWithOwnListing}
              currentUser={currentUser}
              className={css.actionBarForProductLayout}
              editParams={{
                id: listingId.uuid,
                slug: listingSlug,
                type: listingPathParamType,
                tab: listingTab,
              }}
            />
            <HakoBreadcrumbs title={title} locationLabel={locationShort} />
            {showListingImage ? (
              <SectionGallery
                listing={currentListing}
                variantPrefix={config.layout.listingImage.variantPrefix}
              />
            ) : null}

            <HakoListingHeading
              title={title}
              subtitle={subtitle}
              locationLabel={locationLabel}
              priceLabel={priceLabel}
              rating={ratingDisplay}
              reviewCount={reviewCount}
            />

            <HakoHostBar
              author={currentListing.author}
              authorDisplayName={authorDisplayName}
              reviewCount={reviewCount}
              onContactUser={onContactUser}
              showContact={showContactHost}
            />

            <HakoAmenities publicData={publicData} />
            <HakoVehicleRestrictions publicData={publicData} />

            {description ? (
              <section className={hakoCss.section}>
                <h2 className={hakoCss.sectionTitle}>
                  <FormattedMessage id="HakoListing.aboutTitle" defaultMessage="About this space" />
                </h2>
                <p className={hakoCss.aboutText}>{description}</p>
              </section>
            ) : null}

            <SectionMapMaybe
              geolocation={geolocation}
              publicData={publicData}
              listingId={currentListing.id}
              mapsConfig={config.maps}
              showAddressNote
            />
            <SectionReviews reviews={reviews} fetchReviewsError={fetchReviewsError} />
          </div>
          <div className={css.orderColumnForProductLayout}>
            <OrderPanel
              className={classNames(css.productOrderPanel, css.hakoOrderPanel, {
                [css.imagesEnabled]: showListingImage,
              })}
              listing={currentListing}
              isOwnListing={isOwnListing}
              onSubmit={handleOrderSubmit}
              authorLink={
                <NamedLink
                  className={css.authorNameLink}
                  name={isVariant ? 'ListingPageVariant' : 'ListingPage'}
                  params={params}
                  to={{ hash: '#author' }}
                >
                  {authorDisplayName}
                </NamedLink>
              }
              title={<FormattedMessage id="ListingPage.orderTitle" values={{ title: richTitle }} />}
              titleDesktop={
                <H4 as="h1" className={css.orderPanelTitle}>
                  <FormattedMessage id="ListingPage.orderTitle" values={{ title: richTitle }} />
                </H4>
              }
              payoutDetailsWarning={payoutDetailsWarning}
              author={ensuredAuthor}
              onManageDisableScrolling={onManageDisableScrolling}
              onContactUser={onContactUser}
              {...restOfProps}
              validListingTypes={config.listing.listingTypes}
              marketplaceCurrency={config.currency}
              dayCountAvailableForBooking={config.stripe.dayCountAvailableForBooking}
              marketplaceName={config.marketplaceName}
              showListingImage={showListingImage}
              isHakoLayout
              hakoRating={ratingDisplay}
              hakoReviewCount={reviewCount}
            />
          </div>
        </div>
        <div className={css.hakoAuthorModalOnly}>
          <SectionAuthorMaybe
            title={title}
            listing={currentListing}
            authorDisplayName={authorDisplayName}
            onContactUser={onContactUser}
            isInquiryModalOpen={isAuthenticated && inquiryModalOpen}
            onCloseInquiryModal={() => setInquiryModalOpen(false)}
            sendInquiryError={sendInquiryError}
            sendInquiryInProgress={sendInquiryInProgress}
            onSubmitInquiry={onSubmitInquiry}
            currentUser={currentUser}
            onManageDisableScrolling={onManageDisableScrolling}
          />
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

/**
 * The ListingPage component with carousel layout.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.params - The path params object
 * @param {string} props.params.id - The listing id
 * @param {string} props.params.slug - The listing slug
 * @param {LISTING_PAGE_DRAFT_VARIANT | LISTING_PAGE_PENDING_APPROVAL_VARIANT} props.params.variant - The listing variant
 * @param {Function} props.onManageDisableScrolling - The on manage disable scrolling function
 * @param {boolean} props.isAuthenticated - Whether the user is authenticated
 * @param {Function} props.getListing - The get listing function
 * @param {Function} props.getOwnListing - The get own listing function
 * @param {Object} props.currentUser - The current user
 * @param {boolean} props.scrollingDisabled - Whether scrolling is disabled
 * @param {string} props.inquiryModalOpenForListingId - The inquiry modal open for the specific listing id
 * @param {propTypes.error} props.showListingError - The show listing error
 * @param {Function} props.callSetInitialValues - The call page-specific setInitialValues function, which is given to this function as a parameter
 * @param {Array<propTypes.review>} props.reviews - The reviews
 * @param {propTypes.error} props.fetchReviewsError - The fetch reviews error
 * @param {Object<string, Object>} props.monthlyTimeSlots - The monthly time slots. E.g. { '2019-11': { timeSlots: [], fetchTimeSlotsInProgress: false, fetchTimeSlotsError: null } }
 * @param {Object<string, Object>} props.timeSlotsForDate - The time slots for date. E.g. { '2019-11-01': { timeSlots: [], fetchedAt: 1572566400000, fetchTimeSlotsError: null, fetchTimeSlotsInProgress: false } }
 * @param {boolean} props.sendInquiryInProgress - Whether the send inquiry is in progress
 * @param {propTypes.error} props.sendInquiryError - The send inquiry error
 * @param {Function} props.onSendInquiry - The on send inquiry function
 * @param {Function} props.onInitializeCardPaymentData - The on initialize card payment data function
 * @param {Function} props.onFetchTimeSlots - The on fetch time slots function
 * @param {Function} props.onFetchTransactionLineItems - The on fetch transaction line items function
 * @param {Array<propTypes.transactionLineItem>} props.lineItems - The line items
 * @param {boolean} props.fetchLineItemsInProgress - Whether the fetch line items is in progress
 * @param {propTypes.error} props.fetchLineItemsError - The fetch line items error
 * @returns {JSX.Element} listing page component
 */
const ListingPage = props => {
  const dispatch = useDispatch();
  const store = useStore();

  const { isAuthenticated } = useSelector(state => state.auth);
  const {
    showListingError,
    reviews,
    fetchReviewsError,
    monthlyTimeSlots,
    timeSlotsForDate,
    sendInquiryInProgress,
    sendInquiryError,
    lineItems,
    fetchLineItemsInProgress,
    fetchLineItemsError,
    inquiryModalOpenForListingId,
  } = useSelector(state => state.ListingPage);
  const currentUser = useSelector(state => state.user?.currentUser);
  const scrollingDisabled = useSelector(state => isScrollingDisabled(state));

  const getListing = useCallback(
    id => {
      const state = store.getState();
      const ref = { id, type: 'listing' };
      const listings = getMarketplaceEntities(state, [ref]);
      return listings.length === 1 ? listings[0] : null;
    },
    [store]
  );
  const getOwnListing = useCallback(
    id => {
      const state = store.getState();
      const ref = { id, type: 'ownListing' };
      const listings = getMarketplaceEntities(state, [ref]);
      return listings.length === 1 ? listings[0] : null;
    },
    [store]
  );

  const onManageDisableScrolling = useCallback(
    (componentId, disableScrolling) =>
      dispatch(manageDisableScrolling(componentId, disableScrolling)),
    [dispatch]
  );
  const callSetInitialValues = useCallback(
    (setInitialValuesFn, values, saveToSessionStorage) =>
      dispatch(setInitialValuesFn(values, saveToSessionStorage)),
    [dispatch]
  );
  const onFetchTransactionLineItems = useCallback(
    params => dispatch(fetchTransactionLineItems(params)),
    [dispatch]
  );
  const onSendInquiry = useCallback((listing, message) => dispatch(sendInquiry(listing, message)), [
    dispatch,
  ]);
  const onInitializeCardPaymentData = useCallback(() => dispatch(initializeCardPaymentData()), [
    dispatch,
  ]);
  const onFetchTimeSlots = useCallback(
    (listingId, start, end, timeZone, options) =>
      dispatch(fetchTimeSlots(listingId, start, end, timeZone, options)),
    [dispatch]
  );

  return (
    <ListingPageAccessWrapper
      {...props}
      PageComponent={ListingPageComponent}
      isAuthenticated={isAuthenticated}
      currentUser={currentUser}
      getListing={getListing}
      getOwnListing={getOwnListing}
      scrollingDisabled={scrollingDisabled}
      inquiryModalOpenForListingId={inquiryModalOpenForListingId}
      showListingError={showListingError}
      reviews={reviews}
      fetchReviewsError={fetchReviewsError}
      monthlyTimeSlots={monthlyTimeSlots}
      timeSlotsForDate={timeSlotsForDate}
      lineItems={lineItems}
      fetchLineItemsInProgress={fetchLineItemsInProgress}
      fetchLineItemsError={fetchLineItemsError}
      sendInquiryInProgress={sendInquiryInProgress}
      sendInquiryError={sendInquiryError}
      onManageDisableScrolling={onManageDisableScrolling}
      callSetInitialValues={callSetInitialValues}
      onFetchTransactionLineItems={onFetchTransactionLineItems}
      onSendInquiry={onSendInquiry}
      onInitializeCardPaymentData={onInitializeCardPaymentData}
      onFetchTimeSlots={onFetchTimeSlots}
    />
  );
};

export default ListingPage;
