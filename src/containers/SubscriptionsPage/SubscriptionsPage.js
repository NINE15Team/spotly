import React from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { propTypes } from '../../util/types';
import { formatMoney } from '../../util/currency';
import { createSlug } from '../../util/urlHelpers';
import { getMarketplaceEntities } from '../../ducks/marketplaceData.duck';
import { getProcess, SUBSCRIPTION_PROCESS_NAME } from '../../transactions/transaction';
import { isScrollingDisabled } from '../../ducks/ui.duck';
import { showCreateListingLinkForUser, showPaymentDetailsForUser } from '../../util/userHelpers';

import {
  H3,
  Page,
  UserNav,
  LayoutSideNavigation,
  NamedLink,
  PrimaryButton,
  SecondaryButton,
  IconSpinner,
} from '../../components';

import TopbarContainer from '../TopbarContainer/TopbarContainer';
import FooterContainer from '../FooterContainer/FooterContainer';

import {
  loadData,
  loadSubscriptionsThunk,
  cancelSubscriptionThunk,
  openBillingPortalThunk,
} from './SubscriptionsPage.duck';

import css from './SubscriptionsPage.module.css';

const getStatusMessageId = (processState, states) => {
  switch (processState) {
    case states.ACTIVE:
      return 'SubscriptionsPage.statusActive';
    case states.PAYMENT_OVERDUE:
      return 'SubscriptionsPage.statusPaymentOverdue';
    case states.PAYMENT_CONFIRMED:
      return 'SubscriptionsPage.statusActivating';
    case states.CANCELLED:
      return 'SubscriptionsPage.statusCancelled';
    case states.EXPIRED:
      return 'SubscriptionsPage.statusExpired';
    default:
      return 'SubscriptionsPage.statusOther';
  }
};

