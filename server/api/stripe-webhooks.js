const log = require('../log');
const { getStripe, getWebhookSecret, isStripeWebhookConfigured } = require('../api-util/stripeClient');
const { isIntegrationSdkConfigured } = require('../api-util/integrationSdk');
const {
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handleSubscriptionDeleted,
} = require('../api-util/subscriptionService');
const { recordTaxTransactionFromPaymentIntent } = require('../api-util/tax');

const getSubscriptionIdFromInvoice = invoice => {
  const subscription = invoice.subscription;
  if (!subscription) {
    return null;
  }
  return typeof subscription === 'string' ? subscription : subscription.id;
};

/**
 * POST /api/stripe-webhooks
 * Raw JSON body (mounted with express.raw in apiRouter).
 */
module.exports = async (req, res) => {
  if (!isStripeWebhookConfigured() || !isIntegrationSdkConfigured()) {
    res.status(503).send('Stripe webhooks are not configured.');
    return;
  }

  const stripe = getStripe();
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, getWebhookSecret());
  } catch (err) {
    log.error(err, 'stripe-webhook-signature-failed');
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  try {
    switch (event.type) {
      case 'invoice.paid': {
        const invoice = event.data.object;
        // First invoice on create is covered by Sharetribe checkout; renewals extend the booking.
        if (invoice.billing_reason === 'subscription_create') {
          break;
        }
        const subscriptionId = getSubscriptionIdFromInvoice(invoice);
        if (subscriptionId) {
          await handleInvoicePaid(subscriptionId, invoice);
        }
        break;
      }
      case 'payment_intent.succeeded': {
        // First-period / one-off payments: record a filable Stripe Tax
        // transaction from the calculation id written on the PaymentIntent
        // metadata by initiate-privileged / transition-privileged.
        // No-op for PaymentIntents without taxCalculationId metadata
        // (e.g. renewal invoice payments — Stripe Tax records those itself
        // via automatic_tax).
        const paymentIntent = event.data.object;
        await recordTaxTransactionFromPaymentIntent(paymentIntent);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscriptionId = getSubscriptionIdFromInvoice(invoice);
        if (subscriptionId) {
          await handleInvoicePaymentFailed(subscriptionId);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionDeleted(subscription.id);
        break;
      }
      default:
        break;
    }

    res.json({ received: true });
  } catch (e) {
    log.error(e, 'stripe-webhook-handler-failed', { eventType: event.type });
    res.status(500).json({ error: e.message });
  }
};
