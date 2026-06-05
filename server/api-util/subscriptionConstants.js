/**
 * Sharetribe subscription-rental process identifiers.
 * Must stay in sync with ext/transaction-processes/subscription-rental/process.edn
 */

const SUBSCRIPTION_PROCESS_NAME = 'subscription-rental';
const SUBSCRIPTION_PROCESS_ALIAS = `${SUBSCRIPTION_PROCESS_NAME}/release-1`;

const TRANSITIONS = {
  REQUEST_PAYMENT: 'transition/request-payment',
  CONFIRM_PAYMENT: 'transition/confirm-payment',
  CONFIRM_SUBSCRIPTION: 'transition/confirm-subscription',
  EXTEND_SUBSCRIPTION: 'transition/extend-subscription',
  PAYMENT_OVERDUE: 'transition/payment-overdue',
  REACTIVATE_SUBSCRIPTION: 'transition/reactivate-subscription',
  CANCEL_SUBSCRIPTION: 'transition/cancel-subscription',
  CANCEL_SUBSCRIPTION_FROM_OVERDUE: 'transition/cancel-subscription-from-overdue',
  EXPIRE: 'transition/expire',
  ABORT_SUBSCRIPTION: 'transition/abort-subscription',
};

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

const BILLING_DAY_OF_MONTH = 1;

const isSubscriptionProcess = processAlias => {
  if (!processAlias || typeof processAlias !== 'string') {
    return false;
  }
  const processName = processAlias.split('/')[0];
  return processName === SUBSCRIPTION_PROCESS_NAME;
};

module.exports = {
  SUBSCRIPTION_PROCESS_NAME,
  SUBSCRIPTION_PROCESS_ALIAS,
  TRANSITIONS,
  STATES,
  METADATA_KEYS,
  BILLING_DAY_OF_MONTH,
  isSubscriptionProcess,
};
