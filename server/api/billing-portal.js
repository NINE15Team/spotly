const { handleError } = require('../api-util/sdk');
const { isStripeConfigured } = require('../api-util/stripeClient');
const { createBillingPortalSession } = require('../api-util/subscriptionStripe');
const { assertCustomerOnTransaction } = require('../api-util/subscriptionAuth');
const { METADATA_KEYS } = require('../api-util/subscriptionConstants');
const { getRootURL } = require('../api-util/rootURL');

/**
 * POST /api/billing-portal
 * Body: { transactionId: UUID }
 *
 * Returns { url } for Stripe Customer Portal.
 */
module.exports = async (req, res) => {
  const { transactionId } = req.body || {};

  if (!transactionId) {
    res.status(400).json({ message: 'transactionId is required.' });
    return;
  }

  if (!isStripeConfigured()) {
    res.status(503).json({ message: 'Stripe is not configured on the server.' });
    return;
  }

  try {
    const { transaction } = await assertCustomerOnTransaction(req, res, transactionId);
    const stripeCustomerId = transaction.attributes.metadata?.[METADATA_KEYS.STRIPE_CUSTOMER_ID];

    if (!stripeCustomerId) {
      res.status(400).json({ message: 'No Stripe customer linked to this subscription.' });
      return;
    }

    const returnUrl = `${getRootURL()}/inbox/orders`;
    const session = await createBillingPortalSession({
      customerId: stripeCustomerId,
      returnUrl,
    });

    res.status(200).json({ url: session.url });
  } catch (e) {
    handleError(res, e);
  }
};
