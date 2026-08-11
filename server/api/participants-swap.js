const log = require('../log');
const { handleError, serialize, getSdk } = require('../api-util/sdk');
const {
  isPandaDocConfigured,
  voidDocument,
  createAndEmailSecondaryWaiver,
} = require('../api-util/pandadoc');
const { replaceParticipant } = require('../api-util/waiverProtectedData');
const { WAIVER_STATUS_PENDING } = require('../api-util/participants');
const { normalizeUuid } = require('../api-util/integrationSdk');
const { types } = require('sharetribe-flex-sdk');

const { UUID } = types;

/**
 * POST /api/participants/swap
 * Body: { transactionId, participantIndex, name, email }
 *
 * Customer-only. Replace a still-pending secondary participant: create + email a
 * new PandaDoc waiver, swap the participant in protectedData (status back to
 * pending), then void the old document. Works for booking and subscription.
 */
module.exports = (req, res) => {
  const { transactionId, participantIndex, name, email } = req.body || {};

  if (!transactionId?.uuid || participantIndex == null || !name || !email) {
    res
      .status(400)
      .json({ error: 'transactionId, participantIndex, name, and email are required' });
    return;
  }

  if (!isPandaDocConfigured()) {
    res.status(503).json({ error: 'Waiver signing is not configured' });
    return;
  }

  const sdk = getSdk(req, res);
  const index = parseInt(participantIndex, 10);

  Promise.all([
    sdk.currentUser.show(),
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

      const participants = transaction?.attributes?.protectedData?.participants || [];
      const participant = participants[index];

      if (!participant || participant.waiver_status !== WAIVER_STATUS_PENDING) {
        const error = new Error('Participant cannot be updated');
        error.status = 400;
        throw error;
      }

      const oldDocumentId = participant.pandadoc_document_id;
      const metadata = { transactionId: normalizeUuid(transactionId) };

      // Order matters. Create and send the replacement document FIRST: if that
      // fails, nothing has changed yet — the original document stays valid and
      // protectedData is untouched, so the swap is safely retryable. Voiding
      // first would strand the participant with a dead document.
      return createAndEmailSecondaryWaiver({ name, email, metadata })
        .then(newDocumentId =>
          replaceParticipant(transactionId, index, {
            name,
            email,
            pandadoc_document_id: newDocumentId,
          })
        )
        .then(updatedTransaction => {
          // Only once the swap is committed do we retire the old document.
          // Best-effort: a failure here leaves a stale document behind but
          // never blocks the new participant from signing.
          if (!oldDocumentId) {
            return updatedTransaction;
          }
          return voidDocument(oldDocumentId)
            .catch(err => {
              log.warn('void-old-pandadoc-document-failed', { oldDocumentId, err: err.message });
            })
            .then(() => updatedTransaction);
        });
    })
    .then(updatedTransaction => {
      res
        .status(200)
        .set('Content-Type', 'application/transit+json')
        .send(serialize({ transaction: updatedTransaction }))
        .end();
    })
    .catch(e => {
      handleError(res, e);
    });
};
