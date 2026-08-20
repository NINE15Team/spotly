const log = require('../log');
const { handleError, serialize } = require('../api-util/sdk');
const { isIntegrationSdkConfigured } = require('../api-util/integrationSdk');
const { isStripeConfigured } = require('../api-util/stripeClient');
const { assertProviderOnTransaction } = require('../api-util/subscriptionAuth');
const { activateSubscription } = require('../api-util/subscriptionService');
const { TRANSITIONS } = require('../api-util/subscriptionConstants');
const { sendSecondaryWaiversForTransaction } = require('../api-util/waiverDelivery');

/**
 * POST /api/accept-subscription
 * Body: { transactionId: UUID }
 *
 * Provider approval of a subscription request. Creates the Stripe Subscription and
 * runs transition/accept-subscription with the provider's Marketplace SDK (captures
 * the first PaymentIntent and moves the transaction to `active`).
 */
module.exports = async (req, res) => {
  const { transactionId } = req.body || {};

  if (!transactionId) {
    res.status(400).json({ message: 'transactionId is required.' });
    return;
  }

  if (!isStripeConfigured() || !isIntegrationSdkConfigured()) {
    res.status(503).json({ message: 'Subscription billing is not configured on the server.' });
    return;
  }

  try {
    const { transaction, sdk } = await assertProviderOnTransaction(req, res, transactionId);

    if (transaction.attributes.lastTransition !== TRANSITIONS.CONFIRM_PAYMENT) {
      res.status(409).json({
        message: 'Transaction is not awaiting provider approval.',
        lastTransition: transaction.attributes.lastTransition,
      });
      return;
    }

    const result = await activateSubscription(transactionId, {
      transition: TRANSITIONS.ACCEPT_SUBSCRIPTION,
      marketplaceSdk: sdk,
    });

    // Subscription secondary waivers are issued on provider acceptance (the
    // subscription is now live). Best-effort: a PandaDoc hiccup must not fail the
    // acceptance response. The reconciliation job re-drives any that are missed.
    try {
      await sendSecondaryWaiversForTransaction(transactionId);
    } catch (waiverErr) {
      log.error(waiverErr, 'accept-subscription-send-secondary-waivers-failed', { transactionId });
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
