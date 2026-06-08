import { fakeIntl } from '../../util/testData';
import {
  TX_TRANSITION_ACTOR_CUSTOMER as CUSTOMER,
  TX_TRANSITION_ACTOR_PROVIDER as PROVIDER,
  getProcess,
} from '../../transactions/transaction';
import { getStateDataForSubscriptionProcess } from './TransactionPage.stateDataSubscription';

const process = getProcess('subscription-rental');
const states = process.states;
const processName = 'subscription-rental';

const buildProcessInfo = processState => ({ processName, processState, states });

const buildHandlers = () => ({
  cancelInProgress: false,
  cancelError: null,
  portalInProgress: false,
  portalError: null,
  onCancelSubscription: jest.fn(),
  onOpenBillingPortal: jest.fn(),
});

describe('getStateDataForSubscriptionProcess (TransactionPage)', () => {
  describe('[ACTIVE, CUSTOMER]', () => {
    it('exposes cancel as primary and portal as secondary when handlers are present', () => {
      const txInfo = {
        transactionRole: CUSTOMER,
        intl: fakeIntl,
        subscriptionHandlers: buildHandlers(),
      };
      const result = getStateDataForSubscriptionProcess(txInfo, buildProcessInfo(states.ACTIVE));

      expect(result.processName).toBe(processName);
      expect(result.showActionButtons).toBe(true);
      expect(result.primaryButtonProps.onAction).toEqual(expect.any(Function));
      expect(result.primaryButtonProps.buttonText).toBe(
        'TransactionPage.subscription-rental.customer.cancelSubscription'
      );
      expect(result.secondaryButtonProps.buttonText).toBe(
        'TransactionPage.subscription-rental.customer.updatePaymentMethod'
      );
    });

    it('shows no action buttons when handlers are absent', () => {
      const txInfo = { transactionRole: CUSTOMER, intl: fakeIntl, subscriptionHandlers: {} };
      const result = getStateDataForSubscriptionProcess(txInfo, buildProcessInfo(states.ACTIVE));

      expect(result.showActionButtons).toBe(false);
      expect(result.primaryButtonProps).toBeNull();
      expect(result.secondaryButtonProps).toBeNull();
    });
  });

  describe('[PAYMENT_OVERDUE, CUSTOMER]', () => {
    it('puts the billing portal as the primary action and shows extra info', () => {
      const txInfo = {
        transactionRole: CUSTOMER,
        intl: fakeIntl,
        subscriptionHandlers: buildHandlers(),
      };
      const result = getStateDataForSubscriptionProcess(
        txInfo,
        buildProcessInfo(states.PAYMENT_OVERDUE)
      );

      expect(result.showExtraInfo).toBe(true);
      expect(result.showActionButtons).toBe(true);
      expect(result.primaryButtonProps.buttonText).toBe(
        'TransactionPage.subscription-rental.customer.updatePaymentMethod'
      );
    });
  });

  describe('[PAYMENT_CONFIRMED, CUSTOMER]', () => {
    it('shows headings + extra info but no buttons', () => {
      const txInfo = { transactionRole: CUSTOMER, intl: fakeIntl, subscriptionHandlers: {} };
      const result = getStateDataForSubscriptionProcess(
        txInfo,
        buildProcessInfo(states.PAYMENT_CONFIRMED)
      );

      expect(result.showDetailCardHeadings).toBe(true);
      expect(result.showExtraInfo).toBe(true);
      expect(result.showActionButtons).toBeUndefined();
    });
  });

  describe('provider + final states', () => {
    it('[ACTIVE, PROVIDER] shows headings only', () => {
      const txInfo = { transactionRole: PROVIDER, intl: fakeIntl, subscriptionHandlers: {} };
      const result = getStateDataForSubscriptionProcess(txInfo, buildProcessInfo(states.ACTIVE));

      expect(result.showDetailCardHeadings).toBe(true);
      expect(result.showActionButtons).toBeUndefined();
      expect(result.primaryButtonProps).toBeUndefined();
    });

    it('[CANCELLED, *] shows headings only', () => {
      const txInfo = { transactionRole: CUSTOMER, intl: fakeIntl, subscriptionHandlers: buildHandlers() };
      const result = getStateDataForSubscriptionProcess(txInfo, buildProcessInfo(states.CANCELLED));

      expect(result.showDetailCardHeadings).toBe(true);
      expect(result.showActionButtons).toBeUndefined();
    });

    it('[EXPIRED, *] shows headings only', () => {
      const txInfo = { transactionRole: PROVIDER, intl: fakeIntl, subscriptionHandlers: {} };
      const result = getStateDataForSubscriptionProcess(txInfo, buildProcessInfo(states.EXPIRED));

      expect(result.showDetailCardHeadings).toBe(true);
      expect(result.showActionButtons).toBeUndefined();
    });
  });
});