const SubscriptionCard = props => {
  const {
    transaction,
    listing,
    intl,
    onCancel,
    onBillingPortal,
    cancelInProgress,
    portalInProgress,
  } = props;

  const process = getProcess(SUBSCRIPTION_PROCESS_NAME);
  const processState = process.getState(transaction);
  const listingTitle = listing?.attributes?.title || '';
  const slug = createSlug(listingTitle);
  const payinTotal = transaction.attributes.payinTotal;
  const statusId = getStatusMessageId(processState, process.states);
  const canManage =
    processState === process.states.ACTIVE || processState === process.states.PAYMENT_OVERDUE;

  return (
    <div className={css.card}>
      <H3 as="h2" className={css.cardTitle}>
        <NamedLink name="ListingPage" params={{ id: listing?.id?.uuid, slug }}>
          {listingTitle}
        </NamedLink>
      </H3>
      <p className={css.cardMeta}>
        <FormattedMessage id={statusId} />
        {payinTotal ? (
          <>
            {' · '}
            <FormattedMessage
              id="SubscriptionsPage.monthlyAmount"
              values={{ amount: formatMoney(intl, payinTotal) }}
            />
          </>
        ) : null}
      </p>
      <div className={css.cardActions}>
        <NamedLink
          name="OrderDetailsPage"
          params={{ id: transaction.id.uuid }}
          className={css.cardMeta}
        >
          <FormattedMessage id="SubscriptionsPage.viewOrder" />
        </NamedLink>
        {canManage ? (
          <>
            <SecondaryButton
              inProgress={portalInProgress}
              onClick={() => onBillingPortal(transaction.id)}
            >
              <FormattedMessage id="SubscriptionsPage.updatePayment" />
            </SecondaryButton>
            {processState === process.states.ACTIVE ? (
              <PrimaryButton inProgress={cancelInProgress} onClick={() => onCancel(transaction.id)}>
                <FormattedMessage id="SubscriptionsPage.cancel" />
              </PrimaryButton>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
};

export const SubscriptionsPageComponent = props => {
  const intl = useIntl();
  const config = useConfiguration();
  const {
    currentUser,
    scrollingDisabled,
    fetchInProgress,
    fetchError,
    transactions,
    cancelInProgress,
    cancelError,
    portalInProgress,
    onCancelSubscription,
    onOpenBillingPortal,
  } = props;

  const user = currentUser;
  const showManageListingsLink = showCreateListingLinkForUser(config, user);
  const { showPayoutDetails, showPaymentMethods } = showPaymentDetailsForUser(config, user);

  const title = intl.formatMessage({ id: 'SubscriptionsPage.title' });

  return (
    <Page title={title} scrollingDisabled={scrollingDisabled}>
      <LayoutSideNavigation
        topbar={<TopbarContainer />}
        sideNav={null}
        footer={<FooterContainer />}
        accountSettingsNavProps={{
          currentPage: 'SubscriptionsPage',
          showPaymentMethods,
          showPayoutDetails,
        }}
        useAccountSettingsNav
      >
        <UserNav
          currentPage="SubscriptionsPage"
          showManageListingsLink={showManageListingsLink}
        />
        <div className={css.content}>
          <H3 as="h1" className={css.heading}>
            <FormattedMessage id="SubscriptionsPage.heading" />
          </H3>

          {fetchInProgress ? (
            <IconSpinner />
          ) : fetchError ? (
            <p className={css.error}>
              <FormattedMessage id="SubscriptionsPage.loadError" />
            </p>
          ) : transactions.length === 0 ? (
            <p className={css.empty}>
              <FormattedMessage id="SubscriptionsPage.empty" />
            </p>
          ) : (
            <div className={css.list}>
              {transactions.map(tx => (
                <SubscriptionCard
                  key={tx.id.uuid}
                  transaction={tx}
                  listing={tx.listing}
                  intl={intl}
                  onCancel={onCancelSubscription}
                  onBillingPortal={onOpenBillingPortal}
                  cancelInProgress={cancelInProgress}
                  portalInProgress={portalInProgress}
                />
              ))}
            </div>
          )}

          {cancelError ? (
            <p className={css.error}>
              <FormattedMessage id="SubscriptionsPage.cancelError" />
            </p>
          ) : null}
        </div>
      </LayoutSideNavigation>
    </Page>
  );
};

SubscriptionsPageComponent.defaultProps = {
  className: null,
  rootClassName: null,
  currentUser: null,
};

SubscriptionsPageComponent.propTypes = {
  currentUser: propTypes.currentUser,
  scrollingDisabled: propTypes.bool.isRequired,
  fetchInProgress: propTypes.bool,
  fetchError: propTypes.error,
  transactions: propTypes.array,
  cancelInProgress: propTypes.bool,
  cancelError: propTypes.error,
  portalInProgress: propTypes.bool,
  onCancelSubscription: propTypes.func.isRequired,
  onOpenBillingPortal: propTypes.func.isRequired,
};

const mapStateToProps = state => {
  const { currentUser } = state.user;
  const {
    fetchInProgress,
    fetchError,
    transactionRefs,
    cancelInProgress,
    cancelError,
    portalInProgress,
  } = state.SubscriptionsPage;

  const transactions = getMarketplaceEntities(state, transactionRefs);

  return {
    currentUser,
    scrollingDisabled: isScrollingDisabled(state),
    fetchInProgress,
    fetchError,
    transactions,
    cancelInProgress,
    cancelError,
    portalInProgress,
  };
};

const mapDispatchToProps = dispatch => ({
  onCancelSubscription: transactionId =>
    dispatch(cancelSubscriptionThunk({ transactionId })).then(() =>
      dispatch(loadSubscriptionsThunk())
    ),
  onOpenBillingPortal: transactionId =>
    dispatch(openBillingPortalThunk({ transactionId })).then(action => {
      const url = action.payload?.url;
      if (url) {
        window.location.href = url;
      }
    }),
});

const SubscriptionsPage = compose(connect(mapStateToProps, mapDispatchToProps))(SubscriptionsPageComponent);

export default SubscriptionsPage;
