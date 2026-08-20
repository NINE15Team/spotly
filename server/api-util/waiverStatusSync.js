const log = require('../log');
const {
  isPandaDocConfigured,
  getDocumentStatus,
  isDocumentCompleted,
  isDocumentExpired,
  isDocumentVoided,
} = require('./pandadoc');
const { isIntegrationSdkConfigured } = require('./integrationSdk');
const { showTransaction, readModifyWriteParticipants } = require('./waiverProtectedData');
const {
  WAIVER_STATUS_PENDING,
  WAIVER_STATUS_SIGNED,
  WAIVER_STATUS_EXPIRED,
  WAIVER_STATUS_VOIDED,
} = require('./participants');

// Map a live PandaDoc document status to the local waiver status we should
// store, or null if the document is still in flight (leave as pending).
const localStatusForDocument = status => {
  if (isDocumentCompleted(status)) return WAIVER_STATUS_SIGNED;
  if (isDocumentExpired(status)) return WAIVER_STATUS_EXPIRED;
  if (isDocumentVoided(status)) return WAIVER_STATUS_VOIDED;
  return null;
};

/**
 * Poll PandaDoc for every still-pending participant on a transaction and flip
 * any whose document has reached a terminal state.
 *
 * Safety net for missed, rejected, or disabled PandaDoc webhooks: the transaction
 * page calls it on load, and the scheduled reconciliation job calls it in bulk.
 * Safe to call repeatedly — when nothing changed it performs no writes at all.
 * Process-agnostic (works for booking and subscription via the shared writer).
 */
const syncWaiverStatusesForTransaction = async transactionId => {
  if (!isPandaDocConfigured() || !isIntegrationSdkConfigured()) {
    return { skipped: true, reason: 'not_configured', updated: 0, participants: null };
  }

  const transaction = await showTransaction(transactionId);
  const participants = transaction?.attributes?.protectedData?.participants || [];

  const pending = participants.filter(
    p => p.waiver_status === WAIVER_STATUS_PENDING && p.pandadoc_document_id
  );

  if (pending.length === 0) {
    return { updated: 0, participants };
  }

  const statusByDocumentId = {};
  for (const participant of pending) {
    try {
      const status = await getDocumentStatus(participant.pandadoc_document_id);
      const localStatus = localStatusForDocument(status);
      if (localStatus) {
        statusByDocumentId[participant.pandadoc_document_id] = localStatus;
      }
    } catch (err) {
      // A single unreadable document shouldn't block the rest.
      log.warn('waiver-status-sync-document-check-failed', {
        documentId: participant.pandadoc_document_id,
        err: err.message,
      });
    }
  }

  const changedDocumentIds = Object.keys(statusByDocumentId);
  if (changedDocumentIds.length === 0) {
    return { updated: 0, participants };
  }

  // One read-modify-write, so N terminal documents cost a single operator
  // transition instead of N.
  const updatedTransaction = await readModifyWriteParticipants(transactionId, current =>
    current.map(p =>
      statusByDocumentId[p.pandadoc_document_id]
        ? { ...p, waiver_status: statusByDocumentId[p.pandadoc_document_id] }
        : p
    )
  );

  return {
    updated: changedDocumentIds.length,
    participants: updatedTransaction?.attributes?.protectedData?.participants || participants,
  };
};

module.exports = { syncWaiverStatusesForTransaction };
