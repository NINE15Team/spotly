const { getSdk } = require('./sdk');
const { isSubscriptionProcess } = require('./subscriptionConstants');

/**
 * Ensure the logged-in user is the customer on the transaction.
 *
 * @param {Object} req
 * @param {Object} res
 * @param {UUID|string} transactionId
 */
const assertCustomerOnTransaction = async (req, res, transactionId) => {
  const sdk = getSdk(req, res);
  const currentUserResponse = await sdk.currentUser.show();
  const currentUserId = currentUserResponse?.data?.data?.id?.uuid;

  if (!currentUserId) {
    const error = new Error('Authentication required.');
    error.status = 401;
    throw error;
  }

  const txResponse = await sdk.transactions.show({
    id: transactionId,
    include: ['customer', 'listing'],
  });

  const transaction = txResponse.data.data;
  const customerId = transaction.relationships?.customer?.data?.id?.uuid;

  if (customerId !== currentUserId) {
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

module.exports = {
  assertCustomerOnTransaction,
};
