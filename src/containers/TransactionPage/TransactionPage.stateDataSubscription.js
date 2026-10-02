import {
  TX_TRANSITION_ACTOR_CUSTOMER as CUSTOMER,
  TX_TRANSITION_ACTOR_PROVIDER as PROVIDER,
  CONDITIONAL_RESOLVER_WILDCARD,
  ConditionalResolver,
} from '../../transactions/transaction';

// Written by the server (requestCancelAtPeriodEnd / customer.subscription.updated
// webhook) when Stripe has cancel_at_period_end set. The process state stays
// `active` until period end, so this is the only signal that a cancellation is
// pending.
const METADATA_CANCEL_AT_PERIOD_END = 'cancelAtPeriodEnd';
const METADATA_CANCEL_AT = 'cancelAt';

// Display-only pseudo state used for translation keys. Not a process state.
export const ACTIVE_CANCELLING_STATE_KEY = 'active-cancelling';

export const getPendingCancellation = transaction => {
  const metadata = transaction?.attributes?.metadata || {};
  if (!metadata[METADATA_CANCEL_AT_PERIOD_END]) {
    return null;
  }
  const raw = metadata[METADATA_CANCEL_AT];
  const cancelAt = raw ? new Date(raw) : null;
  return { cancelAt: cancelAt && !Number.isNaN(cancelAt.getTime()) ? cancelAt : null };
};

/**
 * State data for subscription-rental on TransactionPage.
 */
