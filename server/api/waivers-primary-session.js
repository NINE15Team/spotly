const { handleError, serialize } = require('../api-util/sdk');
const { isPandaDocConfigured, createPrimarySigningSession } = require('../api-util/pandadoc');
const {
  buildParticipantsArray,
  validateParticipantsForCheckout,
} = require('../api-util/participants');

/**
 * POST /api/waivers/primary-session
 * Body: { primaryUser: { name, email }, secondaries: [{ name, email }], seats }
 *
 * Creates a PandaDoc document for the primary renter and returns an embedded
 * signing session. Used at checkout for BOTH default-booking and
 * subscription-rental (the primary must sign before payment either way).
 *
 * NOTE: this trusts primaryUser from the request body. See WAIVER_IMPLEMENTATION.md
 * §12.2 for recommended hardening (derive from the authenticated currentUser).
 */
module.exports = (req, res) => {
  if (!isPandaDocConfigured()) {
    res.status(503).json({ enabled: false, error: 'Waiver signing is not configured' });
    return;
  }

  const { primaryUser, secondaries = [], seats = 1 } = req.body || {};
  const expectedSecondaryCount = Math.max(0, (seats || 1) - 1);
  const participants = buildParticipantsArray({ primaryUser, secondaries });

  const validationError = validateParticipantsForCheckout(participants, expectedSecondaryCount);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const primary = participants[0];

  createPrimarySigningSession({ name: primary.name, email: primary.email })
    .then(result => {
      res
        .status(200)
        .set('Content-Type', 'application/transit+json')
        .send(
          serialize({
            enabled: true,
            documentId: result.documentId,
            sessionId: result.sessionId,
            sessionUrl: result.sessionUrl,
          })
        )
        .end();
    })
    .catch(e => {
      handleError(res, e, { skipErrorLogging: false });
    });
};
