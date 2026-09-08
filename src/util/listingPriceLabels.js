import { isSubscriptionProcessAlias } from '../transactions/transaction';
import { isMonthlyListingType } from './hakoListingTypes';

/**
 * Returns the per-unit price suffix for a listing (e.g. "per day", "per month").
 *
 * Subscription listings store their price with unitType "day" (the backend prorates
 * the first payment per day), but customers are billed monthly, so they read "per month".
 * A listing counts as a subscription if either its transaction process or its listing
 * type is the monthly one, so a stale/missing process alias can't fall back to "per day".
 *
 * @param {Object} intl - React Intl instance
 * @param {string} transactionProcessAlias - Listing publicData.transactionProcessAlias
 * @param {string} unitType - Listing publicData.unitType
 * @param {string} perUnitMessageId - i18n id for standard per-unit label (ICU with unitType)
 * @param {string} subscriptionPerUnitMessageId - i18n id for subscription listings
 * @param {string} [listingType] - Listing publicData.listingType
 * @returns {string}
 */
export const getListingPricePerUnitLabel = (
  intl,
  transactionProcessAlias,
  unitType,
  perUnitMessageId,
  subscriptionPerUnitMessageId,
  listingType
) => {
  if (isSubscriptionProcessAlias(transactionProcessAlias) || isMonthlyListingType(listingType)) {
    return intl.formatMessage({ id: subscriptionPerUnitMessageId });
  }
  if (unitType) {
    return intl.formatMessage({ id: perUnitMessageId }, { unitType });
  }
  return '';
};
