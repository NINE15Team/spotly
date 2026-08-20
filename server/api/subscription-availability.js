const { getSdk, handleError } = require('../api-util/sdk');
const { findActiveSubscriptionForListing } = require('../api-util/integrationSdk');
const { SUBSCRIPTION_PROCESS_NAME } = require('../api-util/subscriptionConstants');

/**
 * Normalize Sharetribe UUID (object or string) to a plain uuid string.
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
 * Best-effort current user id for privacy-safe ownership checks.
 * Anonymous / unauthenticated requests return null.
 *
 * @param {Object} req
 * @param {Object} res
 * @returns {Promise<string|null>}
 */
const getCurrentUserIdMaybe = async (req, res) => {
  try {
    const sdk = getSdk(req, res);
    const userResponse = await sdk.currentUser.show();
    return normalizeUuid(userResponse?.data?.data?.id);
  } catch (e) {
    return null;
  }
};

/**
 * POST /api/subscription-availability
 * Body: { listingId: UUID | string }
 *
 * Returns privacy-safe subscription exclusivity for a listing:
 * - isAvailable: true when no non-final subscription exists
 * - isCurrentUserSubscription: true only when the active tx belongs to the caller
 * - activeSubscriptionId: set only for the current user's own active subscription
 *
 * Never exposes another customer's transaction id.
 */
module.exports = async (req, res) => {
  const listingId = normalizeUuid(req.body?.listingId);

  if (!listingId) {
    res.status(400).json({ message: 'listingId is required.' });
    return;
  }

  try {
    const [activeSubscription, currentUserId] = await Promise.all([
      findActiveSubscriptionForListing(listingId, SUBSCRIPTION_PROCESS_NAME),
      getCurrentUserIdMaybe(req, res),
    ]);

    if (!activeSubscription) {
      res.status(200).json({
        isAvailable: true,
        isCurrentUserSubscription: false,
        activeSubscriptionId: null,
      });
      return;
    }

    const activeSubscriptionId = normalizeUuid(activeSubscription.id);
    const ownerId = normalizeUuid(activeSubscription.relationships?.customer?.data?.id);
    const isCurrentUserSubscription = Boolean(
      currentUserId && ownerId && currentUserId === ownerId
    );

    res.status(200).json({
      isAvailable: false,
      isCurrentUserSubscription,
      // Privacy: never leak another customer's transaction id.
      activeSubscriptionId: isCurrentUserSubscription ? activeSubscriptionId : null,
    });
  } catch (e) {
    handleError(res, e);
  }
};
