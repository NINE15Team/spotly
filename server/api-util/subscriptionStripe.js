const moment = require('moment');
const { getStripe } = require('./stripeClient');
const { METADATA_KEYS } = require('./subscriptionConstants');

/**
 * Extract PaymentIntent id from a Stripe client secret (pi_xxx_secret_yyy).
 *
 * @param {string} clientSecret
 * @returns {string|null}
 */
const getPaymentIntentIdFromClientSecret = clientSecret => {
  if (!clientSecret || typeof clientSecret !== 'string') {
    return null;
  }
  const parts = clientSecret.split('_secret_');
  return parts[0] || null;
};

/**
 * Extract PaymentIntent id from Sharetribe transaction protectedData.
 *
 * Sharetribe stores payment intents as:
 *   stripePaymentIntents.default.stripePaymentIntentClientSecret
 * (object shape used by the Web Template), not a bare string.
 *
 * @param {Object} protectedData
 * @returns {string|null}
 */
const getPaymentIntentIdFromProtectedData = protectedData => {
  const defaultEntry = protectedData?.stripePaymentIntents?.default;
  if (!defaultEntry) {
    return null;
  }

  if (typeof defaultEntry === 'string') {
    return getPaymentIntentIdFromClientSecret(defaultEntry);
  }

  if (typeof defaultEntry === 'object') {
    if (defaultEntry.stripePaymentIntentId) {
      return defaultEntry.stripePaymentIntentId;
    }
    return getPaymentIntentIdFromClientSecret(defaultEntry.stripePaymentIntentClientSecret);
  }

  return null;
};

/**
 * @param {string} paymentIntentId
 * @returns {Promise<string|null>} payment method id
 */
/**
 * Capture a preauthorized PaymentIntent if still at requires_capture.
 * Safe to call after confirm-subscription (no-op if already captured).
 *
 * @param {string} paymentIntentId
 */
const capturePaymentIntentIfNeeded = async paymentIntentId => {
  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (paymentIntent.status === 'requires_capture') {
    return stripe.paymentIntents.capture(paymentIntentId);
  }
  return paymentIntent;
};

const getPaymentMethodIdFromPaymentIntent = async paymentIntentId => {
  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (typeof paymentIntent.payment_method === 'string') {
    return paymentIntent.payment_method;
  }
  return paymentIntent.payment_method?.id || null;
};

/**
 * Normalize a Stripe id field that may be a string or expanded object.
 *
 * @param {string|Object|null} value
 * @returns {string|null}
 */
const normalizeStripeId = value => {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  return value.id || null;
};

/**
 * Map Stripe SDK errors to HTTP-friendly errors for subscription billing.
 *
 * @param {Error} error
 * @returns {Error}
 */
const mapStripeErrorToHttpError = error => {
  const code = error?.code;
  const declineCode = error?.decline_code;
  const message = error?.message || 'Subscription billing failed.';
  const paymentFailureCodes = ['card_declined', 'expired_card', 'insufficient_funds'];

  if (paymentFailureCodes.includes(code) || paymentFailureCodes.includes(declineCode)) {
    const httpError = new Error(message);
    httpError.status = 402;
    httpError.code = declineCode || code;
    return httpError;
  }

  const isInvalidRequest =
    error?.type === 'StripeInvalidRequestError' ||
    error?.rawType === 'invalid_request_error' ||
    error?.raw?.type === 'invalid_request_error';

  if (isInvalidRequest) {
    const httpError = new Error(message);
    httpError.status = 400;
    httpError.code = code;
    return httpError;
  }

  const httpError = new Error('Subscription billing failed. Please try again.');
  httpError.status = 502;
  httpError.code = code;
  return httpError;
};

/**
 * Re-throw Stripe SDK errors as HTTP-mapped errors.
 *
 * @param {Error} error
 */
const rethrowStripeError = error => {
  if (error?.type && String(error.type).startsWith('Stripe')) {
    throw mapStripeErrorToHttpError(error);
  }
  throw error;
};

/**
 * @param {Object} params
 * @param {string} params.email
 * @param {string} [params.name]
 * @param {string} params.sharetribeUserId
 */
const createStripeCustomer = async ({ email, name, sharetribeUserId }) => {
  const stripe = getStripe();
  return stripe.customers.create({
    email,
    name: name || undefined,
    metadata: {
      sharetribeUserId,
    },
  });
};

/**
 * Find an existing Stripe customer by Sharetribe user ID, or create a new one.
 *
 * Stripe's customer.search API is used to look up any customer previously created
 * for this Sharetribe user (keyed by metadata.sharetribeUserId). This prevents a
 * new customer being created on every subscription acceptance or retry attempt.
 *
 * Falls back to create only when no match is found.
 *
 * @param {Object} params
 * @param {string} params.email
 * @param {string} [params.name]
 * @param {string} params.sharetribeUserId
 * @returns {Promise<Stripe.Customer>}
 */
