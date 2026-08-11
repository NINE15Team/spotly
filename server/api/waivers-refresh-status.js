const { handleError, serialize, getSdk } = require('../api-util/sdk');
const { syncWaiverStatusesForTransaction } = require('../api-util/waiverStatusSync');
const { types } = require('sharetribe-flex-sdk');

const { UUID } = types;

/**
 * POST /api/waivers/refresh-status
 * Body: { transactionId }
 *
 * Re-check pending waiver documents against PandaDoc and update the
 * transaction's protectedData if any have reached a terminal state. Either party
 * (customer or provider) may call it — both see the waiver panel. Works for
 * booking and subscription.
 *
 * Called by the transaction page on load so a missed webhook doesn't leave a
 * participant stuck on "Pending" forever.
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
    sdk.transactions.show({
      id: new UUID(transactionId.uuid),
      include: ['customer', 'provider'],
    }),
  ])
    .then(([currentUserResponse, transactionResponse]) => {
      const currentUserId = currentUserResponse?.data?.data?.id?.uuid;
      const transaction = transactionResponse?.data?.data;
      const customerId = transaction?.relationships?.customer?.data?.id?.uuid;
      const providerId = transaction?.relationships?.provider?.data?.id?.uuid;

      const isPartyToTransaction =
        !!currentUserId && (currentUserId === customerId || currentUserId === providerId);

      if (!isPartyToTransaction) {
        const error = new Error('Forbidden');
        error.status = 403;
        throw error;
      }

      return syncWaiverStatusesForTransaction(transactionId);
    })
    .then(result => {
      res.status(200).set('Content-Type', 'application/transit+json').send(serialize(result)).end();
    })
    .catch(e => {
      handleError(res, e);
    });
};
