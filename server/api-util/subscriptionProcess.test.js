const fs = require('fs');
const path = require('path');

const { TRANSITIONS, STATES } = require('./subscriptionConstants');

const PROCESS_PATH = path.join(
  __dirname,
  '..',
  '..',
  'ext',
  'transaction-processes',
  'subscription-rental',
  'process.edn'
);

describe('subscription-rental process.edn', () => {
  const edn = fs.readFileSync(PROCESS_PATH, 'utf8');

  describe('merchant-approval transitions', () => {
    it('declares transition/accept-subscription as a provider transition into state/active', () => {
      expect(edn).toMatch(
        /:transition\/accept-subscription,[\s\S]*?:actor :actor\.role\/provider,[\s\S]*?:to :state\/active/
      );
    });

    it('captures the first PaymentIntent on accept', () => {
      expect(edn).toMatch(
        /:transition\/accept-subscription,[\s\S]*?:action\/stripe-capture-payment-intent[\s\S]*?:to :state\/active/
      );
    });

    it('declares transition/decline-subscription as a provider transition into state/cancelled with a refund', () => {
      expect(edn).toMatch(
        /:transition\/decline-subscription,[\s\S]*?:actor :actor\.role\/provider,[\s\S]*?:action\/stripe-refund-payment[\s\S]*?:to :state\/cancelled/
      );
    });

    it('declares transition/expire-acceptance with a 6-day window into state/expired', () => {
      expect(edn).toMatch(
        /:transition\/expire-acceptance,[\s\S]*?:time\/first-entered-state :state\/payment-confirmed[\s\S]*?P6D[\s\S]*?:to :state\/expired/
      );
    });
  });

  describe('notifications', () => {
    it('notifies the provider when the customer confirms payment', () => {
      expect(edn).toMatch(
        /:notification\/subscription-requested-provider,[\s\S]*?:on :transition\/confirm-payment,[\s\S]*?:to :actor\.role\/provider/
      );
    });

    it('notifies the customer when the provider accepts', () => {
      expect(edn).toMatch(
        /:notification\/subscription-accepted-customer,[\s\S]*?:on :transition\/accept-subscription,[\s\S]*?:to :actor\.role\/customer/
      );
    });

    it('notifies the customer when the provider declines', () => {
      expect(edn).toMatch(
        /:notification\/subscription-declined-customer,[\s\S]*?:on :transition\/decline-subscription,[\s\S]*?:to :actor\.role\/customer/
      );
    });

    it('notifies the customer when the acceptance window expires', () => {
      expect(edn).toMatch(
        /:notification\/subscription-acceptance-expired-customer,[\s\S]*?:on :transition\/expire-acceptance,[\s\S]*?:to :actor\.role\/customer/
      );
    });
  });

  describe('constants stay in sync with the process definition', () => {
    // Each transition string in subscriptionConstants must exist in the EDN as a keyword.
    it.each(Object.entries(TRANSITIONS))('declares %s (%s)', (_key, transitionName) => {
      expect(edn).toContain(`:${transitionName}`);
    });

    it.each(Object.entries(STATES))('declares %s (%s)', (_key, stateName) => {
      expect(edn).toContain(`:${stateName}`);
    });
  });
});
