const log = require('../log');
const { TRANSITIONS, ACTIVE_ENTRY_TRANSITIONS, METADATA_KEYS } = require('./subscriptionConstants');
const { getSubunitAmountFromMoneyLike } = require('./currency');
const {
  transitionTransaction,
  showTransaction,
  showListing,
  updateTransactionMetadata,
  findTransactionByStripeSubscriptionId,
  findActiveSubscriptionForListing,
  normalizeUuid,
} = require('./integrationSdk');
const {
  getPaymentIntentIdFromProtectedData,
  capturePaymentIntentIfNeeded,
  getPaymentMethodIdFromPaymentIntent,
  findOrCreateStripeCustomer,
  createMonthlyStripePrice,
  createStripeSubscription,
  cancelStripeSubscriptionAtPeriodEnd,
} = require('./subscriptionStripe');
const { getFirstPeriodEnd, getNextPeriodEnd } = require('./subscriptionDates');

const getUuidFromRef = ref => {
  if (!ref) {
    return null;
  }
  if (typeof ref === 'string') {
    return ref;
  }
  if (ref.uuid) {
    return ref.uuid;
  }
  if (ref.id) {
    return getUuidFromRef(ref.id);
  }
  return normalizeUuid(ref);
};

const getRelationship = (included, type, ref) => {
  const refUuid = getUuidFromRef(ref);
  if (!refUuid || !included) {
    return null;
  }
  return included.find(item => {
    if (item.type !== type) {
      return false;
    }
    return getUuidFromRef(item.id) === refUuid;
  });
};

const resolveListingForTransaction = async (apiData, listingRef) => {
  let listing = getRelationship(apiData.included, 'listing', listingRef);
  let monthlyAmount = getSubunitAmountFromMoneyLike(listing?.attributes?.price);

  if (monthlyAmount && listing) {
    return { listing, monthlyAmount };
  }

  const listingId = getUuidFromRef(listingRef);
  if (!listingId) {
    return { listing: null, monthlyAmount: null };
  }

  const listingResponse = await showListing(listingId);
  listing = listingResponse?.data?.data || null;
  monthlyAmount = getSubunitAmountFromMoneyLike(listing?.attributes?.price);

  return { listing, monthlyAmount };
};

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
 * Run a process transition. Provider/customer transitions must use the requester's
 * Marketplace SDK (the Integration API can only run operator transitions); operator
 * transitions fall back to the Integration API.
 *
 * @param {Object} args
 * @param {Object} [args.marketplaceSdk] - logged-in user's SDK for provider/customer transitions
 * @param {UUID} args.transactionId
 * @param {string} args.transition
 * @param {Object} [args.params]
 */
const runProcessTransition = ({ marketplaceSdk, transactionId, transition, params }) => {
  if (marketplaceSdk) {
    return marketplaceSdk.transactions.transition(
      { id: transactionId, transition, params: params || {} },
      { expand: true }
    );
  }
  return transitionTransaction({ transactionId, transition, params });
};

/**
 * Approve a subscription request: create the Stripe subscription and move the
 * Sharetribe transaction to `active` (which captures the first payment).
 *
 * This runs when the provider accepts (transition/accept-subscription via the
 * provider's Marketplace SDK) or as an operator-accept fallback
 * (transition/confirm-subscription via the Integration API).
 *
 * Stripe billing creation is idempotent: if the subscription already exists on
 * the transaction metadata (e.g. a prior attempt captured billing but failed to
 * transition), it is reused instead of re-created.
 *
 * @param {UUID|string} transactionId
 * @param {Object} [options]
 * @param {string} [options.paymentIntentId] - optional fallback PI id
 * @param {string} [options.transition] - transition to run (defaults to operator confirm)
 * @param {Object} [options.marketplaceSdk] - requester SDK for provider transitions
 */
