const { getSdk } = require('./sdk');
const { normalizeUuid } = require('./integrationSdk');
const { isSubscriptionProcess } = require('./subscriptionConstants');

/**
 * Ensure the logged-in user is the customer on the transaction.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {UUID|string} transactionId
 */
/**
 * Ensure the logged-in user has the given role on the subscription transaction.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {UUID|string} transactionId
 * @param {'customer'|'provider'} role
 */
const assertRoleOnTransaction = async (req, res, transactionId, role) => {
  const sdk = getSdk(req, res);
  const currentUserResponse = await sdk.currentUser.show();
  const currentUserId = currentUserResponse?.data?.data?.id?.uuid;

  if (!currentUserId) {
    const error = new Error('Authentication required.');
    error.status = 401;
    throw error;
  }

  const txResponse = await sdk.transactions.show({
    id: normalizeUuid(transactionId),
    include: ['customer', 'provider', 'listing'],
  });

  const transaction = txResponse.data.data;
  const partyId = transaction.relationships?.[role]?.data?.id?.uuid;

  if (partyId !== currentUserId) {
    const error = new Error('Not authorized for this transaction.');
    error.status = 403;
    throw error;
  }

  const listingId = transaction.relationships?.listing?.data?.id;
  const listing = txResponse.data.included?.find(
    i => i.type === 'listing' && i.id?.uuid === listingId?.uuid
  );
  const processAlias = listing?.attributes?.publicData?.transactionProcessAlias;

  if (!isSubscriptionProcess(processAlias)) {
    const error = new Error('Transaction is not a subscription rental.');
    error.status = 400;
    throw error;
  }

  return { transaction, sdk };
};

/**
 * Ensure the logged-in user is the customer on the transaction.
 */
const assertCustomerOnTransaction = (req, res, transactionId) =>
  assertRoleOnTransaction(req, res, transactionId, 'customer');

/**
 * Ensure the logged-in user is the provider on the transaction.
 */
const assertProviderOnTransaction = (req, res, transactionId) =>
  assertRoleOnTransaction(req, res, transactionId, 'provider');

module.exports = {
  assertCustomerOnTransaction,
  assertProviderOnTransaction,
};
