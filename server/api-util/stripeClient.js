const log = require('../log');

let stripeInstance = null;

const isStripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY);

/**
 * Stripe SDK instance (server-side only).
 */
const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    const error = new Error('STRIPE_SECRET_KEY is not configured.');
    error.status = 503;
    error.statusText = error.message;
    throw error;
  }

  if (!stripeInstance) {
    // eslint-disable-next-line global-require
    const Stripe = require('stripe');
    stripeInstance = new Stripe(secretKey);
    log.info('Stripe client initialized');
  }

  return stripeInstance;
};

const getWebhookSecret = () => process.env.STRIPE_WEBHOOK_SECRET;

const isStripeWebhookConfigured = () => Boolean(getWebhookSecret());

module.exports = {
  getStripe,
  isStripeConfigured,
  isStripeWebhookConfigured,
  getWebhookSecret,
};
