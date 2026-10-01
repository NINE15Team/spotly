const { handleError, serialize, getSdk } = require('../api-util/sdk');
const {
  isPandaDocConfigured,
  getDocumentStatusForRecipientCheck,
  isDocumentCompleted,
} = require('../api-util/pandadoc');

/**
 * Check whether the primary renter's waiver document has been completed.
 *
 * The checkout page normally learns about completion from PandaDoc's
 * `session_view.document.completed` postMessage inside the embedded iframe.
 * That message can be missed (tab backgrounded mid-sign, modal closed early,
 * page reloaded), so the client calls this as a fallback and the server asks
 * PandaDoc directly. Only the document's own recipient may query it.
 */
module.exports = (req, res) => {
  if (!isPandaDocConfigured()) {
    res.status(503).json({ enabled: false, error: 'Waiver signing is not configured' });
    return;
  }

  const { documentId } = req.body || {};
  if (!documentId || typeof documentId !== 'string') {
    res.status(400).json({ error: 'documentId is required' });
    return;
  }

  const sdk = getSdk(req, res);

  sdk.currentUser
    .show()
    .then(currentUserResponse => {
      const email = (currentUserResponse?.data?.data?.attributes?.email || '').trim().toLowerCase();
      if (!email) {
        const error = new Error('Unauthorized');
        error.status = 401;
        throw error;
      }
      return Promise.all([email, getDocumentStatusForRecipientCheck(documentId)]);
    })
    .then(([email, { status, recipientEmails }]) => {
      if (!recipientEmails.includes(email)) {
        const error = new Error('Forbidden');
        error.status = 403;
        throw error;
      }

      res
        .status(200)
        .set('Content-Type', 'application/transit+json')
        .send(
          serialize({
            documentId,
            status,
            signed: isDocumentCompleted(status),
          })
        )
        .end();
    })
    .catch(e => {
      handleError(res, e);
    });
};
