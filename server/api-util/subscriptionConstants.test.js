const {
  TRANSITIONS,
  STATES,
  TRANSITION_TO_STATE,
  getSubscriptionState,
  isSubscriptionInState,
  isSubscriptionFinal,
} = require('./subscriptionConstants');

const fs = require('fs');
const path = require('path');

const tx = lastTransition => ({ attributes: { lastTransition } });

describe('subscriptionConstants state resolution', () => {
  it('maps every transition in process.edn to a state (and nothing else)', () => {
    const edn = fs.readFileSync(
      path.join(__dirname, '../../ext/transaction-processes/subscription-rental/process.edn'),
      'utf8'
    );
    const names = [...edn.matchAll(/\{:name :(transition\/[\w-]+),/g)].map(m => m[1]);
    expect(names.length).toBeGreaterThan(10);
    expect(Object.keys(TRANSITION_TO_STATE).sort()).toEqual([...new Set(names)].sort());
    expect(Object.values(TRANSITIONS).sort()).toEqual([...new Set(names)].sort());
  });

  it('treats waiver self-loops as staying in the same state', () => {
    expect(getSubscriptionState(tx(TRANSITIONS.UPDATE_WAIVER_STATUS))).toBe(
      STATES.PAYMENT_CONFIRMED
    );
    expect(getSubscriptionState(tx(TRANSITIONS.UPDATE_WAIVER_STATUS_FROM_ACTIVE))).toBe(
      STATES.ACTIVE
    );
    expect(
      isSubscriptionInState(tx(TRANSITIONS.UPDATE_WAIVER_STATUS_FROM_ACTIVE), STATES.ACTIVE)
    ).toBe(true);
  });

  it('treats cancellation-intent self-loops as staying in the same state', () => {
    expect(getSubscriptionState(tx(TRANSITIONS.REQUEST_CANCELLATION))).toBe(STATES.ACTIVE);
    expect(getSubscriptionState(tx(TRANSITIONS.RESUME_SUBSCRIPTION))).toBe(STATES.ACTIVE);
    expect(getSubscriptionState(tx(TRANSITIONS.REQUEST_CANCELLATION_FROM_OVERDUE))).toBe(
      STATES.PAYMENT_OVERDUE
    );
    expect(getSubscriptionState(tx(TRANSITIONS.RESUME_SUBSCRIPTION_FROM_OVERDUE))).toBe(
      STATES.PAYMENT_OVERDUE
    );
    expect(isSubscriptionFinal(tx(TRANSITIONS.REQUEST_CANCELLATION))).toBe(false);
  });

  it('returns null for unknown or missing transitions', () => {
    expect(getSubscriptionState(tx('transition/nope'))).toBeNull();
    expect(getSubscriptionState(null)).toBeNull();
    expect(isSubscriptionInState(tx(undefined), STATES.ACTIVE)).toBe(false);
  });

  it('flags final states', () => {
    [
      TRANSITIONS.CANCEL_SUBSCRIPTION,
      TRANSITIONS.CANCEL_SUBSCRIPTION_FROM_OVERDUE,
      TRANSITIONS.DECLINE_SUBSCRIPTION,
      TRANSITIONS.ABORT_SUBSCRIPTION,
      TRANSITIONS.EXPIRE,
      TRANSITIONS.EXPIRE_ACCEPTANCE,
      TRANSITIONS.EXPIRE_PAYMENT,
    ].forEach(t => expect(isSubscriptionFinal(tx(t))).toBe(true));
    [
      TRANSITIONS.REQUEST_PAYMENT,
      TRANSITIONS.CONFIRM_PAYMENT,
      TRANSITIONS.ACCEPT_SUBSCRIPTION,
      TRANSITIONS.PAYMENT_OVERDUE,
      TRANSITIONS.UPDATE_WAIVER_STATUS_FROM_ACTIVE,
    ].forEach(t => expect(isSubscriptionFinal(tx(t))).toBe(false));
  });
});
