import React, { useEffect } from 'react';
import { Form as FinalForm } from 'react-final-form';
import classNames from 'classnames';

import { FormattedMessage } from '../../../util/reactIntl';
import { getStartOf } from '../../../util/dates';
import { propTypes } from '../../../util/types';
import { getFirstPeriodEnd } from '../../../util/subscriptionDates';
import { SUBSCRIPTION_PROCESS_NAME } from '../../../transactions/transaction';

import { Form, PrimaryButton, H6, NamedLink } from '../../../components';

import EstimatedCustomerBreakdownMaybe from '../EstimatedCustomerBreakdownMaybe';
import FetchLineItemsError from '../FetchLineItemsError/FetchLineItemsError';
import SubscriptionSubmitFinePrint from './SubscriptionSubmitFinePrint';

import css from './SubscriptionOrderForm.module.css';

const TODAY = new Date();

/**
 * Order form for subscription-rental listings (monthly, starts immediately).
 */
const SubscriptionOrderForm = props => {
  const {
    rootClassName,
    className,
    price: listingPrice,
    listingId,
    isOwnListing,
    marketplaceName,
    onFetchTransactionLineItems,
    lineItems,
    fetchLineItemsInProgress,
    fetchLineItemsError,
    onSubmit,
    timeZone,
    payoutDetailsWarning,
    processName = SUBSCRIPTION_PROCESS_NAME,
    hasActiveSubscription,
    activeSubscriptionId,
  } = props;

  const classes = classNames(rootClassName || css.root, className);

  const onHandleFetchLineItems = startDate => {
    if (fetchLineItemsInProgress) {
      return;
    }
    const start = getStartOf(startDate, 'day', timeZone);
    const end = getFirstPeriodEnd(start);
    onFetchTransactionLineItems({
      orderData: {
        bookingStart: start,
        bookingEnd: end,
      },
      listingId,
      isOwnListing,
    });
  };

  useEffect(() => {
    onHandleFetchLineItems(TODAY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFormSubmit = () => {
    const start = getStartOf(TODAY, 'day', timeZone);
    const end = getFirstPeriodEnd(start);
    onSubmit({
      bookingDates: {
        bookingStart: start,
        bookingEnd: end,
      },
    });
  };

  const start = getStartOf(TODAY, 'day', timeZone);
  const end = getFirstPeriodEnd(start);
  const breakdownData = { startDate: start, endDate: end };
  const showEstimatedBreakdown =
    lineItems && !fetchLineItemsInProgress && !fetchLineItemsError;
  const submitDisabled =
    fetchLineItemsInProgress || !lineItems || isOwnListing || hasActiveSubscription;

  return (
    <FinalForm
      onSubmit={onFormSubmit}
      render={formRenderProps => {
        const { handleSubmit } = formRenderProps;

        return (
          <Form className={classes} onSubmit={handleSubmit}>
            {hasActiveSubscription ? (
              <div className={css.activeSubscriptionBanner}>
                <FormattedMessage
                  id="SubscriptionOrderForm.activeSubscriptionWarning"
                  values={{
                    link: (
                      <NamedLink name="OrderDetailsPage" params={{ id: activeSubscriptionId }}>
                        <FormattedMessage id="SubscriptionOrderForm.viewSubscription" />
                      </NamedLink>
                    ),
                  }}
                />
              </div>
            ) : null}

            {fetchLineItemsError ? <FetchLineItemsError error={fetchLineItemsError} /> : null}

            {showEstimatedBreakdown ? (
              <div className={css.breakdownWrapper}>
                <H6 as="h3" className={css.bookingBreakdownTitle}>
                  <FormattedMessage id="SubscriptionOrderForm.priceBreakdownTitle" />
                </H6>
                <hr className={css.totalDivider} />
                <EstimatedCustomerBreakdownMaybe
                  breakdownData={breakdownData}
                  lineItems={lineItems}
                  timeZone={timeZone}
                  currency={listingPrice.currency}
                  marketplaceName={marketplaceName}
                  processName={processName}
                />
              </div>
            ) : null}

            <div className={css.submitButton}>
              <PrimaryButton
                type="submit"
                inProgress={fetchLineItemsInProgress}
                disabled={submitDisabled}
              >
                <FormattedMessage id="SubscriptionOrderForm.ctaButton" />
              </PrimaryButton>
            </div>

            <SubscriptionSubmitFinePrint
              payoutDetailsWarning={payoutDetailsWarning}
              isOwnListing={isOwnListing}
            />
          </Form>
        );
      }}
    />
  );
};

SubscriptionOrderForm.defaultProps = {
  rootClassName: null,
  className: null,
  price: null,
  hasActiveSubscription: false,
  activeSubscriptionId: null,
};

SubscriptionOrderForm.propTypes = {
  rootClassName: propTypes.className,
  className: propTypes.className,
  listingId: propTypes.uuid.isRequired,
  isOwnListing: propTypes.bool,
  marketplaceName: propTypes.string.isRequired,
  onFetchTransactionLineItems: propTypes.func.isRequired,
  lineItems: propTypes.array,
  fetchLineItemsInProgress: propTypes.bool,
  fetchLineItemsError: propTypes.error,
  onSubmit: propTypes.func.isRequired,
  timeZone: propTypes.string.isRequired,
  payoutDetailsWarning: propTypes.node,
  processName: propTypes.string,
  price: propTypes.money,
  hasActiveSubscription: propTypes.bool,
  activeSubscriptionId: propTypes.string,
};

export default SubscriptionOrderForm;