const activateSubscription = async (transactionId, options = {}) => {
  const transition = options.transition || TRANSITIONS.CONFIRM_SUBSCRIPTION;
  const marketplaceSdk = options.marketplaceSdk || null;

  const txResponse = await showTransaction(transactionId);
  const apiData = txResponse.data;
  const transaction = apiData.data;

  assertLastTransition(transaction, TRANSITIONS.CONFIRM_PAYMENT);

  const protectedData = transaction.attributes.protectedData || {};
  const metadata = transaction.attributes.metadata || {};
  const payinTotal = transaction.attributes.payinTotal;

  const paymentIntentId =
    options.paymentIntentId || getPaymentIntentIdFromProtectedData(protectedData);
  if (!paymentIntentId) {
    const error = new Error('Stripe PaymentIntent not found on transaction.');
    error.status = 400;
    throw error;
  }

  let stripeCustomerId = metadata[METADATA_KEYS.STRIPE_CUSTOMER_ID];
  let stripeSubscriptionId = metadata[METADATA_KEYS.STRIPE_SUBSCRIPTION_ID];

  // Create Stripe billing only if it has not been created yet (idempotent).
  if (!stripeSubscriptionId) {
    const paymentMethodId = await getPaymentMethodIdFromPaymentIntent(paymentIntentId);
    if (!paymentMethodId) {
      const error = new Error('Payment method not found on PaymentIntent.');
      error.status = 400;
      throw error;
    }

    const customerRef = transaction.relationships?.customer?.data;
    const listingRef = transaction.relationships?.listing?.data;
    const customer = getRelationship(apiData.included, 'user', customerRef);
    const { listing, monthlyAmount } = await resolveListingForTransaction(apiData, listingRef);
    const booking = getBookingFromTransactionResponse(apiData);

    const bookingStart = booking?.attributes?.start;

    const customerEmail = customer?.attributes?.email;
    const customerName = customer?.attributes?.profile?.displayName;
    const sharetribeUserId = customer?.id?.uuid;

    if (!stripeCustomerId) {
      // findOrCreateStripeCustomer searches Stripe by metadata.sharetribeUserId first,
      // so repeated Accept attempts and multiple subscriptions all reuse one customer.
      const stripeCustomer = await findOrCreateStripeCustomer({
        email: customerEmail,
        name: customerName,
        sharetribeUserId,
      });
      stripeCustomerId = stripeCustomer.id;
    }

    const currency = payinTotal?.currency || listing?.attributes?.price?.currency;
    const listingTitle = listing?.attributes?.title || 'Subscription';

    if (!monthlyAmount) {
      const error = new Error('Listing monthly price not found for Stripe subscription.');
      error.status = 400;
      throw error;
    }

    const stripePrice = await createMonthlyStripePrice({
      amount: monthlyAmount,
      currency,
      productName: listingTitle,
      listingId: getUuidFromRef(listing?.id),
    });

    const stripeSubscription = await createStripeSubscription({
      customerId: stripeCustomerId,
      priceId: stripePrice.id,
      paymentMethodId,
      bookingStart,
      sharetribeTransactionId: transaction.id.uuid,
    });
    stripeSubscriptionId = stripeSubscription.id;

    await updateTransactionMetadata(transaction.id, {
      [METADATA_KEYS.STRIPE_CUSTOMER_ID]: stripeCustomerId,
      [METADATA_KEYS.STRIPE_SUBSCRIPTION_ID]: stripeSubscriptionId,
      [METADATA_KEYS.STRIPE_PRICE_ID]: stripePrice.id,
    });
  }

  await runProcessTransition({
    marketplaceSdk,
    transactionId: transaction.id,
    transition,
  });

  // Capture first payment if process version lacks stripe-capture on the transition.
  await capturePaymentIntentIfNeeded(paymentIntentId);

  log.info('Subscription activated', {
    transactionId: transaction.id.uuid,
    stripeSubscriptionId,
    transition,
  });

  return { stripeSubscriptionId, stripeCustomerId };
};

/**
 * Decline a subscription request (provider). Runs transition/decline-subscription
 * via the provider's Marketplace SDK, which refunds the preauthorized first payment.
 * No Stripe subscription exists yet at this point (it is created only on acceptance).
 *
 * @param {UUID|string} transactionId
 * @param {Object} [options]
 * @param {Object} [options.marketplaceSdk] - provider's SDK (required for the provider transition)
 */
const declineSubscription = async (transactionId, options = {}) => {
  const marketplaceSdk = options.marketplaceSdk || null;

  const txResponse = await showTransaction(transactionId);
  const transaction = txResponse.data.data;

  assertLastTransition(transaction, TRANSITIONS.CONFIRM_PAYMENT);

  await runProcessTransition({
    marketplaceSdk,
    transactionId: transaction.id,
    transition: TRANSITIONS.DECLINE_SUBSCRIPTION,
  });

  log.info('Subscription request declined', { transactionId: transaction.id.uuid });

  return { declined: true };
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

  if (ACTIVE_ENTRY_TRANSITIONS.includes(lastTransition)) {
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

  if (ACTIVE_ENTRY_TRANSITIONS.includes(lastTransition)) {
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
    TRANSITIONS.ACCEPT_SUBSCRIPTION,
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

/**
 * Guard against double-booking: throws a 409 if the customer already has a
 * non-final subscription transaction for the same listing.
 *
 * Call this before initiating a new subscription checkout (initiate-privileged).
 *
 * @param {string} customerId  - plain uuid string (from the logged-in user's SDK)
 * @param {string} listingId   - plain uuid string
 * @param {string} processName - e.g. 'subscription-rental'
 */
const checkForExistingSubscription = async (customerId, listingId, processName) => {
  const existing = await findActiveSubscriptionForListing(customerId, listingId, processName);
  if (existing) {
    const error = new Error(
      'You already have an active subscription for this listing. Only one subscription per listing is allowed.'
    );
    error.status = 409;
    error.statusText = error.message;
    error.existingTransactionId = normalizeUuid(existing.id);
    throw error;
  }
};

module.exports = {
  activateSubscription,
  declineSubscription,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handleSubscriptionDeleted,
  requestCancelAtPeriodEnd,
  checkForExistingSubscription,
};
