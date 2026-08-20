const crypto = require('crypto');
const log = require('../log');
const { setWaiverDocumentStatus } = require('../api-util/waiverProtectedData');
const { isIntegrationSdkConfigured, getIntegrationSdk } = require('../api-util/integrationSdk');
const {
  WAIVER_STATUS_SIGNED,
  WAIVER_STATUS_EXPIRED,
  WAIVER_STATUS_VOIDED,
} = require('../api-util/participants');

// Terminal PandaDoc document states we mirror into local waiver_status.
// Anything not listed here (e.g. document.sent/viewed) is ignored.
const DOCUMENT_STATUS_TO_WAIVER_STATUS = {
  'document.completed': WAIVER_STATUS_SIGNED,
  'document.paid': WAIVER_STATUS_SIGNED,
  'document.expired': WAIVER_STATUS_EXPIRED,
  'document.voided': WAIVER_STATUS_VOIDED,
};

const verifyPandaDocSignature = (rawBody, signatureHeader) => {
  const secret = process.env.PANDADOC_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) {
    return false;
  }

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const signatures = signatureHeader.split(',').map(part => part.trim());

  return signatures.some(sig => {
    const value = sig.startsWith('sha256=') ? sig.slice(7) : sig;
    try {
      return crypto.timingSafeEqual(Buffer.from(value), Buffer.from(expected));
    } catch (e) {
      return false;
    }
  });
};

/**
 * Prefer the transaction id we stamp into PandaDoc document metadata at
 * creation time. Fall back to scanning recent transactions only when metadata
 * is missing (e.g. the primary document, created before the tx exists).
 */
const findTransactionIdForDocument = async (documentId, metadataTransactionId) => {
  if (metadataTransactionId) {
    return metadataTransactionId;
  }

  const integrationSdk = getIntegrationSdk();
  const response = await integrationSdk.transactions.query({
    perPage: 100,
    include: ['customer', 'provider'],
  });

  const transactions = response?.data?.data || [];
  const match = transactions.find(tx => {
    const participants = tx?.attributes?.protectedData?.participants || [];
    return participants.some(p => p.pandadoc_document_id === documentId);
  });

  return match?.id;
};

/**
 * POST /api/webhooks/pandadoc?signature=<hmac>
 * Raw JSON body (mounted with bodyParser.raw in apiRouter).
 */
module.exports = async (req, res) => {
  if (!isIntegrationSdkConfigured()) {
    res.status(503).send('Integration API is not configured');
    return;
  }

  // PandaDoc delivers the HMAC signature as a `signature` QUERY PARAMETER
  // (POST /api/webhooks/pandadoc?signature=<hex>), not as a request header.
  // Header lookups are kept only as a defensive fallback.
  const signature =
    req.query?.signature || req.headers['x-pandadoc-signature'] || req.headers['signature'];
  const rawBody = req.body;

  if (!verifyPandaDocSignature(rawBody, signature)) {
    log.warn('pandadoc-webhook-signature-invalid');
    res.status(401).send('Invalid signature');
    return;
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch (e) {
    res.status(400).send('Invalid JSON');
    return;
  }

  const events = Array.isArray(payload) ? payload : [payload];

  try {
    for (const event of events) {
      const eventType = event?.event || event?.name;
      const documentId = event?.data?.id || event?.data?.uuid;
      const status = event?.data?.status;
      const metadataTransactionId = event?.data?.metadata?.transactionId;

      if (eventType !== 'document_state_changed' || !documentId) {
        continue;
      }

      const waiverStatus = DOCUMENT_STATUS_TO_WAIVER_STATUS[status];
      if (!waiverStatus) {
        continue;
      }

      const transactionId = await findTransactionIdForDocument(documentId, metadataTransactionId);
      if (!transactionId) {
        log.warn('pandadoc-webhook-transaction-not-found', { documentId });
        continue;
      }

      await setWaiverDocumentStatus(transactionId, documentId, waiverStatus);
    }

    res.json({ received: true });
  } catch (err) {
    log.error(err, 'pandadoc-webhook-handler-failed');
    res.status(500).send('Webhook handler failed');
  }
};
