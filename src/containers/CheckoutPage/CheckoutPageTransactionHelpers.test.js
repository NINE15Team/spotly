import { processCheckoutWithPayment } from './CheckoutPageTransactionHelpers';
import {
  getRequestPaymentTransition,
  isPrivilegedRequestPaymentTransition,
  resolveLatestProcessName,
} from '../../transactions/transaction';
import { storeData } from './CheckoutPageSessionHelpers';

jest.mock('../../transactions/transaction', () => ({
  getRequestPaymentTransition: jest.fn(),
  isPrivilegedRequestPaymentTransition: jest.fn(),
  resolveLatestProcessName: jest.fn(),
  NEGOTIATION_PROCESS_NAME: 'negotiation',
}));
jest.mock('./CheckoutPageSessionHelpers', () => ({ storeData: jest.fn() }));

const CLIENT_SECRET = 'pi_123_secret_abc';

const orderWithPaymentIntent = {
  id: { uuid: 'order-1' },
  type: 'transaction',
  attributes: {
    lastTransition: 'transition/request-payment',
    protectedData: {
      stripePaymentIntents: { default: { stripePaymentIntentClientSecret: CLIENT_SECRET } },
    },
  },
};

const buildExtraParams = overrides => {
  const onConfirmCardPayment = jest
    .fn()
    .mockResolvedValue({ transactionId: { uuid: 'order-1' }, paymentIntent: { id: 'pi_123' } });

  return {
    onConfirmCardPayment,
    extraPaymentParams: {
      hasPaymentIntentUserActionsDone: false,
      isPaymentFlowUseSavedCard: false,
      isPaymentFlowPayAndSaveCard: false,
      isSubscriptionCheckout: false,
      onConfirmCardPayment,
      onConfirmPayment: jest.fn().mockResolvedValue(orderWithPaymentIntent),
      onInitiateOrder: jest.fn().mockResolvedValue(orderWithPaymentIntent),
      onSavePaymentMethod: jest.fn().mockResolvedValue({}),
      pageData: {
        transaction: {
          id: { uuid: 'tx-0' },
          type: 'transaction',
          attributes: { lastTransition: 'transition/request-payment' },
        },
        listing: {
          attributes: { publicData: { transactionProcessAlias: 'subscription-rental/release-4' } },
        },
        orderData: {},
      },
      paymentIntent: {},
      process: { transitions: { CONFIRM_PAYMENT: 'transition/confirm-payment' } },
      setPageData: jest.fn(),
      sessionStorageKey: 'key',
      stripeCustomer: {},
      stripePaymentMethodId: 'pm_saved',
      stripe: {},
      card: { id: 'card-element' },
      billingDetails: { name: 'Buyer' },
      ...overrides,
    },
  };
};

describe('processCheckoutWithPayment — Stripe setup_future_usage', () => {
  beforeEach(() => {
    // resetMocks (jest config) clears these before every test.
    getRequestPaymentTransition.mockReturnValue('transition/request-payment');
    isPrivilegedRequestPaymentTransition.mockReturnValue(true);
    resolveLatestProcessName.mockImplementation(name => name);
    storeData.mockImplementation(() => {});
  });

  it('sets setup_future_usage off_session for a new-card subscription checkout', async () => {
    const { onConfirmCardPayment, extraPaymentParams } = buildExtraParams({
      isSubscriptionCheckout: true,
    });

    await processCheckoutWithPayment({}, extraPaymentParams);

    const { paymentParams } = onConfirmCardPayment.mock.calls[0][0];
    expect(paymentParams.setup_future_usage).toBe('off_session');
    expect(paymentParams.payment_method.card).toEqual({ id: 'card-element' });
  });

  it('does not set setup_future_usage for a non-subscription checkout', async () => {
    const { onConfirmCardPayment, extraPaymentParams } = buildExtraParams({
      isSubscriptionCheckout: false,
    });

    await processCheckoutWithPayment({}, extraPaymentParams);

    const { paymentParams } = onConfirmCardPayment.mock.calls[0][0];
    expect(paymentParams.setup_future_usage).toBeUndefined();
  });

  it('does not set setup_future_usage when paying with a saved card', async () => {
    const { onConfirmCardPayment, extraPaymentParams } = buildExtraParams({
      isSubscriptionCheckout: true,
      isPaymentFlowUseSavedCard: true,
    });

    await processCheckoutWithPayment({}, extraPaymentParams);

    const { paymentParams } = onConfirmCardPayment.mock.calls[0][0];
    expect(paymentParams.setup_future_usage).toBeUndefined();
    expect(paymentParams.payment_method).toBe('pm_saved');
  });
});
