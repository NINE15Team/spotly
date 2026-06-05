const { getStripe } = require('./stripeClient');
const { getStripeBillingAnchorUnix } = require('./subscriptionDates');
const { BILLING_DAY_OF_MONTH, METADATA_KEYS } = require('./subscriptionConstants');

/**
 * Extract PaymentIntent id from Sharetribe protectedData client secret.
 *
 * @param {Object} protectedData
 * @returns {string|null}
 */
const getPaymentIntentIdFromProtectedData = protectedData => {
  const clientSecret = protectedData?.stripePaymentIntents?.default;
  if (!clientSecret || typeof clientSecret !== 'string') {
    return null;
  }
  const parts = clientSecret.split('_secret_');
  return parts[0] || null;
};

/**
 * @param {string} paymentIntentId
 * @returns {Promise<string|null>} payment method id
 */
const getPaymentMethodIdFromPaymentIntent = async paymentIntentId => {
  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (typeof paymentIntent.payment_method === 'string') {
    return paymentIntent.payment_method;
  }
  return paymentIntent.payment_method?.id || null;
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
 * Create a recurring monthly Stripe Price for the listing amount.
 */
const createMonthlyStripePrice = async ({ amount, currency, productName, listingId }) => {
  const stripe = getStripe();
  return stripe.prices.create({
    unit_amount: amount,
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
  const trialEnd = getStripeBillingAnchorUnix(bookingStart);

  await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  return stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    default_payment_method: paymentMethodId,
    billing_cycle_anchor_config: {
      day_of_month: BILLING_DAY_OF_MONTH,
    },
    trial_end: trialEnd,
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
  getPaymentIntentIdFromProtectedData,
  getPaymentMethodIdFromPaymentIntent,
  createStripeCustomer,
  createMonthlyStripePrice,
  createStripeSubscription,
  cancelStripeSubscriptionAtPeriodEnd,
  createBillingPortalSession,
  METADATA_KEYS,
};
