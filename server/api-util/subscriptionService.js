const log = require('../log');
const { TRANSITIONS, METADATA_KEYS } = require('./subscriptionConstants');
const {
  transitionTransaction,
  showTransaction,
  updateTransactionMetadata,
  findTransactionByStripeSubscriptionId,
} = require('./integrationSdk');
const {
  getPaymentIntentIdFromProtectedData,
  getPaymentMethodIdFromPaymentIntent,
  createStripeCustomer,
  createMonthlyStripePrice,
  createStripeSubscription,
  cancelStripeSubscriptionAtPeriodEnd,
} = require('./subscriptionStripe');
const { getFirstPeriodEnd, getNextPeriodEnd } = require('./subscriptionDates');

const getRelationship = (included, type, id) =>
  included?.find(item => item.type === type && item.id?.uuid === id?.uuid);

const getBookingFromTransactionResponse = apiData => {
  const transaction = apiData.data;
  const bookingRef = transaction?.relationships?.booking?.data;
  if (!bookingRef) {
    return null;
  }
  return getRelationship(apiData.included, 'booking', bookingRef);
};

const assertLastTransition = (transaction, expectedTransition) => {
  const lastTransition = transaction?.attributes?.lastTransition;
  if (lastTransition !== expectedTransition) {
    const error = new Error(
      `Invalid transaction state. Expected last transition ${expectedTransition}, got ${lastTransition}.`
    );
    error.status = 409;
    error.statusText = error.message;
    throw error;
  }
};

/**
 * After customer confirm-payment: create Stripe subscription and activate Sharetribe booking.
 *
 * @param {UUID|string} transactionId
 * @param {Object} [options]
 * @param {string} [options.paymentIntentId] - optional fallback from checkout (Stripe PI id)
 */
const activateSubscription = async (transactionId, options = {}) => {
  const txResponse = await showTransaction(transactionId);
  const apiData = txResponse.data;
  const transaction = apiData.data;

  assertLastTransition(transaction, TRANSITIONS.CONFIRM_PAYMENT);

  const protectedData = transaction.attributes.protectedData || {};
  const metadata = transaction.attributes.metadata || {};
  const payinTotal = transaction.attributes.payinTotal;

  if (metadata[METADATA_KEYS.STRIPE_SUBSCRIPTION_ID]) {
    const error = new Error('Subscription already activated for this transaction.');
    error.status = 409;
    throw error;
  }

  const paymentIntentId =
    options.paymentIntentId || getPaymentIntentIdFromProtectedData(protectedData);
  if (!paymentIntentId) {
    const error = new Error('Stripe PaymentIntent not found on transaction.');
    error.status = 400;
    throw error;
  }

  const paymentMethodId = await getPaymentMethodIdFromPaymentIntent(paymentIntentId);
  if (!paymentMethodId) {
    const error = new Error('Payment method not found on PaymentIntent.');
    error.status = 400;
    throw error;
  }

  const customerRef = transaction.relationships?.customer?.data;
  const listingRef = transaction.relationships?.listing?.data;
  const customer = getRelationship(apiData.included, 'user', customerRef);
  const listing = getRelationship(apiData.included, 'listing', listingRef);
  const booking = getBookingFromTransactionResponse(apiData);

  const bookingStart = booking?.attributes?.start;
  const bookingEnd = booking?.attributes?.end || getFirstPeriodEnd(bookingStart);

  const customerEmail = customer?.attributes?.email;
  const customerName = customer?.attributes?.profile?.displayName;
  const sharetribeUserId = customer?.id?.uuid;

  let stripeCustomerId = metadata[METADATA_KEYS.STRIPE_CUSTOMER_ID];
  if (!stripeCustomerId) {
    const stripeCustomer = await createStripeCustomer({
      email: customerEmail,
      name: customerName,
      sharetribeUserId,
    });
    stripeCustomerId = stripeCustomer.id;
  }

  const monthlyAmount = listing?.attributes?.price?.amount;
  const currency = payinTotal?.currency || listing?.attributes?.price?.currency;
  const listingTitle = listing?.attributes?.title || 'Subscription';

  const stripePrice = await createMonthlyStripePrice({
    amount: monthlyAmount,
    currency,
    productName: listingTitle,
    listingId: listing?.id?.uuid,
  });

  const stripeSubscription = await createStripeSubscription({
    customerId: stripeCustomerId,
    priceId: stripePrice.id,
    paymentMethodId,
    bookingStart,
    sharetribeTransactionId: transaction.id.uuid,
  });

  await updateTransactionMetadata(transaction.id, {
    [METADATA_KEYS.STRIPE_CUSTOMER_ID]: stripeCustomerId,
    [METADATA_KEYS.STRIPE_SUBSCRIPTION_ID]: stripeSubscription.id,
    [METADATA_KEYS.STRIPE_PRICE_ID]: stripePrice.id,
  });

  await transitionTransaction({
    transactionId: transaction.id,
    transition: TRANSITIONS.CONFIRM_SUBSCRIPTION,
  });

  log.info('Subscription activated', {
    transactionId: transaction.id.uuid,
    stripeSubscriptionId: stripeSubscription.id,
    bookingEnd,
  });

  return { stripeSubscriptionId: stripeSubscription.id, stripeCustomerId };
};

/**
 * Extend booking availability for the next monthly period.
 */