const findOrCreateStripeCustomer = async ({ email, name, sharetribeUserId }) => {
  if (!sharetribeUserId) {
    // No user ID to search by — fall back to plain create.
    return createStripeCustomer({ email, name, sharetribeUserId });
  }

  const stripe = getStripe();

  // Stripe customer search supports metadata key lookups.
  // https://stripe.com/docs/search#query-fields-for-customers
  const searchResult = await stripe.customers.search({
    query: `metadata['sharetribeUserId']:'${sharetribeUserId}'`,
    limit: 1,
  });

  if (searchResult.data.length > 0) {
    return searchResult.data[0];
  }

  return createStripeCustomer({ email, name, sharetribeUserId });
};

/**
 * Resolve the Stripe customer to bill for a subscription.
 * Prefers transaction metadata, then the PaymentMethod owner, then the PaymentIntent customer,
 * and only creates a new customer when the PM is genuinely unattached.
 *
 * @param {Object} params
 * @param {string} params.paymentMethodId
 * @param {string} [params.paymentIntentId]
 * @param {string} [params.existingCustomerId]
 * @param {string} [params.email]
 * @param {string} [params.name]
 * @param {string} [params.sharetribeUserId]
 * @returns {Promise<string>}
 */
const resolveSubscriptionStripeCustomer = async ({
  paymentMethodId,
  paymentIntentId,
  existingCustomerId,
  email,
  name,
  sharetribeUserId,
}) => {
  if (existingCustomerId) {
    return existingCustomerId;
  }

  const stripe = getStripe();
  const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
  const paymentMethodCustomerId = normalizeStripeId(paymentMethod.customer);
  if (paymentMethodCustomerId) {
    return paymentMethodCustomerId;
  }

  if (paymentIntentId) {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const paymentIntentCustomerId = normalizeStripeId(paymentIntent.customer);
    if (paymentIntentCustomerId) {
      return paymentIntentCustomerId;
    }
  }

  const customer = await findOrCreateStripeCustomer({ email, name, sharetribeUserId });
  return customer.id;
};

/**
 * Create a recurring monthly Stripe Price for the listing amount.
 */
const createMonthlyStripePrice = async ({ amount, currency, productName, listingId }) => {
  const unitAmount = Number.isInteger(amount) && amount > 0 ? amount : null;
  if (!unitAmount || !currency) {
    const error = new Error(
      'Invalid listing price for Stripe subscription (unit_amount and currency required).'
    );
    error.status = 400;
    throw error;
  }

  const stripe = getStripe();
  return stripe.prices.create({
    unit_amount: unitAmount,
    currency: currency.toLowerCase(),
    recurring: { interval: 'month' },
    product_data: {
      name: productName || 'Subscription',
      metadata: { listingId },
    },
  });
};

/**
 * Create Stripe Subscription after first Sharetribe payment succeeded.
 * Uses trial_end until first billing anchor so the first period is not double-charged.
 *
 * @param {Object} params
 */
const createStripeSubscription = async ({
  customerId,
  priceId,
  paymentMethodId,
  bookingStart,
  sharetribeTransactionId,
}) => {
  const stripe = getStripe();
  const startMoment = moment(bookingStart);
  const billingDayOfMonth = startMoment.date();
  // First recurring charge fires one month after checkout; the initial period
  // is already paid via the Sharetribe PaymentIntent at checkout / accept.
  const trialEndUnix = startMoment.clone().add(1, 'month').unix();

  const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
  let resolvedCustomerId = customerId;

  if (paymentMethod.customer) {
    // PM is already owned — bill that customer. Do not create another or re-attach.
    resolvedCustomerId = normalizeStripeId(paymentMethod.customer);
  } else {
    await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    resolvedCustomerId = customerId;
  }

  await stripe.customers.update(resolvedCustomerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  return stripe.subscriptions.create({
    customer: resolvedCustomerId,
    items: [{ price: priceId }],
    default_payment_method: paymentMethodId,
    billing_cycle_anchor_config: {
      day_of_month: billingDayOfMonth,
    },
    trial_end: trialEndUnix,
    proration_behavior: 'none',
    metadata: {
      sharetribeTransactionId,
    },
  });
};

const cancelStripeSubscriptionAtPeriodEnd = async subscriptionId => {
  const stripe = getStripe();
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
};

const createBillingPortalSession = async ({ customerId, returnUrl }) => {
  const stripe = getStripe();
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
};

module.exports = {
  getPaymentIntentIdFromClientSecret,
  getPaymentIntentIdFromProtectedData,
  capturePaymentIntentIfNeeded,
  getPaymentMethodIdFromPaymentIntent,
  normalizeStripeId,
  mapStripeErrorToHttpError,
  rethrowStripeError,
  createStripeCustomer,
  findOrCreateStripeCustomer,
  resolveSubscriptionStripeCustomer,
  createMonthlyStripePrice,
  createStripeSubscription,
  cancelStripeSubscriptionAtPeriodEnd,
  createBillingPortalSession,
  METADATA_KEYS,
};
