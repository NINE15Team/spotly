/**
 * Sharetribe subscription-rental process identifiers.
 * Must stay in sync with ext/transaction-processes/subscription-rental/process.edn
 */

const SUBSCRIPTION_PROCESS_NAME = 'subscription-rental';
const SUBSCRIPTION_PROCESS_ALIAS = `${SUBSCRIPTION_PROCESS_NAME}/release-5`;

const TRANSITIONS = {
  REQUEST_PAYMENT: 'transition/request-payment',
  CONFIRM_PAYMENT: 'transition/confirm-payment',
  // Provider approves/declines the subscription request.
  ACCEPT_SUBSCRIPTION: 'transition/accept-subscription',
  DECLINE_SUBSCRIPTION: 'transition/decline-subscription',
  // Acceptance window timed out (system).
  EXPIRE_ACCEPTANCE: 'transition/expire-acceptance',
  // Operator-accept fallback (Console / server on behalf of provider).
  CONFIRM_SUBSCRIPTION: 'transition/confirm-subscription',
  EXTEND_SUBSCRIPTION: 'transition/extend-subscription',
  PAYMENT_OVERDUE: 'transition/payment-overdue',
  REACTIVATE_SUBSCRIPTION: 'transition/reactivate-subscription',
  CANCEL_SUBSCRIPTION: 'transition/cancel-subscription',
  CANCEL_SUBSCRIPTION_FROM_OVERDUE: 'transition/cancel-subscription-from-overdue',
  EXPIRE: 'transition/expire',
  ABORT_SUBSCRIPTION: 'transition/abort-subscription',
};

// Transitions whose resulting state is an active (live-billing) subscription.
const ACTIVE_ENTRY_TRANSITIONS = [
  TRANSITIONS.ACCEPT_SUBSCRIPTION,
  TRANSITIONS.CONFIRM_SUBSCRIPTION,
  TRANSITIONS.EXTEND_SUBSCRIPTION,
];

const STATES = {
  PENDING_PAYMENT: 'state/pending-payment',
  PAYMENT_CONFIRMED: 'state/payment-confirmed',
  ACTIVE: 'state/active',
  PAYMENT_OVERDUE: 'state/payment-overdue',
  CANCELLED: 'state/cancelled',
  EXPIRED: 'state/expired',
};

const METADATA_KEYS = {
  STRIPE_CUSTOMER_ID: 'stripeCustomerId',
  STRIPE_SUBSCRIPTION_ID: 'stripeSubscriptionId',
  STRIPE_PRICE_ID: 'stripePriceId',
};

const isSubscriptionProcess = processAlias => {
  if (!processAlias || typeof processAlias !== 'string') {
    return false;
  }
  const processName = processAlias.split('/')[0];
  return processName === SUBSCRIPTION_PROCESS_NAME;
};

/**
 * Upgrade stale subscription aliases to the current release before initiating transactions.
 */
const resolveSubscriptionProcessAlias = processAlias => {
  if (!isSubscriptionProcess(processAlias)) {
    return processAlias;
  }
  return SUBSCRIPTION_PROCESS_ALIAS;
};

module.exports = {
  SUBSCRIPTION_PROCESS_NAME,
  SUBSCRIPTION_PROCESS_ALIAS,
  TRANSITIONS,
  ACTIVE_ENTRY_TRANSITIONS,
  STATES,
  METADATA_KEYS,
  isSubscriptionProcess,
  resolveSubscriptionProcessAlias,
};
