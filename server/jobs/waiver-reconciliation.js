#!/usr/bin/env node
/**
 * Reconcile pending waiver statuses against PandaDoc document states, across
 * BOTH payment processes (default-booking and subscription-rental).
 *
 * Run via a scheduler or: node server/jobs/waiver-reconciliation.js
 */
require('../env').configureEnv();

const log = require('../log');
const { isPandaDocConfigured } = require('../api-util/pandadoc');
const { isIntegrationSdkConfigured, getIntegrationSdk } = require('../api-util/integrationSdk');
const { syncWaiverStatusesForTransaction } = require('../api-util/waiverStatusSync');
const { sendSecondaryWaiversForTransaction } = require('../api-util/waiverDelivery');
const { WAIVER_STATUS_PENDING, ROLE_SECONDARY } = require('../api-util/participants');

const WAIVER_PROCESSES = ['default-booking', 'subscription-rental'];

// Subscription is only "live" (secondaries should exist) once accepted → active.
const SUBSCRIPTION_ACTIVE_TRANSITIONS = [
  'transition/accept-subscription',
  'transition/confirm-subscription',
  'transition/extend-subscription',
  'transition/reactivate-subscription',
  'transition/update-waiver-status-from-active',
];

const hasPendingParticipant = participants =>
  participants.some(p => p.waiver_status === WAIVER_STATUS_PENDING && p.pandadoc_document_id);

const hasUnsentSecondaries = (tx, participants) => {
  const protectedData = tx?.attributes?.protectedData || {};
  if (protectedData.waiversSentAt) {
    return false;
  }
  const hasSecondaries = participants.some(p => p.role === ROLE_SECONDARY);
  if (!hasSecondaries) {
    return false;
  }
  const processName = tx?.attributes?.processName;
  if (processName === 'subscription-rental') {
    // Only re-drive delivery once the subscription is actually active.
    return SUBSCRIPTION_ACTIVE_TRANSITIONS.includes(tx?.attributes?.lastTransition);
  }
  return true;
};

const reconcile = async () => {
  const pandaDocOn = isPandaDocConfigured();
  const integrationOn = isIntegrationSdkConfigured();

  // Both off => feature is intentionally disabled; a clean skip is correct.
  if (!pandaDocOn && !integrationOn) {
    log.info('waiver-reconciliation-skipped-not-configured');
    return;
  }

  // Exactly one configured is a real misconfiguration: fail loud.
  if (!pandaDocOn || !integrationOn) {
    throw new Error(
      `waiver-reconciliation misconfigured: PandaDoc ${pandaDocOn ? 'ok' : 'missing'}, ` +
        `Integration API ${integrationOn ? 'ok' : 'missing'}`
    );
  }

  const integrationSdk = getIntegrationSdk();
  let reconciled = 0;
  let delivered = 0;
  let failed = 0;

  for (const processName of WAIVER_PROCESSES) {
    let page = 1;
    // Paginate to exhaustion (no silent cap).
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const response = await integrationSdk.transactions.query({
        processNames: [processName],
        page,
        perPage: 100,
      });
      const transactions = response?.data?.data || [];
      if (transactions.length === 0) {
        break;
      }

      for (const tx of transactions) {
        const participants = tx?.attributes?.protectedData?.participants || [];
        if (participants.length === 0) {
          continue;
        }

        // Per-transaction isolation: one bad transaction must not abort the run.
        try {
          if (hasUnsentSecondaries(tx, participants)) {
            const result = await sendSecondaryWaiversForTransaction(tx.id);
            if (result?.sent) {
              delivered += result.sent;
            }
          }
          if (hasPendingParticipant(participants)) {
            const result = await syncWaiverStatusesForTransaction(tx.id);
            reconciled += result?.updated || 0;
          }
        } catch (err) {
          failed += 1;
          log.warn('waiver-reconciliation-transaction-failed', {
            transactionId: tx.id?.uuid || tx.id,
            processName,
            err: err.message,
          });
        }
      }

      const totalPages = response?.data?.meta?.totalPages;
      if (totalPages && page >= totalPages) {
        break;
      }
      page += 1;
    }
  }

  log.info('waiver-reconciliation-complete', { reconciled, delivered, failed });
};

reconcile().catch(err => {
  log.error(err, 'waiver-reconciliation-failed');
  process.exit(1);
});
