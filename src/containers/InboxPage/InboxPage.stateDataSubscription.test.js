import {
  TX_TRANSITION_ACTOR_CUSTOMER as CUSTOMER,
  TX_TRANSITION_ACTOR_PROVIDER as PROVIDER,
  getProcess,
} from '../../transactions/transaction';
import { getStateDataForSubscriptionProcess } from './InboxPage.stateDataSubscription';

const process = getProcess('subscription-rental');
const states = process.states;
const processName = 'subscription-rental';

const resolve = (processState, transactionRole = CUSTOMER) =>
  getStateDataForSubscriptionProcess(
    { transactionRole },
    { processName, processState, states }
  );

describe('getStateDataForSubscriptionProcess (InboxPage)', () => {
  describe('actionNeeded for the customer', () => {
    it.each([
      ['PENDING_PAYMENT', states.PENDING_PAYMENT],
      ['PAYMENT_OVERDUE', states.PAYMENT_OVERDUE],
      ['PAYMENT_CONFIRMED', states.PAYMENT_CONFIRMED],
    ])('%s → actionNeeded', (_label, processState) => {
      const result = resolve(processState, CUSTOMER);
      expect(result.actionNeeded).toBe(true);
      expect(result.isFinal).toBeUndefined();
    });
  });

  describe('isFinal for terminal states', () => {
    it.each([
      ['PAYMENT_EXPIRED', states.PAYMENT_EXPIRED],
      ['CANCELLED', states.CANCELLED],
      ['EXPIRED', states.EXPIRED],
    ])('%s → isFinal', (_label, processState) => {
      const result = resolve(processState, PROVIDER);
      expect(result.isFinal).toBe(true);
      expect(result.actionNeeded).toBeUndefined();
    });
  });

  it('ACTIVE is neither actionNeeded nor final', () => {
    const result = resolve(states.ACTIVE, CUSTOMER);
    expect(result.actionNeeded).toBeUndefined();
    expect(result.isFinal).toBeUndefined();
    expect(result.processState).toBe(states.ACTIVE);
  });

  it('always returns the process name and state', () => {
    const result = resolve(states.PENDING_PAYMENT, CUSTOMER);
    expect(result.processName).toBe(processName);
    expect(result.processState).toBe(states.PENDING_PAYMENT);
  });
});
