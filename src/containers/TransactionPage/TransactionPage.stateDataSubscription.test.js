import { fakeIntl } from '../../util/testData';
import {
  TX_TRANSITION_ACTOR_CUSTOMER as CUSTOMER,
  TX_TRANSITION_ACTOR_PROVIDER as PROVIDER,
  getProcess,
} from '../../transactions/transaction';
import {
  ACTIVE_CANCELLING_STATE_KEY,
  getPendingCancellation,
  getStateDataForSubscriptionProcess,
} from './TransactionPage.stateDataSubscription';

const process = getProcess('subscription-rental');
const states = process.states;
const processName = 'subscription-rental';

const buildProcessInfo = processState => ({ processName, processState, states });

const buildTransaction = metadata => ({
  id: { uuid: 'tx-1' },
  attributes: { processName, lastTransition: 'transition/confirm-subscription', metadata },
});

const buildHandlers = () => ({
  cancelInProgress: false,
  cancelError: null,
  portalInProgress: false,
  portalError: null,
  onCancelSubscription: jest.fn(),
  onOpenBillingPortal: jest.fn(),
});

const buildProviderHandlers = () => ({
  acceptInProgress: false,
  acceptError: null,
  declineInProgress: false,
  declineError: null,
  onAcceptSubscription: jest.fn(),
  onDeclineSubscription: jest.fn(),
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

    it('does not override the title when no cancellation is pending', () => {
      const txInfo = {
        transaction: buildTransaction({}),
        transactionRole: CUSTOMER,
        intl: fakeIntl,
        subscriptionHandlers: buildHandlers(),
      };
      const result = getStateDataForSubscriptionProcess(txInfo, buildProcessInfo(states.ACTIVE));

      expect(result.titleStateKey).toBeUndefined();
      expect(result.titleValues).toBeUndefined();
    });
  });

  describe('[ACTIVE, CUSTOMER] with pending cancellation (metadata.cancelAtPeriodEnd)', () => {
    it('hides the cancel button, keeps the portal, and overrides the title with the end date', () => {
      const txInfo = {
        transaction: buildTransaction({
          cancelAtPeriodEnd: true,
          cancelAt: '2026-11-02T12:00:00.000Z',
        }),
        transactionRole: CUSTOMER,
        intl: fakeIntl,
        subscriptionHandlers: buildHandlers(),
      };
      const result = getStateDataForSubscriptionProcess(txInfo, buildProcessInfo(states.ACTIVE));

      // Process state is unchanged — still active in the graph.
      expect(result.processState).toBe(states.ACTIVE);
      expect(result.titleStateKey).toBe(ACTIVE_CANCELLING_STATE_KEY);
      expect(result.titleValues).toEqual({ cancelAt: '2026-11-02' });

      expect(result.showActionButtons).toBe(true);
      expect(result.primaryButtonProps.buttonText).toBe(
        'TransactionPage.subscription-rental.customer.updatePaymentMethod'
      );
      expect(result.secondaryButtonProps).toBeUndefined();
      expect(result.showWaiverStatusPanel).toBe(true);
    });

    it('falls back to the no-date title when cancelAt is missing or invalid', () => {
      const txInfo = {
        transaction: buildTransaction({ cancelAtPeriodEnd: true, cancelAt: 'not-a-date' }),
        transactionRole: CUSTOMER,
        intl: fakeIntl,
        subscriptionHandlers: buildHandlers(),
      };
      const result = getStateDataForSubscriptionProcess(txInfo, buildProcessInfo(states.ACTIVE));

      expect(result.titleStateKey).toBe(`${ACTIVE_CANCELLING_STATE_KEY}-no-date`);
      expect(result.titleValues).toEqual({ cancelAt: null });
    });

    it('shows no buttons at all when only the portal handler is missing', () => {
      const txInfo = {
        transaction: buildTransaction({ cancelAtPeriodEnd: true }),
        transactionRole: CUSTOMER,
        intl: fakeIntl,
        subscriptionHandlers: { ...buildHandlers(), onOpenBillingPortal: undefined },
      };
      const result = getStateDataForSubscriptionProcess(txInfo, buildProcessInfo(states.ACTIVE));

      expect(result.showActionButtons).toBe(false);
      expect(result.primaryButtonProps).toBeNull();
    });

    it('[ACTIVE, PROVIDER] also gets the end-date title', () => {
      const txInfo = {
        transaction: buildTransaction({
          cancelAtPeriodEnd: true,
          cancelAt: '2026-11-02T12:00:00.000Z',
        }),
        transactionRole: PROVIDER,
        intl: fakeIntl,
        subscriptionHandlers: {},
      };
      const result = getStateDataForSubscriptionProcess(txInfo, buildProcessInfo(states.ACTIVE));

      expect(result.titleStateKey).toBe(ACTIVE_CANCELLING_STATE_KEY);
      expect(result.titleValues).toEqual({ cancelAt: '2026-11-02' });
      expect(result.showActionButtons).toBeUndefined();
    });
  });

  describe('activity feed transition messages', () => {
    const findMsg = (result, transition) =>
      result.transitionMessages.find(m => m.transition === transition);

    it('customer sees "you asked to cancel … ends on <date>" while the request is active', () => {
      const txInfo = {
        transaction: buildTransaction({
          cancelAtPeriodEnd: true,
          cancelAt: '2026-11-02T12:00:00.000Z',
        }),
        transactionRole: CUSTOMER,
        intl: fakeIntl,
        subscriptionHandlers: buildHandlers(),
      };
      const result = getStateDataForSubscriptionProcess(txInfo, buildProcessInfo(states.ACTIVE));

      const msg = findMsg(result, 'transition/request-cancellation');
      expect(msg.translationId).toBe(
        'TransactionPage.ActivityFeed.subscription-rental.request-cancellation.customer'
      );
      expect(msg.values).toEqual({ cancelAt: '2026-11-02' });
      // Overdue variant shares the copy.
      expect(findMsg(result, 'transition/request-cancellation-from-overdue').translationId).toBe(
        msg.translationId
      );
    });

    it('provider gets the provider copy', () => {
      const txInfo = {
        transaction: buildTransaction({
          cancelAtPeriodEnd: true,
          cancelAt: '2026-11-02T12:00:00.000Z',
        }),
        transactionRole: PROVIDER,
        intl: fakeIntl,
        subscriptionHandlers: {},
      };
      const result = getStateDataForSubscriptionProcess(txInfo, buildProcessInfo(states.ACTIVE));

      expect(findMsg(result, 'transition/request-cancellation').translationId).toBe(
        'TransactionPage.ActivityFeed.subscription-rental.request-cancellation.provider'
      );
      expect(findMsg(result, 'transition/resume-subscription').translationId).toBe(
        'TransactionPage.ActivityFeed.subscription-rental.resume-subscription.provider'
      );
    });

    it('drops the date from the request copy once the request is no longer active (resumed)', () => {
      const txInfo = {
        transaction: buildTransaction({ cancelAtPeriodEnd: false, cancelAt: null }),
        transactionRole: CUSTOMER,
        intl: fakeIntl,
        subscriptionHandlers: buildHandlers(),
      };
      const result = getStateDataForSubscriptionProcess(txInfo, buildProcessInfo(states.ACTIVE));

      expect(findMsg(result, 'transition/request-cancellation').translationId).toBe(
        'TransactionPage.ActivityFeed.subscription-rental.request-cancellation-no-date.customer'
      );
    });

    it('is present in final states too, so history still renders after cancellation', () => {
      const txInfo = {
        transaction: buildTransaction({ cancelAtPeriodEnd: true, cancelAt: '2026-11-02T12:00:00.000Z' }),
        transactionRole: CUSTOMER,
        intl: fakeIntl,
        subscriptionHandlers: {},
      };
      const result = getStateDataForSubscriptionProcess(txInfo, buildProcessInfo(states.CANCELLED));

      expect(result.transitionMessages).toHaveLength(4);
    });
  });

  describe('getPendingCancellation', () => {
    it('returns null when the flag is absent or false', () => {
      expect(getPendingCancellation(buildTransaction({}))).toBeNull();
      expect(getPendingCancellation(buildTransaction({ cancelAtPeriodEnd: false }))).toBeNull();
      expect(getPendingCancellation(undefined)).toBeNull();
    });

    it('parses cancelAt into a Date', () => {
      const result = getPendingCancellation(
        buildTransaction({ cancelAtPeriodEnd: true, cancelAt: '2026-11-02T12:00:00.000Z' })
      );
      expect(result.cancelAt).toBeInstanceOf(Date);
      expect(result.cancelAt.toISOString()).toBe('2026-11-02T12:00:00.000Z');
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

  describe('[PAYMENT_CONFIRMED, PROVIDER]', () => {
    it('exposes accept as primary and decline as secondary when handlers are present', () => {
      const txInfo = {
        transactionRole: PROVIDER,
        intl: fakeIntl,
        subscriptionHandlers: buildProviderHandlers(),
      };
      const result = getStateDataForSubscriptionProcess(
        txInfo,
        buildProcessInfo(states.PAYMENT_CONFIRMED)
      );

      expect(result.showActionButtons).toBe(true);
      expect(result.showExtraInfo).toBe(true);
      expect(result.primaryButtonProps.onAction).toEqual(expect.any(Function));
      expect(result.primaryButtonProps.buttonText).toBe(
        'TransactionPage.subscription-rental.provider.acceptSubscription'
      );
      expect(result.secondaryButtonProps.buttonText).toBe(
        'TransactionPage.subscription-rental.provider.declineSubscription'
      );
    });

    it('shows no action buttons when provider handlers are absent', () => {
      const txInfo = { transactionRole: PROVIDER, intl: fakeIntl, subscriptionHandlers: {} };
      const result = getStateDataForSubscriptionProcess(
        txInfo,
        buildProcessInfo(states.PAYMENT_CONFIRMED)
      );

      expect(result.showActionButtons).toBe(false);
      expect(result.primaryButtonProps).toBeNull();
      expect(result.secondaryButtonProps).toBeNull();
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
