const sharetribeIntegrationSdk = require('sharetribe-flex-integration-sdk');
const Decimal = require('decimal.js');
const log = require('../log');
const { METADATA_KEYS } = require('./subscriptionConstants');

const CLIENT_ID = process.env.SHARETRIBE_INTEGRATION_CLIENT_ID;
const CLIENT_SECRET = process.env.SHARETRIBE_INTEGRATION_CLIENT_SECRET;

const typeHandlers = [
  {
    type: sharetribeIntegrationSdk.types.BigDecimal,
    customType: Decimal,
    writer: v => new sharetribeIntegrationSdk.types.BigDecimal(v.toString()),
    reader: v => new Decimal(v.value),
  },
];

let integrationSdkInstance = null;

/**
 * Returns true when Integration API credentials are configured.
 */
const isIntegrationSdkConfigured = () => Boolean(CLIENT_ID && CLIENT_SECRET);

/**
 * Sharetribe Integration SDK (operator privileges). Server-side only.
 */
const getIntegrationSdk = () => {
  if (!isIntegrationSdkConfigured()) {
    const error = new Error('Sharetribe Integration API credentials are not configured.');
    error.status = 503;
    error.statusText = error.message;
    throw error;
  }

  if (!integrationSdkInstance) {
    integrationSdkInstance = sharetribeIntegrationSdk.createInstance({
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
    });
  }

  return integrationSdkInstance;
};

/**
 * Run an Integration API transition as marketplace operator.
 *
 * @param {Object} params
 * @param {UUID} params.transactionId
 * @param {string} params.transition
 * @param {Object} [params.params] transition params (e.g. booking dates)
 */
const transitionTransaction = ({ transactionId, transition, params = {} }) => {
  const integrationSdk = getIntegrationSdk();
  return integrationSdk.transactions.transition({
    id: transactionId,
    transition,
    params,
  });
};

/**
 * @param {UUID} transactionId
 */
const showTransaction = (transactionId, queryParams = {}) => {
  const integrationSdk = getIntegrationSdk();
  return integrationSdk.transactions.show({
    id: transactionId,
    include: ['customer', 'provider', 'listing', 'booking'],
    ...queryParams,
  });
};

/**
 * Merge metadata on a transaction (preserves existing keys).
 */
const updateTransactionMetadata = (transactionId, metadataPatch) => {
  const integrationSdk = getIntegrationSdk();
  return integrationSdk.transactions.updateMetadata({
    id: transactionId,
    metadata: metadataPatch,
  });
};

/**
 * Find transaction by Stripe subscription id stored in metadata.
 */
const findTransactionByStripeSubscriptionId = async stripeSubscriptionId => {
  const integrationSdk = getIntegrationSdk();
  const response = await integrationSdk.transactions.query({
    metadata: { [METADATA_KEYS.STRIPE_SUBSCRIPTION_ID]: stripeSubscriptionId },
    perPage: 1,
  });
  const transactions = response?.data?.data || [];
  return transactions[0] || null;
};

const handleIntegrationError = (res, error) => {
  log.error(error, 'integration-api-request-failed', error.data);
  const status = error.status || 500;
  res.status(status).json({
    name: 'IntegrationAPIError',
    message: error.message || 'Integration API request failed',
    status,
    statusText: error.statusText,
  });
};

module.exports = {
  getIntegrationSdk,
  isIntegrationSdkConfigured,
  transitionTransaction,
  showTransaction,
  updateTransactionMetadata,
  findTransactionByStripeSubscriptionId,
  handleIntegrationError,
};
