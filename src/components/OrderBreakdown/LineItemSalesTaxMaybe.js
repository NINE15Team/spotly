import React from 'react';
import { FormattedMessage, intlShape } from '../../util/reactIntl';
import { formatMoney } from '../../util/currency';
import { LINE_ITEM_SALES_TAX, propTypes } from '../../util/types';

import css from './OrderBreakdown.module.css';

/**
 * A component that renders the sales tax (Stripe Tax) as a line item.
 * The line item is charged to the customer only (includeFor: ['customer'])
 * and is omitted entirely when the calculated tax is zero.
 *
 * @component
 * @param {Object} props
 * @param {Array<propTypes.lineItem>} props.lineItems - The line items to render
 * @param {boolean} props.isCustomer - Whether the current user is the customer
 * @param {intlShape} props.intl - The intl object
 * @returns {JSX.Element}
 */
const LineItemSalesTaxMaybe = props => {
  const { lineItems, isCustomer, intl } = props;

  const salesTaxLineItem = lineItems.find(
    item => item.code === LINE_ITEM_SALES_TAX && !item.reversal
  );

  return isCustomer && salesTaxLineItem ? (
    <div className={css.lineItem}>
      <span className={css.itemLabel}>
        <FormattedMessage id="OrderBreakdown.salesTax" />
      </span>
      <span className={css.itemValue}>{formatMoney(intl, salesTaxLineItem.lineTotal)}</span>
    </div>
  ) : null;
};

export default LineItemSalesTaxMaybe;
