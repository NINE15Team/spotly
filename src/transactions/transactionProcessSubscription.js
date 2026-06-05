/**
 * Transaction process graph for subscription rentals:
 *   - subscription-rental
 */

export const transitions = {
  REQUEST_PAYMENT: 'transition/request-payment',
  EXPIRE_PAYMENT: 'transition/expire-payment',
  CONFIRM_PAYMENT: 'transition/confirm-payment',
  ABORT_SUBSCRIPTION: 'transition/abort-subscription',
  CONFIRM_SUBSCRIPTION: 'transition/confirm-subscription',
  EXTEND_SUBSCRIPTION: 'transition/extend-subscription',
  PAYMENT_OVERDUE: 'transition/payment-overdue',
  REACTIVATE_SUBSCRIPTION: 'transition/reactivate-subscription',
  EXPIRE: 'transition/expire',
  CANCEL_SUBSCRIPTION: 'transition/cancel-subscription',
  CANCEL_SUBSCRIPTION_FROM_OVERDUE: 'transition/cancel-subscription-from-overdue',
};

export const states = {
  INITIAL: 'initial',
  PENDING_PAYMENT: 'pending-payment',
  PAYMENT_EXPIRED: 'payment-expired',
  PAYMENT_CONFIRMED: 'payment-confirmed',
  ACTIVE: 'active',
  PAYMENT_OVERDUE: 'payment-overdue',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
};

export const graph = {
  id: 'subscription-rental/release-1',
  initial: states.INITIAL,
  states: {
    [states.INITIAL]: {
      on: {
        [transitions.REQUEST_PAYMENT]: states.PENDING_PAYMENT,
      },
    },
    [states.PENDING_PAYMENT]: {
      on: {
        [transitions.EXPIRE_PAYMENT]: states.PAYMENT_EXPIRED,
        [transitions.CONFIRM_PAYMENT]: states.PAYMENT_CONFIRMED,
      },
    },
    [states.PAYMENT_EXPIRED]: {},
    [states.PAYMENT_CONFIRMED]: {
      on: {
        [transitions.ABORT_SUBSCRIPTION]: states.CANCELLED,
        [transitions.CONFIRM_SUBSCRIPTION]: states.ACTIVE,
      },
    },
    [states.ACTIVE]: {
      on: {
        [transitions.EXTEND_SUBSCRIPTION]: states.ACTIVE,
        [transitions.PAYMENT_OVERDUE]: states.PAYMENT_OVERDUE,
        [transitions.CANCEL_SUBSCRIPTION]: states.CANCELLED,
      },
    },
    [states.PAYMENT_OVERDUE]: {
      on: {
        [transitions.REACTIVATE_SUBSCRIPTION]: states.ACTIVE,
        [transitions.EXPIRE]: states.EXPIRED,
        [transitions.CANCEL_SUBSCRIPTION_FROM_OVERDUE]: states.CANCELLED,
      },
    },
    [states.CANCELLED]: { type: 'final' },
    [states.EXPIRED]: { type: 'final' },
  },
};

export const isRelevantPastTransition = transition => {
  return [
    transitions.CONFIRM_PAYMENT,
    transitions.CONFIRM_SUBSCRIPTION,
    transitions.EXTEND_SUBSCRIPTION,
    transitions.PAYMENT_OVERDUE,
    transitions.REACTIVATE_SUBSCRIPTION,
    transitions.CANCEL_SUBSCRIPTION,
    transitions.CANCEL_SUBSCRIPTION_FROM_OVERDUE,
    transitions.EXPIRE,
    transitions.ABORT_SUBSCRIPTION,
  ].includes(transition);
};

export const isCustomerReview = () => false;
export const isProviderReview = () => false;

export const isPrivileged = transition => {
  return [transitions.REQUEST_PAYMENT].includes(transition);
};

export const isCompleted = transition => {
  return [transitions.CANCEL_SUBSCRIPTION, transitions.CANCEL_SUBSCRIPTION_FROM_OVERDUE].includes(
    transition
  );
};

export const isRefunded = transition => {
  return [
    transitions.EXPIRE_PAYMENT,
    transitions.ABORT_SUBSCRIPTION,
    transitions.EXPIRE,
  ].includes(transition);
};

export const statesNeedingProviderAttention = [];
export const statesNeedingCustomerAttention = [states.PAYMENT_OVERDUE];