const extendSubscriptionPeriod = async transaction => {
  const txResponse = await showTransaction(transaction.id);
  const booking = getBookingFromTransactionResponse(txResponse.data);
  const bookingStart = booking?.attributes?.start;
  const currentEnd = booking?.attributes?.end;
  const newEnd = getNextPeriodEnd(currentEnd || getFirstPeriodEnd(bookingStart));

  await transitionTransaction({
    transactionId: transaction.id,
    transition: TRANSITIONS.EXTEND_SUBSCRIPTION,
    params: {
      bookingStart,
      bookingEnd: newEnd,
    },
  });
};

const handleInvoicePaid = async stripeSubscriptionId => {
  const transaction = await findTransactionByStripeSubscriptionId(stripeSubscriptionId);
  if (!transaction) {
    log.warn('invoice.paid: no transaction for subscription', { stripeSubscriptionId });
    return;
  }

  const lastTransition = transaction.attributes.lastTransition;

  if (lastTransition === TRANSITIONS.PAYMENT_OVERDUE) {
    const txResponse = await showTransaction(transaction.id);
    const booking = getBookingFromTransactionResponse(txResponse.data);
    const bookingStart = booking?.attributes?.start;
    const currentEnd = booking?.attributes?.end;
    const newEnd = getNextPeriodEnd(currentEnd || getFirstPeriodEnd(bookingStart));

    await transitionTransaction({
      transactionId: transaction.id,
      transition: TRANSITIONS.REACTIVATE_SUBSCRIPTION,
      params: { bookingStart, bookingEnd: newEnd },
    });
    log.info('Subscription reactivated after payment', { transactionId: transaction.id.uuid });
    return;
  }

  if (
    lastTransition === TRANSITIONS.CONFIRM_SUBSCRIPTION ||
    lastTransition === TRANSITIONS.EXTEND_SUBSCRIPTION
  ) {
    await extendSubscriptionPeriod(transaction);
    log.info('Subscription period extended', { transactionId: transaction.id.uuid });
  }
};

const handleInvoicePaymentFailed = async stripeSubscriptionId => {
  const transaction = await findTransactionByStripeSubscriptionId(stripeSubscriptionId);
  if (!transaction) {
    log.warn('invoice.payment_failed: no transaction', { stripeSubscriptionId });
    return;
  }

  const lastTransition = transaction.attributes.lastTransition;
  if (lastTransition === TRANSITIONS.PAYMENT_OVERDUE) {
    return;
  }

  if (
    lastTransition === TRANSITIONS.CONFIRM_SUBSCRIPTION ||
    lastTransition === TRANSITIONS.EXTEND_SUBSCRIPTION
  ) {
    await transitionTransaction({
      transactionId: transaction.id,
      transition: TRANSITIONS.PAYMENT_OVERDUE,
    });
    log.info('Subscription marked payment-overdue', { transactionId: transaction.id.uuid });
  }
};

const handleSubscriptionDeleted = async stripeSubscriptionId => {
  const transaction = await findTransactionByStripeSubscriptionId(stripeSubscriptionId);
  if (!transaction) {
    log.warn('customer.subscription.deleted: no transaction', { stripeSubscriptionId });
    return;
  }

  const lastTransition = transaction.attributes.lastTransition;

  if (
    lastTransition === TRANSITIONS.CANCEL_SUBSCRIPTION ||
    lastTransition === TRANSITIONS.CANCEL_SUBSCRIPTION_FROM_OVERDUE ||
    lastTransition === TRANSITIONS.EXPIRE
  ) {
    return;
  }

  const cancelTransition =
    lastTransition === TRANSITIONS.PAYMENT_OVERDUE
      ? TRANSITIONS.CANCEL_SUBSCRIPTION_FROM_OVERDUE
      : TRANSITIONS.CANCEL_SUBSCRIPTION;

  await transitionTransaction({
    transactionId: transaction.id,
    transition: cancelTransition,
  });

  log.info('Subscription cancelled in Sharetribe', {
    transactionId: transaction.id.uuid,
    transition: cancelTransition,
  });
};

/**
 * Request Stripe cancel at period end (Sharetribe transition happens on webhook).
 */
const requestCancelAtPeriodEnd = async transactionId => {
  const txResponse = await showTransaction(transactionId);
  const transaction = txResponse.data.data;
  const metadata = transaction.attributes.metadata || {};
  const stripeSubscriptionId = metadata[METADATA_KEYS.STRIPE_SUBSCRIPTION_ID];

  if (!stripeSubscriptionId) {
    const error = new Error('No Stripe subscription on this transaction.');
    error.status = 400;
    throw error;
  }

  const lastTransition = transaction.attributes.lastTransition;
  const allowed = [
    TRANSITIONS.CONFIRM_SUBSCRIPTION,
    TRANSITIONS.EXTEND_SUBSCRIPTION,
    TRANSITIONS.PAYMENT_OVERDUE,
    TRANSITIONS.REACTIVATE_SUBSCRIPTION,
  ];
  if (!allowed.includes(lastTransition)) {
    const error = new Error('Subscription cannot be cancelled in the current state.');
    error.status = 409;
    throw error;
  }

  await cancelStripeSubscriptionAtPeriodEnd(stripeSubscriptionId);
  return { cancelAtPeriodEnd: true, stripeSubscriptionId };
};

module.exports = {
  activateSubscription,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handleSubscriptionDeleted,
  requestCancelAtPeriodEnd,
};
