const log = require('../log');
const { handleError, serialize } = require('../api-util/sdk');
const { isIntegrationSdkConfigured } = require('../api-util/integrationSdk');
const { isStripeConfigured } = require('../api-util/stripeClient');
const { assertCustomerOnTransaction } = require('../api-util/subscriptionAuth');
const { activateSubscription } = require('../api-util/subscriptionService');
const { TRANSITIONS } = require('../api-util/subscriptionConstants');
const { sendSecondaryWaiversForTransaction } = require('../api-util/waiverDelivery');

/**
 * POST /api/activate-subscription
 * Body: { transactionId: UUID, paymentIntentId?: string }
 *
 * Called after transition/confirm-payment. Creates Stripe Subscription and
 * runs transition/confirm-subscription via Integration API.
 */
module.exports = async (req, res) => {
  const { transactionId, paymentIntentId } = req.body || {};

  if (!transactionId) {
    res.status(400).json({ message: 'transactionId is required.' });
    return;
  }

  if (!isStripeConfigured() || !isIntegrationSdkConfigured()) {
    res.status(503).json({ message: 'Subscription billing is not configured on the server.' });
    return;
  }

  try {
    const { transaction } = await assertCustomerOnTransaction(req, res, transactionId);

    if (transaction.attributes.lastTransition !== TRANSITIONS.CONFIRM_PAYMENT) {
      res.status(409).json({
        message: 'Transaction is not ready for subscription activation.',
        lastTransition: transaction.attributes.lastTransition,
      });
      return;
    }

    const result = await activateSubscription(transactionId, { paymentIntentId });

    // Subscription is now live — issue secondary participant waivers. Best-effort;
    // idempotent (waiversSentAt guard), and the reconciliation job is the backstop.
    try {
      await sendSecondaryWaiversForTransaction(transactionId);
    } catch (waiverErr) {
      log.error(waiverErr, 'activate-subscription-send-secondary-waivers-failed', { transactionId });
    }

    res
      .status(200)
      .set('Content-Type', 'application/transit+json')
      .send(serialize({ data: result }))
      .end();
  } catch (e) {
    handleError(res, e);
  }
};