export const getStateDataForSubscriptionProcess = (txInfo, processInfo) => {
  const { transaction, transactionRole, subscriptionHandlers = {}, intl } = txInfo;
  const { processName, processState, states } = processInfo;
  const _ = CONDITIONAL_RESOLVER_WILDCARD;

  const pendingCancellation = getPendingCancellation(transaction);
  const isCancelling = !!pendingCancellation;
  const cancelAtFormatted =
    pendingCancellation?.cancelAt && intl
      ? intl.formatDate(pendingCancellation.cancelAt, {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : null;

  // Heading override while a cancellation is scheduled. Falls back to the
  // generic "ends at period end" copy if the date is missing.
  const cancellingHeading = isCancelling
    ? {
        titleStateKey: cancelAtFormatted
          ? ACTIVE_CANCELLING_STATE_KEY
          : `${ACTIVE_CANCELLING_STATE_KEY}-no-date`,
        titleValues: { cancelAt: cancelAtFormatted },
      }
    : {};

  // Activity-feed copy for the cancellation-intent self-loops. These are
  // operator transitions, so the feed's generic "{actor} did X" would read
  // "operator"; the copy names the customer explicitly instead. The end date
  // is only shown while the request is still active (a later resume clears it).
  const role = transactionRole === PROVIDER ? 'provider' : 'customer';
  const requestKey = isCancelling && cancelAtFormatted ? 'request-cancellation' : 'request-cancellation-no-date';
  const feedValues = { cancelAt: cancelAtFormatted };
  const transitionMessages = [
    {
      transition: 'transition/request-cancellation',
      translationId: `TransactionPage.ActivityFeed.${processName}.${requestKey}.${role}`,
      values: feedValues,
    },
    {
      transition: 'transition/request-cancellation-from-overdue',
      translationId: `TransactionPage.ActivityFeed.${processName}.${requestKey}.${role}`,
      values: feedValues,
    },
    {
      transition: 'transition/resume-subscription',
      translationId: `TransactionPage.ActivityFeed.${processName}.resume-subscription.${role}`,
    },
    {
      transition: 'transition/resume-subscription-from-overdue',
      translationId: `TransactionPage.ActivityFeed.${processName}.resume-subscription.${role}`,
    },
  ];

  const {
    cancelInProgress,
    cancelError,
    portalInProgress,
    portalError,
    onCancelSubscription,
    onOpenBillingPortal,
    acceptInProgress,
    declineInProgress,
    acceptError,
    declineError,
    onAcceptSubscription,
    onDeclineSubscription,
  } = subscriptionHandlers;

  const acceptButtonProps =
    onAcceptSubscription && intl
      ? {
          inProgress: acceptInProgress,
          error: acceptError,
          onAction: onAcceptSubscription,
          buttonText: intl.formatMessage({
            id: 'TransactionPage.subscription-rental.provider.acceptSubscription',
          }),
          errorText: intl.formatMessage({
            id: 'TransactionPage.subscription-rental.provider.acceptSubscriptionError',
          }),
        }
      : null;

  const declineButtonProps =
    onDeclineSubscription && intl
      ? {
          inProgress: declineInProgress,
          error: declineError,
          onAction: onDeclineSubscription,
          buttonText: intl.formatMessage({
            id: 'TransactionPage.subscription-rental.provider.declineSubscription',
          }),
          errorText: intl.formatMessage({
            id: 'TransactionPage.subscription-rental.provider.declineSubscriptionError',
          }),
        }
      : null;

  const cancelButtonProps =
    onCancelSubscription && intl
      ? {
          inProgress: cancelInProgress,
          error: cancelError,
          onAction: onCancelSubscription,
          buttonText: intl.formatMessage({
            id: 'TransactionPage.subscription-rental.customer.cancelSubscription',
          }),
          errorText: intl.formatMessage({
            id: 'TransactionPage.subscription-rental.customer.cancelSubscriptionError',
          }),
        }
      : null;

  const portalButtonProps =
    onOpenBillingPortal && intl
      ? {
          inProgress: portalInProgress,
          error: portalError,
          onAction: onOpenBillingPortal,
          buttonText: intl.formatMessage({
            id: 'TransactionPage.subscription-rental.customer.updatePaymentMethod',
          }),
          errorText: intl.formatMessage({
            id: 'TransactionPage.subscription-rental.customer.updatePaymentMethodError',
          }),
        }
      : null;

  const result = new ConditionalResolver([processState, transactionRole])
    .cond([states.PAYMENT_OVERDUE, CUSTOMER], () => ({
      processName,
      processState,
      showDetailCardHeadings: true,
      showExtraInfo: true,
      showActionButtons: !!portalButtonProps,
      primaryButtonProps: portalButtonProps,
    }))
    .cond([states.ACTIVE, CUSTOMER], () => {
      // Once cancellation is scheduled there is nothing left to cancel; only
      // the billing portal (where the customer can resume) remains useful.
      if (isCancelling) {
        return {
          processName,
          processState,
          ...cancellingHeading,
          showDetailCardHeadings: true,
          showActionButtons: !!portalButtonProps,
          primaryButtonProps: portalButtonProps,
        };
      }
      return {
        processName,
        processState,
        showDetailCardHeadings: true,
        showActionButtons: !!(cancelButtonProps || portalButtonProps),
        primaryButtonProps: cancelButtonProps,
        secondaryButtonProps: portalButtonProps,
      };
    })
    .cond([states.PAYMENT_CONFIRMED, CUSTOMER], () => ({
      processName,
      processState,
      showDetailCardHeadings: true,
      showExtraInfo: true,
    }))
    .cond([states.PAYMENT_CONFIRMED, PROVIDER], () => ({
      processName,
      processState,
      showDetailCardHeadings: true,
      showExtraInfo: true,
      showActionButtons: !!(acceptButtonProps || declineButtonProps),
      primaryButtonProps: acceptButtonProps,
      secondaryButtonProps: declineButtonProps,
    }))
    .cond([states.ACTIVE, PROVIDER], () => ({
      processName,
      processState,
      ...cancellingHeading,
      showDetailCardHeadings: true,
    }))
    .cond([states.PAYMENT_OVERDUE, PROVIDER], () => ({
      processName,
      processState,
      showDetailCardHeadings: true,
    }))
    .cond([states.CANCELLED, _], () => ({
      processName,
      processState,
      showDetailCardHeadings: true,
    }))
    .cond([states.EXPIRED, _], () => ({
      processName,
      processState,
      showDetailCardHeadings: true,
    }))
    .default(() => ({
      processName,
      processState,
      showDetailCardHeadings: true,
    }))
    .resolve();

  // Multi-participant waiver signing: show the status panel while a subscription
  // is awaiting approval (payment-confirmed) or live (active).
  const waiverPanelStates = [states.PAYMENT_CONFIRMED, states.ACTIVE];
  return {
    ...result,
    transitionMessages,
    showWaiverStatusPanel: waiverPanelStates.includes(processState),
  };
};
