const { handleError, serialize } = require('../api-util/sdk');
const { isIntegrationSdkConfigured } = require('../api-util/integrationSdk');
const { isStripeConfigured } = require('../api-util/stripeClient');
const { assertCustomerOnTransaction } = require('../api-util/subscriptionAuth');
const { requestCancelAtPeriodEnd } = require('../api-util/subscriptionService');

/**
 * POST /api/cancel-subscription
 * Body: { transactionId: UUID }
 *
 * Sets Stripe cancel_at_period_end. Sharetribe moves to cancelled when
 * customer.subscription.deleted webhook fires at period end.
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
    await assertCustomerOnTransaction(req, res, transactionId);
    const result = await requestCancelAtPeriodEnd(transactionId);

    res
      .status(200)
      .set('Content-Type', 'application/transit+json')
      .send(serialize({ data: result }))
      .end();
  } catch (e) {
    handleError(res, e);
  }
};
