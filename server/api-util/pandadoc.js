const log = require('../log');
const { splitName } = require('./participants');
const { getWaiverReminderConfig } = require('./waiverReminderConfig');

const PANDADOC_API_BASE =
  process.env.PANDADOC_API_BASE_URL || 'https://api.pandadoc.com/public/v1';

// Some endpoints (document settings / expiration) live under the v2 API while
// the rest of our calls use v1. Derive the v2 base from the configured v1 base
// so a single override still works.
const PANDADOC_API_BASE_V2 =
  process.env.PANDADOC_API_BASE_V2_URL || PANDADOC_API_BASE.replace('/public/v1', '/public/v2');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const isPandaDocConfigured = () =>
  !!process.env.PANDADOC_API_KEY && !!process.env.PANDADOC_WAIVER_TEMPLATE_ID;

const getTemplateId = () => process.env.PANDADOC_WAIVER_TEMPLATE_ID;

/**
 * Optional workspace member who should appear as the document owner/sender.
 * Must be an email (or membership id) that exists in the PandaDoc workspace.
 * See: https://developers.pandadoc.com/reference/send-document
 * and https://developers.pandadoc.com/docs/create-document-on-members-behalf
 *
 * @returns {{ email: string }|{ membership_id: string }|null}
 */
const getPandaDocSender = () => {
  const email = (process.env.PANDADOC_SENDER_EMAIL || '').trim();
  if (email) {
    return { email };
  }
  const membershipId = (process.env.PANDADOC_SENDER_MEMBERSHIP_ID || '').trim();
  if (membershipId) {
    return { membership_id: membershipId };
  }
  return null;
};

const pandaDocRequest = async (path, options = {}) => {
  if (!process.env.PANDADOC_API_KEY) {
    throw new Error('PANDADOC_API_KEY is not configured');
  }

  const baseUrl = options.baseUrl || PANDADOC_API_BASE;
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `API-Key ${process.env.PANDADOC_API_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = { raw: text };
  }

  if (!response.ok) {
    const error = new Error(
      data?.detail || data?.message || `PandaDoc API error ${response.status}`
    );
    error.status = response.status;
    error.data = data;
    log.error(error, 'pandadoc-api-request-failed', { path, status: response.status });
    throw error;
  }

  return data;
};

const waitForDocumentStatus = async (documentId, targetStatus, maxAttempts = 20) => {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const doc = await pandaDocRequest(`/documents/${documentId}`, { method: 'GET' });
    if (doc?.status === targetStatus) {
      return doc;
    }
    await sleep(1000);
  }
  throw new Error(`PandaDoc document ${documentId} did not reach status ${targetStatus}`);
};

/**
 * Create a PandaDoc document for a single participant from the waiver template.
 *
 * @param {Object} params
 * @param {string} params.name
 * @param {string} params.email
 * @param {string} [params.documentName]
 * @param {Object} [params.metadata] - stored on the PandaDoc document; we put the
 *   Sharetribe transaction id here so the webhook can route without scanning.
 */
const createDocumentForParticipant = async ({ name, email, documentName, metadata }) => {
  const templateId = getTemplateId();
  const { firstName, lastName } = splitName(name);
  const owner = getPandaDocSender();

  const metadataMaybe = metadata && Object.keys(metadata).length ? { metadata } : {};

  const created = await pandaDocRequest('/documents', {
    method: 'POST',
    body: JSON.stringify({
      name: documentName || `Waiver - ${name}`,
      template_uuid: templateId,
      // Create on behalf of the branded workspace member when configured.
      ...(owner ? { owner } : {}),
      recipients: [{ email, first_name: firstName, last_name: lastName || '.', role: 'Client' }],
      // Pre-fill the "User" text field on the template.
      // Key must match the field's Merge Field name in PandaDoc (User.Name).
      // The Date field auto-fills with the signing date, so it is not sent here.
      fields: { 'User.Name': { value: name } },
      ...metadataMaybe,
    }),
  });

  const documentId = created?.id;
  if (!documentId) {
    throw new Error('PandaDoc did not return a document id');
  }

  await waitForDocumentStatus(documentId, 'document.draft');

  // Cap the reminder window: an expired document is a final state, so PandaDoc
  // stops auto-reminders once it expires. Set while still in draft. Best-effort
  // so a settings/config problem never blocks document creation.
  await setDocumentExpiration(documentId);

  return documentId;
};

const sendDocument = async (documentId, { silent = false } = {}) => {
  const sender = getPandaDocSender();
  await pandaDocRequest(`/documents/${documentId}/send`, {
    method: 'POST',
    body: JSON.stringify({
      silent,
      message: 'Please review and sign your rental waiver.',
      ...(sender ? { sender } : {}),
    }),
  });
  await waitForDocumentStatus(documentId, 'document.sent');
};

const createEmbeddedSession = async (documentId, recipientEmail) => {
  const session = await pandaDocRequest(`/documents/${documentId}/session`, {
    method: 'POST',
    body: JSON.stringify({ recipient: recipientEmail, lifetime: 3600 }),
  });

  if (!session?.id) {
    throw new Error('PandaDoc did not return a session id');
  }

  return { sessionId: session.id, sessionUrl: `https://app.pandadoc.com/s/${session.id}` };
};

