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
  } = subscriptionHandlers;

  const { processName, processState, states } = processInfo;

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

  return new ConditionalResolver([processState, transactionRole])
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
};
