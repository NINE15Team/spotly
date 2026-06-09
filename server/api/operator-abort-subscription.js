const { handleError, serialize } = require('../api-util/sdk');
const { isIntegrationSdkConfigured, transitionTransaction, showTransaction } = require('../api-util/integrationSdk');
const { TRANSITIONS } = require('../api-util/subscriptionConstants');

/**
 * POST /api/operator-abort-subscription
 * Body: { transactionId: UUID }
 *
 * Operator-level endpoint that runs transition/abort-subscription via the
 * Integration SDK. Useful to cancel stuck transactions whose booking blocks
 * availability but cannot be declined by the provider (e.g. because the
 * transaction was created with an older process version that lacked
 * transition/decline-subscription).
 *
 * Valid from: state/payment-confirmed only.
 */
module.exports = async (req, res) => {
  const { transactionId } = req.body || {};

  if (!transactionId) {
    res.status(400).json({ message: 'transactionId is required.' });
    return;
  }

  if (!isIntegrationSdkConfigured()) {
    res.status(503).json({ message: 'Integration SDK is not configured on the server.' });
    return;
  }

  try {
    // Confirm current state before attempting the transition.
    const showResp = await showTransaction(transactionId);
    const transaction = showResp?.data?.data;
    const lastTransition = transaction?.attributes?.lastTransition;

    if (lastTransition !== TRANSITIONS.CONFIRM_PAYMENT) {
      res.status(409).json({
        message: `Cannot abort: transaction is not in payment-confirmed state.`,
        lastTransition,
      });
      return;
    }

    const result = await transitionTransaction({
      transactionId,
      transition: TRANSITIONS.ABORT_SUBSCRIPTION,
      params: {},
    });

    res
      .status(200)
      .set('Content-Type', 'application/json')
      .json({ success: true, data: result?.data?.data?.attributes?.lastTransition });
  } catch (e) {
    handleError(res, e);
  }
};