const createPrimarySigningSession = async ({ name, email }) => {
  const documentId = await createDocumentForParticipant({
    name,
    email,
    documentName: `Primary waiver - ${name}`,
  });
  await sendDocument(documentId, { silent: true });
  // Only matters if the primary abandons the embedded session; once they sign,
  // the completed document rejects reminders. Best-effort.
  await setAutoReminders(documentId);
  const session = await createEmbeddedSession(documentId, email);
  return { documentId, ...session };
};

const createAndEmailSecondaryWaiver = async ({ name, email, metadata }) => {
  const documentId = await createDocumentForParticipant({
    name,
    email,
    documentName: `Rental waiver - ${name}`,
    metadata,
  });
  await sendDocument(documentId, { silent: false });
  // Auto-reminders must be configured after the document leaves draft.
  // Covers both initial secondary waivers and participant swaps (which route
  // through this function), so a swapped-in participant gets a fresh schedule.
  await setAutoReminders(documentId);
  return documentId;
};

const voidDocument = async documentId => {
  await pandaDocRequest(`/documents/${documentId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 11 }), // 11 = voided
  });
};

const getDocumentStatus = async documentId => {
  const doc = await pandaDocRequest(`/documents/${documentId}`, { method: 'GET' });
  return doc?.status;
};

const isDocumentCompleted = status =>
  status === 'document.completed' || status === 'document.paid';

const isDocumentExpired = status => status === 'document.expired';

const isDocumentVoided = status => status === 'document.voided';

/**
 * Set a document's expiration window (in days) via the v2 settings endpoint.
 * Expiring an unsigned document moves it to a final state, which is how we cap
 * the auto-reminder window (auto-reminders have no built-in max count).
 * Best-effort: logs and swallows failures so document creation is never blocked.
 */
const setDocumentExpiration = async documentId => {
  try {
    const { expirationDays } = getWaiverReminderConfig();
    await pandaDocRequest(`/documents/${documentId}/settings`, {
      method: 'PATCH',
      baseUrl: PANDADOC_API_BASE_V2,
      body: JSON.stringify({ expires_in: expirationDays }),
    });
  } catch (err) {
    log.warn('pandadoc-set-document-expiration-failed', { documentId, err: err.message });
  }
};

/**
 * Configure PandaDoc email auto-reminders for a document. Must be called after
 * the document has been sent (reminders apply after initial dispatch). PandaDoc
 * stops these automatically once the document is completed or expired, so no
 * custom reminder job is needed. Best-effort: never blocks the signing flow.
 */
const setAutoReminders = async documentId => {
  try {
    const config = getWaiverReminderConfig();
    if (!config.enabled) {
      log.info('pandadoc-auto-reminders-disabled', { documentId });
      return;
    }
    await pandaDocRequest(`/documents/${documentId}/auto-reminders`, {
      method: 'PATCH',
      body: JSON.stringify({
        enabled: true,
        delivery_method: config.deliveryMethod, // email only
        initial_delay_days: config.initialDelayDays,
        is_recurring: config.recurring,
        recurrence_frequency_days: config.frequencyDays,
      }),
    });
  } catch (err) {
    log.warn('pandadoc-set-auto-reminders-failed', { documentId, err: err.message });
  }
};

module.exports = {
  isPandaDocConfigured,
  getPandaDocSender,
  createPrimarySigningSession,
  createAndEmailSecondaryWaiver,
  voidDocument,
  getDocumentStatus,
  isDocumentCompleted,
  isDocumentExpired,
  isDocumentVoided,
  setDocumentExpiration,
  setAutoReminders,
  waitForDocumentStatus,
  // Exported for unit tests
  sendDocument,
};
