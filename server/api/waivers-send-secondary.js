const { handleError, serialize, getSdk } = require('../api-util/sdk');
const { sendSecondaryWaiversForTransaction } = require('../api-util/waiverDelivery');
const { types } = require('sharetribe-flex-sdk');

const { UUID } = types;

/**
 * POST /api/waivers/send-secondary
 * Body: { transactionId }
 *
 * Customer-only. Creates + emails the secondary waivers for a transaction.
 * Used by the booking checkout flow after confirm-payment. (Subscription
 * secondaries are sent server-side on provider acceptance, not here.)
 */
module.exports = (req, res) => {
  const { transactionId } = req.body || {};

  if (!transactionId?.uuid) {
    res.status(400).json({ error: 'transactionId is required' });
    return;
  }

  const sdk = getSdk(req, res);

  Promise.all([
    sdk.currentUser.show(),
    // include the customer relationship so its linkage (id) is returned;
    // without `include` the Marketplace API omits it and the ownership
    // check below sees an undefined customerId and 403s.
    sdk.transactions.show({ id: new UUID(transactionId.uuid), include: ['customer'] }),
  ])
    .then(([currentUserResponse, transactionResponse]) => {
      const currentUserId = currentUserResponse?.data?.data?.id?.uuid;
      const transaction = transactionResponse?.data?.data;
      const customerId = transaction?.relationships?.customer?.data?.id?.uuid;

      if (!customerId || customerId !== currentUserId) {
        const error = new Error('Forbidden');
        error.status = 403;
        throw error;
      }

      return sendSecondaryWaiversForTransaction(transactionId);
    })
    .then(result => {
      res.status(200).set('Content-Type', 'application/transit+json').send(serialize(result)).end();
    })
    .catch(e => {
      handleError(res, e);
    });
};
