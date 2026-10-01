/**
 * Sharetribe subscription-rental process identifiers.
 * Must stay in sync with ext/transaction-processes/subscription-rental/process.edn
 */

const SUBSCRIPTION_PROCESS_NAME = 'subscription-rental';
const SUBSCRIPTION_PROCESS_ALIAS = `${SUBSCRIPTION_PROCESS_NAME}/release-6`;

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
  EXPIRE_PAYMENT: 'transition/expire-payment',
  // Waiver self-loops (operator, via Integration API): write waiver status into
  // protected data WITHOUT changing state. They still become `lastTransition`,
  // so never gate on lastTransition directly — use getSubscriptionState().
  UPDATE_WAIVER_STATUS: 'transition/update-waiver-status',
  UPDATE_WAIVER_STATUS_FROM_ACTIVE: 'transition/update-waiver-status-from-active',
};

const STATES = {
  PENDING_PAYMENT: 'state/pending-payment',
  PAYMENT_CONFIRMED: 'state/payment-confirmed',
  ACTIVE: 'state/active',
  PAYMENT_OVERDUE: 'state/payment-overdue',
  CANCELLED: 'state/cancelled',
  EXPIRED: 'state/expired',
  PAYMENT_EXPIRED: 'state/payment-expired',
};

/**
 * Resulting state of each transition — mirrors the `:to` of every transition in
 * process.edn. Sharetribe exposes only `lastTransition`, not the state, so this
 * is how the server knows where a transaction is.
 */
const TRANSITION_TO_STATE = {
  [TRANSITIONS.REQUEST_PAYMENT]: STATES.PENDING_PAYMENT,
  [TRANSITIONS.EXPIRE_PAYMENT]: STATES.PAYMENT_EXPIRED,
  [TRANSITIONS.CONFIRM_PAYMENT]: STATES.PAYMENT_CONFIRMED,
  [TRANSITIONS.UPDATE_WAIVER_STATUS]: STATES.PAYMENT_CONFIRMED,
  [TRANSITIONS.ABORT_SUBSCRIPTION]: STATES.CANCELLED,
  [TRANSITIONS.ACCEPT_SUBSCRIPTION]: STATES.ACTIVE,
  [TRANSITIONS.DECLINE_SUBSCRIPTION]: STATES.CANCELLED,
  [TRANSITIONS.EXPIRE_ACCEPTANCE]: STATES.EXPIRED,
  [TRANSITIONS.CONFIRM_SUBSCRIPTION]: STATES.ACTIVE,
  [TRANSITIONS.EXTEND_SUBSCRIPTION]: STATES.ACTIVE,
  [TRANSITIONS.UPDATE_WAIVER_STATUS_FROM_ACTIVE]: STATES.ACTIVE,
  [TRANSITIONS.PAYMENT_OVERDUE]: STATES.PAYMENT_OVERDUE,
  [TRANSITIONS.REACTIVATE_SUBSCRIPTION]: STATES.ACTIVE,
  [TRANSITIONS.EXPIRE]: STATES.EXPIRED,
  [TRANSITIONS.CANCEL_SUBSCRIPTION]: STATES.CANCELLED,
  [TRANSITIONS.CANCEL_SUBSCRIPTION_FROM_OVERDUE]: STATES.CANCELLED,
};

const FINAL_STATES = [STATES.CANCELLED, STATES.EXPIRED, STATES.PAYMENT_EXPIRED];

/**
 * Current process state of a subscription transaction, derived from its last
 * transition. Returns null for an unknown transition.
 *
 * @param {Object} transaction Sharetribe transaction resource
 * @returns {string|null} one of STATES
 */
const getSubscriptionState = transaction => {
  const lastTransition = transaction?.attributes?.lastTransition;
  return TRANSITION_TO_STATE[lastTransition] || null;
};

const isSubscriptionInState = (transaction, ...states) =>
  states.includes(getSubscriptionState(transaction));

const isSubscriptionFinal = transaction => isSubscriptionInState(transaction, ...FINAL_STATES);

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
  STATES,
  TRANSITION_TO_STATE,
  FINAL_STATES,
  getSubscriptionState,
  isSubscriptionInState,
  isSubscriptionFinal,
  METADATA_KEYS,
  isSubscriptionProcess,
  resolveSubscriptionProcessAlias,
};
