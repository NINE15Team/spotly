/**
 * Read-modify-write of transaction.protectedData.participants through the
 * Sharetribe Integration API, serialized per transaction.
 *
 * [hako] Reuses the existing server/api-util/integrationSdk.js (string-uuid
 * helpers) rather than creating a second Integration client. The waiver status
 * self-loop transition is chosen per process (default-booking / subscription-
 * rental) and per current state — see getWaiverUpdateTransition.
 */

const log = require('../log');
const {
  isIntegrationSdkConfigured,
  showTransaction: integrationShowTransaction,
  transitionTransaction,
  normalizeUuid,
} = require('./integrationSdk');
const { runSerialized } = require('./waiverQueue');

// Booking self-loops
const BK_UPDATE = 'transition/update-waiver-status';
const BK_ACCEPTED = 'transition/update-waiver-status-from-accepted';
const BK_DELIVERED = 'transition/update-waiver-status-from-delivered';
// Subscription self-loops
const SUB_UPDATE = 'transition/update-waiver-status';
const SUB_ACTIVE = 'transition/update-waiver-status-from-active';

const SUBSCRIPTION_PROCESS_NAME = 'subscription-rental';

const processNameOf = tx =>
  tx?.attributes?.processName || tx?.attributes?.processAlias?.split('/')?.[0] || null;

/**
 * Choose the operator self-loop that matches this transaction's process and
 * current state, so :action/update-protected-data can run without changing state.
 *
 * @param {string} lastTransition
 * @param {string} [processName]
 * @returns {string} transition name
 */
const getWaiverUpdateTransition = (lastTransition, processName) => {
  const isSub = processName === SUBSCRIPTION_PROCESS_NAME;

  if (isSub) {
    if (
      lastTransition === 'transition/accept-subscription' ||
      lastTransition === 'transition/confirm-subscription' ||
      lastTransition === 'transition/extend-subscription' ||
      lastTransition === 'transition/reactivate-subscription' ||
      lastTransition === SUB_ACTIVE
    ) {
      return SUB_ACTIVE;
    }
    // payment-confirmed (and immediately after confirm-payment)
    return SUB_UPDATE;
  }

  // default-booking
  if (
    lastTransition === 'transition/accept' ||
    lastTransition === 'transition/operator-accept' ||
    lastTransition === BK_ACCEPTED
  ) {
    return BK_ACCEPTED;
  }
  if (
    lastTransition === 'transition/complete' ||
    lastTransition === 'transition/operator-complete' ||
    lastTransition === BK_DELIVERED
  ) {
    return BK_DELIVERED;
  }
  return BK_UPDATE; // preauthorized
};

const showTransaction = async transactionId => {
  const response = await integrationShowTransaction(transactionId, {
    include: ['customer', 'provider'],
  });
  return response?.data?.data;
};

const writeParticipants = (transactionId, participants, extra, transitionName) => {
  if (!isIntegrationSdkConfigured()) {
    throw new Error('Integration API is not configured');
  }
  return transitionTransaction({
    transactionId: normalizeUuid(transactionId),
    transition: transitionName,
    params: { protectedData: { participants, ...extra } },
  });
};

const carryForwardProtectedData = protectedData => {
  const extra = {};
  if (protectedData.waiversSentAt) {
    extra.waiversSentAt = protectedData.waiversSentAt;
  }
  if (protectedData.primaryPandadocDocumentId) {
    extra.primaryPandadocDocumentId = protectedData.primaryPandadocDocumentId;
  }
  return extra;
};

/**
 * Read the current participants, run `mutator`, and write the result back with
 * the correct self-loop transition. Returning null/undefined from the mutator
 * skips the write.
 */
const readModifyWriteParticipants = async (transactionId, mutator) =>
  runSerialized(transactionId, async () => {
    const transaction = await showTransaction(transactionId);
    const protectedData = transaction?.attributes?.protectedData || {};
    const current = protectedData.participants || [];
    const updated = mutator(current, protectedData, transaction);

    if (!updated) {
      return transaction;
    }

    const transitionName = getWaiverUpdateTransition(
      transaction?.attributes?.lastTransition,
      processNameOf(transaction)
    );
    const extra = carryForwardProtectedData(protectedData);
    const response = await writeParticipants(transactionId, updated, extra, transitionName);
    return response?.data?.data;
  });

/**
 * Overwrite participants (plus optional extra protectedData) in one write.
 */
const setParticipants = async (transactionId, participants, extra = {}) =>
  runSerialized(transactionId, async () => {
    const transaction = await showTransaction(transactionId);
    const transitionName = getWaiverUpdateTransition(
      transaction?.attributes?.lastTransition,
      processNameOf(transaction)
    );
    const response = await writeParticipants(transactionId, participants, extra, transitionName);
    return response?.data?.data;
  });

// Set the waiver_status of the participant mapped to a PandaDoc document.
// Used by the webhook for terminal document states (signed / expired / voided).
const setWaiverDocumentStatus = async (transactionId, documentId, waiverStatus) => {
  const { findParticipantIndexByDocumentId, updateParticipantAtIndex } = require('./participants');

  return readModifyWriteParticipants(transactionId, participants => {
    const index = findParticipantIndexByDocumentId(participants, documentId);
    if (index < 0) {
      log.warn('pandadoc-document-not-mapped-to-participant', { documentId });
      return null;
    }
    return updateParticipantAtIndex(participants, index, { waiver_status: waiverStatus });
  });
};

const markWaiverDocumentSigned = (transactionId, documentId) => {
  const { WAIVER_STATUS_SIGNED } = require('./participants');
  return setWaiverDocumentStatus(transactionId, documentId, WAIVER_STATUS_SIGNED);
};

const updateParticipantDocumentIds = (transactionId, documentIdByIndex) => {
  const { updateParticipantAtIndex } = require('./participants');

  return readModifyWriteParticipants(transactionId, participants =>
    Object.entries(documentIdByIndex).reduce(
      (acc, [indexStr, docId]) =>
        updateParticipantAtIndex(acc, parseInt(indexStr, 10), { pandadoc_document_id: docId }),
      participants
    )
  );
};

const replaceParticipant = (transactionId, participantIndex, participantUpdates) => {
  const { updateParticipantAtIndex, WAIVER_STATUS_PENDING } = require('./participants');

  return readModifyWriteParticipants(transactionId, participants =>
    updateParticipantAtIndex(participants, participantIndex, {
      ...participantUpdates,
      waiver_status: WAIVER_STATUS_PENDING,
    })
  );
};

const setWaiversSentAt = (transactionId, participants, waiversSentAt) =>
  setParticipants(transactionId, participants, { waiversSentAt });

module.exports = {
  getWaiverUpdateTransition,
  showTransaction,
  setParticipants,
  readModifyWriteParticipants,
  setWaiverDocumentStatus,
  markWaiverDocumentSigned,
  updateParticipantDocumentIds,
  replaceParticipant,
  setWaiversSentAt,
};
