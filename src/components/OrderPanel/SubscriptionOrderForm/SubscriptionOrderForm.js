import React, { useState, useEffect } from 'react';
import { Form as FinalForm } from 'react-final-form';
import classNames from 'classnames';

import { FormattedMessage, useIntl } from '../../../util/reactIntl';
import { required, composeValidators } from '../../../util/validators';
import { getStartOf, isDateSameOrAfter } from '../../../util/dates';
import { propTypes } from '../../../util/types';
import { getFirstPeriodEnd } from '../../../util/subscriptionDates';
import { SUBSCRIPTION_PROCESS_NAME } from '../../../transactions/transaction';

import { Form, PrimaryButton, FieldSingleDatePicker, H6 } from '../../../components';

import EstimatedCustomerBreakdownMaybe from '../EstimatedCustomerBreakdownMaybe';
import FetchLineItemsError from '../FetchLineItemsError/FetchLineItemsError';
import SubscriptionSubmitFinePrint from './SubscriptionSubmitFinePrint';

import css from './SubscriptionOrderForm.module.css';

const TODAY = new Date();

/**
 * Order form for subscription-rental listings (monthly, start date + prorated first period).
 */
const SubscriptionOrderForm = props => {
  const intl = useIntl();
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
    dayCountAvailableForBooking = 90,
    payoutDetailsWarning,
    processName = SUBSCRIPTION_PROCESS_NAME,
  } = props;

  const [bookingStartDate, setBookingStartDate] = useState(TODAY);

  const classes = classNames(rootClassName || css.root, className);

  const endOfRange = date =>
    getStartOf(date, 'day', timeZone, dayCountAvailableForBooking, 'days');

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

  const onFormSubmit = values => {
    const startDate = values.bookingStartDate?.date || values.bookingStartDate;
    const start = getStartOf(startDate, 'day', timeZone);
    const end = getFirstPeriodEnd(start);
    onSubmit({
      bookingDates: {
        bookingStart: start,
        bookingEnd: end,
      },
    });
  };

  return (
    <FinalForm
      onSubmit={onFormSubmit}
      initialValues={{ bookingStartDate: TODAY }}
      render={formRenderProps => {
        const { handleSubmit, values, form } = formRenderProps;
        const startDate = values.bookingStartDate;

        const start = startDate ? getStartOf(startDate, 'day', timeZone) : null;
        const end = start ? getFirstPeriodEnd(start) : null;

        const breakdownData =
          start && end
            ? {
                bookingStart: start,
                bookingEnd: end,
              }
            : null;

        const showEstimatedBreakdown =
          breakdownData && lineItems && !fetchLineItemsInProgress && !fetchLineItemsError;

        const submitDisabled = fetchLineItemsInProgress || !lineItems || isOwnListing;

        return (
          <Form className={classes} onSubmit={handleSubmit}>
            <H6 as="h3" className={css.bookingDates}>
              <FormattedMessage id="SubscriptionOrderForm.subscriptionStartTitle" />
            </H6>
            <p className={css.info}>
              <FormattedMessage id="SubscriptionOrderForm.subscriptionStartInfo" />
            </p>

            <FieldSingleDatePicker
              name="bookingStartDate"
              id={`${listingId.uuid}_subscriptionStart`}
              label={intl.formatMessage({ id: 'SubscriptionOrderForm.startDateLabel' })}
              placeholderText={intl.formatMessage({
                id: 'SubscriptionOrderForm.startDatePlaceholder',
              })}
              format={v =>
                v && v.date ? { date: v.date } : v && v instanceof Date ? { date: v } : { date: v }
              }
              parse={v => {
                const date = v && v.date ? v.date : v;
                return date;
              }}
              useMobileMargins
              validate={composeValidators(
                required(intl.formatMessage({ id: 'SubscriptionOrderForm.startDateRequired' }))
              )}
              isDayBlocked={day => {
                const dayInListingTZ = getStartOf(day, 'day', timeZone);
                return !isDateSameOrAfter(dayInListingTZ, TODAY);
              }}
              isOutsideRange={day => {
                const dayInListingTZ = getStartOf(day, 'day', timeZone);
                return (
                  !isDateSameOrAfter(dayInListingTZ, TODAY) ||
                  !isDateSameOrAfter(endOfRange(TODAY), dayInListingTZ)
                );
              }}
              showPreviousMonthStepper={isDateSameOrAfter(
                getStartOf(TODAY, 'month', timeZone, -1, 'months'),
                getStartOf(bookingStartDate, 'month', timeZone)
              )}
              showNextMonthStepper={isDateSameOrAfter(
                endOfRange(TODAY),
                getStartOf(bookingStartDate, 'month', timeZone, 1, 'months')
              )}
              onChange={date => {
                const updated = date.date || date;
                setBookingStartDate(updated);
                onHandleFetchLineItems(updated);
              }}
            />

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
              <PrimaryButton type="submit" inProgress={fetchLineItemsInProgress} disabled={submitDisabled}>
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
  dayCountAvailableForBooking: propTypes.number,
  payoutDetailsWarning: propTypes.node,
  processName: propTypes.string,
  price: propTypes.money,
};

export default SubscriptionOrderForm;
