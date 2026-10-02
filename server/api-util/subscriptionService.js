const log = require('../log');
const {
  TRANSITIONS,
  STATES,
  METADATA_KEYS,
  getSubscriptionState,
  isSubscriptionInState,
  isSubscriptionFinal,
} = require('./subscriptionConstants');
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
  resolveSubscriptionStripeCustomer,
  createMonthlyStripePrice,
  createStripeSubscription,
  cancelStripeSubscriptionAtPeriodEnd,
  rethrowStripeError,
} = require('./subscriptionStripe');
const { getTaxAddressFromListing } = require('./taxAddress');
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

const unixToIso = seconds =>
  typeof seconds === 'number' && Number.isFinite(seconds)
    ? new Date(seconds * 1000).toISOString()
    : null;

const toIsoMaybe = value => {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

// API versions from 2025-03-31 moved current_period_end from the subscription
// onto each subscription item; support both shapes.
const getStripePeriodEndIso = stripeSubscription => {
  if (!stripeSubscription) {
    return null;
  }
  const direct = unixToIso(stripeSubscription.current_period_end);
  if (direct) {
    return direct;
  }
  const items = stripeSubscription.items?.data || [];
  const ends = items.map(item => item.current_period_end).filter(Number.isFinite);
  return ends.length ? unixToIso(Math.max(...ends)) : null;
};

const getBookingFromTransactionResponse = apiData => {
  const transaction = apiData.data;
  const bookingRef = transaction?.relationships?.booking?.data;
  if (!bookingRef) {
    return null;
  }
  return getRelationship(apiData.included, 'booking', bookingRef);
};

// Gate on the derived STATE, never on lastTransition: waiver self-loop
// transitions (update-waiver-status*) overwrite lastTransition without moving
// the transaction, and would otherwise make every gate below reject.
const assertSubscriptionState = (transaction, ...expectedStates) => {
  const state = getSubscriptionState(transaction);
  if (!expectedStates.includes(state)) {
    const error = new Error(
      `Invalid transaction state. Expected ${expectedStates.join(
        ' or '
      )}, got ${state} (last transition ${transaction?.attributes?.lastTransition}).`
    );
    error.status = 409;
    error.statusText = error.message;
    error.data = { state, lastTransition: transaction?.attributes?.lastTransition };
    throw error;
  }
};

const isInvalidTransitionError = error => {
  const errors = error?.data?.errors;
  if (!Array.isArray(errors)) {
    return false;
  }
  return errors.some(e => e.code === 'transaction-invalid-transition');
};

/**
 * Run a process transition. Provider/customer transitions must use the requester's
 * Marketplace SDK (the Integration API can only run operator transitions); operator
 * transitions fall back to the Integration API.
 *
 * When a provider transition is not defined on the transaction's process version
 * (common for checkouts started before merchant-approval was deployed), the server
 * retries with the matching operator fallback transition.
 *
 * @param {Object} args
 * @param {Object} [args.marketplaceSdk] - logged-in user's SDK for provider/customer transitions
 * @param {UUID} args.transactionId
 * @param {string} args.transition
 * @param {string} [args.operatorFallbackTransition] - operator transition if provider transition is unavailable
 * @param {Object} [args.params]
 */
const runProcessTransition = async ({
  marketplaceSdk,
  transactionId,
  transition,
  operatorFallbackTransition,
  params,
}) => {
  const id = normalizeUuid(transactionId);
  if (!id) {
    const error = new Error('Invalid transaction id for transition.');
    error.status = 400;
    throw error;
  }

  const transitionParams = params || {};
  const transitionBody = { id, transition, params: transitionParams };

  if (!marketplaceSdk) {
    return transitionTransaction({ transactionId: id, transition, params: transitionParams });
  }

  try {
    return await marketplaceSdk.transactions.transition(transitionBody, { expand: true });
  } catch (error) {
    if (operatorFallbackTransition && isInvalidTransitionError(error)) {
      log.warn('Provider transition unavailable on process version; using operator fallback', {
        transition,
        operatorFallbackTransition,
        transactionId: id,
      });
      return transitionTransaction({
        transactionId: id,
        transition: operatorFallbackTransition,
        params: transitionParams,
      });
    }
    throw error;
  }
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

  assertSubscriptionState(transaction, STATES.PAYMENT_CONFIRMED);

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
    try {
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

      stripeCustomerId = await resolveSubscriptionStripeCustomer({
        paymentMethodId,
        paymentIntentId,
        existingCustomerId: stripeCustomerId,
        email: customerEmail,
        name: customerName,
        sharetribeUserId,
      });

      if (!metadata[METADATA_KEYS.STRIPE_CUSTOMER_ID]) {
        await updateTransactionMetadata(transaction.id, {
          [METADATA_KEYS.STRIPE_CUSTOMER_ID]: stripeCustomerId,
        });
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

      // Facility tax address for Stripe Tax on renewals (listing-based sourcing).
      const listingTax = await getTaxAddressFromListing(listing);
      const listingTaxAddress = listingTax?.address || null;

      const stripeSubscription = await createStripeSubscription({
        customerId: stripeCustomerId,
        priceId: stripePrice.id,
        paymentMethodId,
        bookingStart,
        sharetribeTransactionId: transaction.id.uuid,
        taxAddress: listingTaxAddress,
        listingTitle,
      });
      stripeSubscriptionId = stripeSubscription.id;

      await updateTransactionMetadata(transaction.id, {
        [METADATA_KEYS.STRIPE_CUSTOMER_ID]: stripeCustomerId,
        [METADATA_KEYS.STRIPE_SUBSCRIPTION_ID]: stripeSubscriptionId,
        [METADATA_KEYS.STRIPE_PRICE_ID]: stripePrice.id,
      });
    } catch (error) {
      rethrowStripeError(error);
    }
  }

  await runProcessTransition({
    marketplaceSdk,
    transactionId: transaction.id,
    transition,
    operatorFallbackTransition:
      transition === TRANSITIONS.ACCEPT_SUBSCRIPTION ? TRANSITIONS.CONFIRM_SUBSCRIPTION : null,
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

  assertSubscriptionState(transaction, STATES.PAYMENT_CONFIRMED);

  await runProcessTransition({
    marketplaceSdk,
    transactionId: transaction.id,
    transition: TRANSITIONS.DECLINE_SUBSCRIPTION,
    operatorFallbackTransition: TRANSITIONS.ABORT_SUBSCRIPTION,
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

const handleInvoicePaid = async (stripeSubscriptionId, invoice = null) => {
  const transaction = await findTransactionByStripeSubscriptionId(stripeSubscriptionId);
  if (!transaction) {
    log.warn('invoice.paid: no transaction for subscription', { stripeSubscriptionId });
    return;
  }

  // Idempotency: Stripe retries failed deliveries for days and operators can
  // "Resend" from the dashboard. Each delivery would otherwise extend the
  // booking by another month.
  const metadata = transaction.attributes.metadata || {};
  if (invoice?.id && metadata.lastRenewalInvoice?.invoiceId === invoice.id) {
    log.info('invoice.paid: already processed, skipping', {
      transactionId: transaction.id.uuid,
      invoiceId: invoice.id,
    });
    return;
  }

  // Persist the renewal invoice's tax breakdown (Stripe Tax automatic_tax) on
  // the Sharetribe transaction so records match what was actually charged.
  // Also serves as the idempotency marker above, so it is written after the
  // transition succeeds — a failed transition must stay retryable.
  const recordInvoice = async () => {
    if (!invoice) {
      return;
    }
    try {
      await updateTransactionMetadata(transaction.id, {
        lastRenewalInvoice: {
          invoiceId: invoice.id,
          totalCents: invoice.total ?? null,
          taxCents: invoice.tax ?? invoice.total_taxes?.[0]?.amount ?? null,
          currency: invoice.currency || null,
          periodEnd: invoice.period_end || null,
        },
      });
    } catch (e) {
      log.error(e, 'invoice-paid-tax-metadata-failed', {
        stripeSubscriptionId,
        invoiceId: invoice.id,
      });
    }
  };

  const state = getSubscriptionState(transaction);

  if (state === STATES.PAYMENT_OVERDUE) {
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
    await recordInvoice();
    log.info('Subscription reactivated after payment', { transactionId: transaction.id.uuid });
    return;
  }

  if (state === STATES.ACTIVE) {
    await extendSubscriptionPeriod(transaction);
    await recordInvoice();
    log.info('Subscription period extended', { transactionId: transaction.id.uuid });
    return;
  }

  log.warn('invoice.paid: transaction not in an extendable state', {
    transactionId: transaction.id.uuid,
    state,
    lastTransition: transaction.attributes.lastTransition,
  });
};

const handleInvoicePaymentFailed = async stripeSubscriptionId => {
  const transaction = await findTransactionByStripeSubscriptionId(stripeSubscriptionId);
  if (!transaction) {
    log.warn('invoice.payment_failed: no transaction', { stripeSubscriptionId });
    return;
  }

  if (isSubscriptionInState(transaction, STATES.PAYMENT_OVERDUE)) {
    return;
  }

  if (isSubscriptionInState(transaction, STATES.ACTIVE)) {
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

  if (isSubscriptionFinal(transaction)) {
    return;
  }

  // Only active / payment-overdue have a cancel transition. Anything else
  // (pending-payment, payment-confirmed, unknown) has no live billing in
  // Sharetribe's eyes; running cancel-subscription there would be rejected
  // and make Stripe retry the webhook for days.
  if (!isSubscriptionInState(transaction, STATES.ACTIVE, STATES.PAYMENT_OVERDUE)) {
    log.warn('customer.subscription.deleted: transaction not in a cancellable state', {
      transactionId: transaction.id.uuid,
      state: getSubscriptionState(transaction),
      lastTransition: transaction.attributes.lastTransition,
    });
    return;
  }

  const cancelTransition = isSubscriptionInState(transaction, STATES.PAYMENT_OVERDUE)
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
    error.statusText = error.message;
    error.data = {};
    throw error;
  }

  // Cancel-at-period-end is only meaningful while Stripe is still billing:
  // active or in dunning (payment-overdue). State, not lastTransition — see
  // assertSubscriptionState.
  if (!isSubscriptionInState(transaction, STATES.ACTIVE, STATES.PAYMENT_OVERDUE)) {
    const error = new Error('Subscription cannot be cancelled in the current state.');
    // status + statusText + data are all required for handleError to forward
    // the real status instead of a generic 500.
    error.status = 409;
    error.statusText = error.message;
    error.data = {
      state: getSubscriptionState(transaction),
      lastTransition: transaction.attributes.lastTransition,
    };
    throw error;
  }

  const stripeSubscription = await cancelStripeSubscriptionAtPeriodEnd(stripeSubscriptionId);

  // Stripe is the source of truth for the end date; fall back to the booking
  // end if the API response doesn't carry one.
  const booking = getBookingFromTransactionResponse(txResponse.data);
  const cancelAt =
    unixToIso(stripeSubscription?.cancel_at) ||
    getStripePeriodEndIso(stripeSubscription) ||
    toIsoMaybe(booking?.attributes?.end) ||
    null;

  // Mirror the pending cancellation onto the transaction. The process state
  // stays `active` until customer.subscription.deleted fires, so without this
  // the UI has no way to show "ends on <date>" or hide the cancel button.
  await updateTransactionMetadata(transaction.id, {
    [METADATA_KEYS.CANCEL_AT_PERIOD_END]: true,
    [METADATA_KEYS.CANCEL_AT]: cancelAt,
  });

  log.info('Subscription cancellation scheduled', {
    transactionId: transaction.id.uuid,
    stripeSubscriptionId,
    cancelAt,
  });

  return { cancelAtPeriodEnd: true, cancelAt, stripeSubscriptionId };
};

/**
 * Keep the pending-cancellation flag in sync with Stripe. Covers the customer
 * resuming (or cancelling) via the Billing Portal, which never touches our
 * /api/cancel-subscription endpoint.
 */
const handleSubscriptionUpdated = async stripeSubscription => {
  const stripeSubscriptionId = stripeSubscription?.id;
  if (!stripeSubscriptionId) {
    return;
  }

  const transaction = await findTransactionByStripeSubscriptionId(stripeSubscriptionId);
  if (!transaction || isSubscriptionFinal(transaction)) {
    return;
  }

  const metadata = transaction.attributes.metadata || {};
  // Either flag means Stripe will stop billing at a known point: cancel_at_period_end
  // (our cancel endpoint / Billing Portal) or a bare cancel_at (Stripe dashboard
  // "cancel on date"). Both should surface as a pending cancellation.
  const stripeFlag =
    !!stripeSubscription.cancel_at_period_end || typeof stripeSubscription.cancel_at === 'number';
  const stripeCancelAt = stripeFlag
    ? unixToIso(stripeSubscription.cancel_at) || getStripePeriodEndIso(stripeSubscription)
    : null;

  const currentFlag = !!metadata[METADATA_KEYS.CANCEL_AT_PERIOD_END];
  const currentCancelAt = metadata[METADATA_KEYS.CANCEL_AT] || null;

  if (currentFlag === stripeFlag && currentCancelAt === stripeCancelAt) {
    return;
  }

  await updateTransactionMetadata(transaction.id, {
    [METADATA_KEYS.CANCEL_AT_PERIOD_END]: stripeFlag,
    [METADATA_KEYS.CANCEL_AT]: stripeCancelAt,
  });

  log.info('Subscription cancel-at-period-end synced from Stripe', {
    transactionId: transaction.id.uuid,
    stripeSubscriptionId,
    cancelAtPeriodEnd: stripeFlag,
    cancelAt: stripeCancelAt,
  });
};

/**
 * Guard against double-booking: throws a 409 if ANY non-final subscription
 * transaction already exists for the listing (global exclusivity).
 *
 * Call this before initiating a new subscription checkout (initiate-privileged).
 *
 * @param {string} listingId   - plain uuid string
 * @param {string} processName - e.g. 'subscription-rental'
 */
const checkForExistingSubscription = async (listingId, processName) => {
  const existing = await findActiveSubscriptionForListing(listingId, processName);
  if (existing) {
    const error = new Error(
      'This listing already has an active subscription. Only one subscription per listing is allowed.'
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
  handleSubscriptionUpdated,
  requestCancelAtPeriodEnd,
  checkForExistingSubscription,
};
