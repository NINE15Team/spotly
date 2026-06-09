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
 * Normalize Sharetribe UUID (object or string) to a plain uuid string for Integration API calls.
 *
 * @param {string|Object} id
 * @returns {string|null}
 */
const normalizeUuid = id => {
  if (!id) {
    return null;
  }
  if (typeof id === 'string') {
    return id;
  }
  if (typeof id === 'object' && id.uuid) {
    return id.uuid;
  }
  return null;
};

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
  const id = normalizeUuid(transactionId);
  if (!id) {
    const error = new Error('Invalid transaction id for Integration API transition.');
    error.status = 400;
    throw error;
  }
  return integrationSdk.transactions.transition({
    id,
    transition,
    params,
  });
};

/**
 * @param {UUID|string} transactionId
 */
const showTransaction = (transactionId, queryParams = {}) => {
  const integrationSdk = getIntegrationSdk();
  const id = normalizeUuid(transactionId);
  if (!id) {
    const error = new Error('Invalid transaction id for Integration API show.');
    error.status = 400;
    throw error;
  }
  return integrationSdk.transactions.show({
    id,
    include: ['customer', 'provider', 'listing', 'booking'],
    ...queryParams,
  });
};

/**
 * Merge metadata on a transaction (preserves existing keys).
 */
const updateTransactionMetadata = (transactionId, metadataPatch) => {
  const integrationSdk = getIntegrationSdk();
  const id = normalizeUuid(transactionId);
  if (!id) {
    const error = new Error('Invalid transaction id for Integration API metadata update.');
    error.status = 400;
    throw error;
  }
  return integrationSdk.transactions.updateMetadata({
    id,
    metadata: metadataPatch,
  });
};

/**
 * @param {UUID|string|Object} listingId
 */
const showListing = listingId => {
  const integrationSdk = getIntegrationSdk();
  const id = normalizeUuid(listingId);
  if (!id) {
    const error = new Error('Invalid listing id for Integration API show.');
    error.status = 400;
    throw error;
  }
  return integrationSdk.listings.show({ id });
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

/**
 * Find active subscription transactions for a given customer + listing combination.
 * Returns the first match, or null if none found.
 *
 * "Active" means any non-final state: pending-payment, payment-confirmed, active, payment-overdue.
 * Cancelled / expired transactions are excluded by checking lastTransition.
 *
 * @param {string} customerId  - plain uuid string
 * @param {string} listingId   - plain uuid string
 * @param {string} processName - e.g. 'subscription-rental'
 * @returns {Promise<Object|null>}
 */
const findActiveSubscriptionForListing = async (customerId, listingId, processName) => {
  const integrationSdk = getIntegrationSdk();
  const response = await integrationSdk.transactions.query({
    customerId,
    listingId,
    processNames: [processName],
    perPage: 10,
  });
  const transactions = response?.data?.data || [];
  const FINAL_TRANSITIONS = [
    'transition/cancel-subscription',
    'transition/cancel-subscription-from-overdue',
    'transition/expire',
    'transition/expire-payment',
    'transition/decline-subscription',
    'transition/expire-acceptance',
    'transition/abort-subscription',
  ];
  return (
    transactions.find(
      tx => !FINAL_TRANSITIONS.includes(tx.attributes?.lastTransition)
    ) || null
  );
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
  normalizeUuid,
  getIntegrationSdk,
  isIntegrationSdkConfigured,
  transitionTransaction,
  showTransaction,
  showListing,
  updateTransactionMetadata,
  findTransactionByStripeSubscriptionId,
  findActiveSubscriptionForListing,
  handleIntegrationError,
};
