import {
  TX_TRANSITION_ACTOR_CUSTOMER as CUSTOMER,
  TX_TRANSITION_ACTOR_PROVIDER as PROVIDER,
  CONDITIONAL_RESOLVER_WILDCARD,
  ConditionalResolver,
} from '../../transactions/transaction';

/**
 * State data for subscription-rental on TransactionPage.
 */
export const getStateDataForSubscriptionProcess = (txInfo, processInfo) => {
  const { transactionRole, subscriptionHandlers = {}, intl } = txInfo;
  const _ = CONDITIONAL_RESOLVER_WILDCARD;

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

  const { processName, processState, states } = processInfo;

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
    .cond([states.ACTIVE, CUSTOMER], () => ({
      processName,
      processState,
      showDetailCardHeadings: true,
      showActionButtons: !!(cancelButtonProps || portalButtonProps),
      primaryButtonProps: cancelButtonProps,
      secondaryButtonProps: portalButtonProps,
    }))
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
  return { ...result, showWaiverStatusPanel: waiverPanelStates.includes(processState) };
};
