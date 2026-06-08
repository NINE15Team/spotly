import { isSubscriptionProcessAlias } from '../transactions/transaction';

/**
 * Returns the per-unit price suffix for a listing (e.g. "per day", "per month").
 *
 * @param {Object} intl - React Intl instance
 * @param {string} transactionProcessAlias - Listing publicData.transactionProcessAlias
 * @param {string} unitType - Listing publicData.unitType
 * @param {string} perUnitMessageId - i18n id for standard per-unit label (ICU with unitType)
 * @param {string} subscriptionPerUnitMessageId - i18n id for subscription listings
 * @returns {string}
 */
export const getListingPricePerUnitLabel = (
  intl,
  transactionProcessAlias,
  unitType,
  perUnitMessageId,
  subscriptionPerUnitMessageId
) => {
  if (isSubscriptionProcessAlias(transactionProcessAlias)) {
    return intl.formatMessage({ id: subscriptionPerUnitMessageId });
  }
  if (unitType) {
    return intl.formatMessage({ id: perUnitMessageId }, { unitType });
  }
  return '';
};
