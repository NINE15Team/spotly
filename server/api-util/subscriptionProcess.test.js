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
    const expectNotification = (notificationName, transition, role, template) => {
      const pattern = new RegExp(
        `:${notificationName},[\\s\\S]*?:on :transition\\/${transition},[\\s\\S]*?:to :actor\\.role\\/${role},[\\s\\S]*?:template :${template}`
      );
      expect(edn).toMatch(pattern);
    };

    it('notifies the customer when checkout payment is confirmed', () => {
      expectNotification(
        'notification/subscription-request-received-customer',
        'confirm-payment',
        'customer',
        'subscription-request-received-customer'
      );
    });

    it('notifies the provider when the customer confirms payment', () => {
      expectNotification(
        'notification/subscription-requested-provider',
        'confirm-payment',
        'provider',
        'subscription-requested-provider'
      );
    });

    it('notifies the customer when the provider accepts', () => {
      expectNotification(
        'notification/subscription-accepted-customer',
        'accept-subscription',
        'customer',
        'subscription-confirmed-customer'
      );
    });

    it('notifies the provider when they accept a subscription', () => {
      expectNotification(
        'notification/subscription-accepted-provider',
        'accept-subscription',
        'provider',
        'subscription-accepted-provider'
      );
    });

    it('notifies the customer when the provider declines', () => {
      expectNotification(
        'notification/subscription-declined-customer',
        'decline-subscription',
        'customer',
        'subscription-declined-customer'
      );
    });

    it('notifies the provider when they decline a subscription', () => {
      expectNotification(
        'notification/subscription-declined-provider',
        'decline-subscription',
        'provider',
        'subscription-declined-provider'
      );
    });

    it('notifies the customer when the acceptance window expires', () => {
      expectNotification(
        'notification/subscription-acceptance-expired-customer',
        'expire-acceptance',
        'customer',
        'subscription-acceptance-expired-customer'
      );
    });

    it('notifies the provider when the acceptance window expires', () => {
      expectNotification(
        'notification/subscription-acceptance-expired-provider',
        'expire-acceptance',
        'provider',
        'subscription-acceptance-expired-provider'
      );
    });

    it('notifies the customer when the operator aborts', () => {
      expectNotification(
        'notification/subscription-aborted-customer',
        'abort-subscription',
        'customer',
        'subscription-aborted-customer'
      );
    });

    it('notifies the provider when the operator aborts', () => {
      expectNotification(
        'notification/subscription-aborted-provider',
        'abort-subscription',
        'provider',
        'subscription-aborted-provider'
      );
    });

    it('notifies the customer when the operator confirms', () => {
      expectNotification(
        'notification/subscription-confirmed-customer',
        'confirm-subscription',
        'customer',
        'subscription-confirmed-customer'
      );
    });

    it('notifies the provider when the operator confirms', () => {
      expectNotification(
        'notification/subscription-confirmed-provider',
        'confirm-subscription',
        'provider',
        'subscription-confirmed-provider'
      );
    });

    it('notifies the customer on monthly renewal', () => {
      expectNotification(
        'notification/subscription-renewed-customer',
        'extend-subscription',
        'customer',
        'subscription-renewed-customer'
      );
    });

    it('notifies the customer when payment is overdue', () => {
      expectNotification(
        'notification/subscription-payment-failed',
        'payment-overdue',
        'customer',
        'subscription-payment-failed'
      );
    });

    it('notifies the provider when customer payment is overdue', () => {
      expectNotification(
        'notification/subscription-payment-failed-provider',
        'payment-overdue',
        'provider',
        'subscription-payment-failed-provider'
      );
    });

    it('notifies the customer when payment retry succeeds', () => {
      expectNotification(
        'notification/subscription-reactivated-customer',
        'reactivate-subscription',
        'customer',
        'subscription-reactivated-customer'
      );
    });

    it('notifies the provider when payment retry succeeds', () => {
      expectNotification(
        'notification/subscription-reactivated-provider',
        'reactivate-subscription',
        'provider',
        'subscription-reactivated-provider'
      );
    });

    it('notifies both parties when cancelling from active', () => {
      expectNotification(
        'notification/subscription-cancelled-customer',
        'cancel-subscription',
        'customer',
        'subscription-cancelled'
      );
      expectNotification(
        'notification/subscription-cancelled-provider',
        'cancel-subscription',
        'provider',
        'subscription-cancelled'
      );
    });

    it('notifies both parties when cancelling from overdue', () => {
      expectNotification(
        'notification/subscription-cancelled-from-overdue-customer',
        'cancel-subscription-from-overdue',
        'customer',
        'subscription-cancelled-from-overdue-customer'
      );
      expectNotification(
        'notification/subscription-cancelled-from-overdue-provider',
        'cancel-subscription-from-overdue',
        'provider',
        'subscription-cancelled-from-overdue-provider'
      );
    });

    it('notifies both parties when subscription expires after payment failures', () => {
      expectNotification(
        'notification/subscription-expired-customer',
        'expire',
        'customer',
        'subscription-expired'
      );
      expectNotification(
        'notification/subscription-expired-provider',
        'expire',
        'provider',
        'subscription-expired'
      );
    });
  });

  describe('email templates on disk', () => {
    const templatesDir = path.join(
      __dirname,
      '..',
      '..',
      'ext',
      'transaction-processes',
      'subscription-rental',
      'templates'
    );

    const templateNames = [
      'subscription-request-received-customer',
      'subscription-requested-provider',
      'subscription-confirmed-customer',
      'subscription-confirmed-provider',
      'subscription-accepted-provider',
      'subscription-declined-customer',
      'subscription-declined-provider',
      'subscription-acceptance-expired-customer',
      'subscription-acceptance-expired-provider',
      'subscription-aborted-customer',
      'subscription-aborted-provider',
      'subscription-renewed-customer',
      'subscription-payment-failed',
      'subscription-payment-failed-provider',
      'subscription-reactivated-customer',
      'subscription-reactivated-provider',
      'subscription-cancelled',
      'subscription-cancelled-from-overdue-customer',
      'subscription-cancelled-from-overdue-provider',
      'subscription-expired',
    ];

    it.each(templateNames)('has html and subject files for %s', templateName => {
      const templateDir = path.join(templatesDir, templateName);
      expect(fs.existsSync(path.join(templateDir, `${templateName}-html.html`))).toBe(true);
      expect(fs.existsSync(path.join(templateDir, `${templateName}-subject.txt`))).toBe(true);
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
