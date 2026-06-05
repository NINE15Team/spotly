import React from 'react';
import { FormattedMessage } from '../../../util/reactIntl';

import css from '../SubmitFinePrint/SubmitFinePrint.module.css';

/**
 * Fine print for subscription checkout (recurring billing mandate).
 */
const SubscriptionSubmitFinePrint = ({ payoutDetailsWarning, isOwnListing }) => {
  return (
    <p className={css.finePrint}>
      {payoutDetailsWarning ? (
        payoutDetailsWarning
      ) : isOwnListing ? (
        <FormattedMessage id="OrderPanel.ownListing" />
      ) : (
        <>
          <FormattedMessage id="SubscriptionOrderForm.recurringPaymentMandate" />
          <br />
          <FormattedMessage id="SubscriptionOrderForm.billingAnchorInfo" />
        </>
      )}
    </p>
  );
};

export default SubscriptionSubmitFinePrint;
