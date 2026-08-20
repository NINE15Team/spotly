const { serialize } = require('../api-util/sdk');
const { isPandaDocConfigured } = require('../api-util/pandadoc');

/**
 * GET /api/waivers/config
 * Public: tells the client whether the waiver feature is enabled so it can hide
 * all waiver UI when PandaDoc is not configured.
 */
module.exports = (req, res) => {
  res
    .status(200)
    .set('Content-Type', 'application/transit+json')
    .send(serialize({ enabled: isPandaDocConfigured() }))
    .end();
};
