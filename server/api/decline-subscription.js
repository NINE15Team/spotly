const { handleError, serialize } = require('../api-util/sdk');
const { isIntegrationSdkConfigured } = require('../api-util/integrationSdk');
const { isStripeConfigured } = require('../api-util/stripeClient');
const { assertProviderOnTransaction } = require('../api-util/subscriptionAuth');
const { declineSubscription } = require('../api-util/subscriptionService');
const { TRANSITIONS } = require('../api-util/subscriptionConstants');

/**
 * POST /api/decline-subscription
 * Body: { transactionId: UUID }
 *
 * Provider rejection of a subscription request. Runs transition/decline-subscription
 * with the provider's Marketplace SDK, refunding the preauthorized first payment.
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

    const result = await declineSubscription(transactionId, { marketplaceSdk: sdk });

    res
      .status(200)
      .set('Content-Type', 'application/transit+json')
      .send(serialize({ data: result }))
      .end();
  } catch (e) {
    handleError(res, e);
  }
};
