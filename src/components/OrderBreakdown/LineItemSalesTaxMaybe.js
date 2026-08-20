import React from 'react';
import { FormattedMessage, intlShape } from '../../util/reactIntl';
import { formatMoney } from '../../util/currency';
import { LINE_ITEM_SALES_TAX, propTypes } from '../../util/types';

import css from './OrderBreakdown.module.css';

/**
 * A component that renders the sales tax (Stripe Tax) as a line item.
 * The line item is charged to the customer only (includeFor: ['customer']).
 * A calculated $0 amount is still shown (e.g. no Stripe Tax registration in
 * the listing's state).
 *
 * When `showEstimate` is true and no tax line exists yet (e.g. listing estimate
 * before tax could be resolved), a placeholder row is shown.
 *
 * @component
 * @param {Object} props
 * @param {Array<propTypes.lineItem>} props.lineItems - The line items to render
 * @param {boolean} props.isCustomer - Whether the current user is the customer
 * @param {boolean} [props.showEstimate] - Whether to show a placeholder when tax is not yet calculated
 * @param {intlShape} props.intl - The intl object
 * @returns {JSX.Element}
 */
const LineItemSalesTaxMaybe = props => {
  const { lineItems, isCustomer, showEstimate = false, intl } = props;

  if (!isCustomer) {
    return null;
  }

  const salesTaxLineItem = lineItems.find(
    item => item.code === LINE_ITEM_SALES_TAX && !item.reversal
  );

  if (salesTaxLineItem) {
    return (
      <div className={css.lineItem}>
        <span className={css.itemLabel}>
          <FormattedMessage id="OrderBreakdown.salesTax" />
        </span>
        <span className={css.itemValue}>{formatMoney(intl, salesTaxLineItem.lineTotal)}</span>
      </div>
    );
  }

  return showEstimate ? (
    <div className={css.lineItem}>
      <span className={css.itemLabel}>
        <FormattedMessage id="OrderBreakdown.salesTax" />
      </span>
      <span className={css.itemValue}>
        <FormattedMessage id="OrderBreakdown.salesTaxCalculatedAtCheckout" />
      </span>
    </div>
  ) : null;
};

export default LineItemSalesTaxMaybe;
