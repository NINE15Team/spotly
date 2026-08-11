const log = require('../log');
const { isPandaDocConfigured, createAndEmailSecondaryWaiver } = require('./pandadoc');
const { isIntegrationSdkConfigured, normalizeUuid } = require('./integrationSdk');
const {
  getSecondaryParticipants,
  updateParticipantAtIndex,
  ROLE_SECONDARY,
} = require('./participants');
const {
  showTransaction,
  setWaiversSentAt,
  updateParticipantDocumentIds,
} = require('./waiverProtectedData');

/**
 * Create + email a PandaDoc waiver for every secondary participant on a
 * transaction, then persist each document id and stamp waiversSentAt.
 *
 * Idempotent via waiversSentAt: safe to call from multiple triggers.
 *   - booking:      /api/waivers/send-secondary (client, after confirm-payment)
 *   - subscription: /api/accept-subscription + /api/activate-subscription
 *                   (server-side, on provider acceptance)
 *   - reconciliation job: backstop for stuck transactions
 *
 * @param {UUID|string} transactionId
 */
const sendSecondaryWaiversForTransaction = async transactionId => {
  if (!isPandaDocConfigured()) {
    log.warn('send-secondary-waivers-skipped-not-configured', { transactionId });
    return { skipped: true, reason: 'not_configured' };
  }

  const transaction = await showTransaction(transactionId);
  const protectedData = transaction?.attributes?.protectedData || {};
  const participants = protectedData.participants || [];

  if (protectedData.waiversSentAt) {
    return { skipped: true, reason: 'already_sent' };
  }

  const secondaries = getSecondaryParticipants(participants);
  if (secondaries.length === 0) {
    await setWaiversSentAt(transactionId, participants, new Date().toISOString());
    return { skipped: true, reason: 'no_secondaries' };
  }

  // Store the Sharetribe transaction id on each PandaDoc document so the webhook
  // can route by metadata instead of scanning transactions.
  const metadata = { transactionId: normalizeUuid(transactionId) };

  const documentIdByIndex = {};
  let updatedParticipants = [...participants];

  for (let i = 0; i < participants.length; i += 1) {
    const participant = participants[i];
    if (participant.role !== ROLE_SECONDARY) {
      continue;
    }

    const documentId = await createAndEmailSecondaryWaiver({
      name: participant.name,
      email: participant.email,
      metadata,
    });
    documentIdByIndex[i] = documentId;
    updatedParticipants = updateParticipantAtIndex(updatedParticipants, i, {
      pandadoc_document_id: documentId,
    });
  }

  if (isIntegrationSdkConfigured()) {
    await updateParticipantDocumentIds(transactionId, documentIdByIndex);
    await setWaiversSentAt(transactionId, updatedParticipants, new Date().toISOString());
  } else {
    log.warn('integration-sdk-not-configured-secondary-doc-ids-not-persisted', { transactionId });
  }

  return { sent: secondaries.length };
};

module.exports = { sendSecondaryWaiversForTransaction };
