const { types } = require('sharetribe-flex-sdk');
const { Money } = types;

const log = require('../log');
const { getStripe, isStripeConfigured } = require('./stripeClient');
const { calculateLineTotal } = require('./lineItemHelpers');
const { getTaxAddressFromListing } = require('./taxAddress');

const LINE_ITEM_SALES_TAX = 'line-item/sales-tax';

// General tangible personal property. Confirm the correct code for Spotly's
// rentals with a tax advisor (see docs/stripe-tax-integration.md §8) and set
// STRIPE_TAX_CODE accordingly.
const DEFAULT_TAX_CODE = 'txcd_99999999';

const getTaxCode = () => process.env.STRIPE_TAX_CODE || DEFAULT_TAX_CODE;

/**
 * Sales tax runs only when explicitly enabled AND the platform Stripe key exists.
 */
const isSalesTaxEnabled = () =>
  process.env.SALES_TAX_ENABLED === 'true' && isStripeConfigured();

/**
 * The taxable base: line items charged to the customer that end up (at least
 * partly) with the provider — i.e. the rental itself and delivery-type fees.
 * Commissions (includeFor customer-only or provider-only) and the tax line
 * itself are excluded.
 *
 * @param {Array} lineItems
 * @returns {Array}
 */
const getTaxableLineItems = lineItems =>
  (lineItems || []).filter(
    lineItem =>
      lineItem.code !== LINE_ITEM_SALES_TAX &&
      !lineItem.reversal &&
      lineItem.includeFor?.includes('customer') &&
      lineItem.includeFor?.includes('provider')
  );

/**
 * Sum taxable line items into an integer subunit amount.
 *
 * @param {Array} lineItems
 * @returns {number} amount in currency subunits (cents)
 */
const getTaxableSubtotal = lineItems =>
  getTaxableLineItems(lineItems).reduce(
    (sum, lineItem) => sum + calculateLineTotal(lineItem).amount,
    0
  );

/**
 * Call Stripe Tax Calculation API for the given line items and listing address.
 *
 * Returns null when tax is disabled, no usable listing address exists, or the
 * taxable subtotal is zero. Stripe returning $0 (e.g. no registration in the
 * listing's state) is logged loudly so it is not mistaken for "tax is working".
 *
 * NOTE: Failure mode is fail-open — a Stripe Tax outage logs an error and the
 * checkout proceeds without a tax line, rather than blocking the payment.
 *
 * @param {Object} params
 * @param {Array} params.lineItems computed transaction line items (pre-tax)
 * @param {Object} params.listing listing entity (facility location for tax)
 * @param {string} params.currency e.g. 'USD'
 * @returns {Promise<{taxAmountCents: number, calculationId: string, taxAddressSource: string}|null>}
 */
const calculateSalesTax = async ({ lineItems, listing, currency }) => {
  if (!isSalesTaxEnabled()) {
    return null;
  }

  const listingId = listing?.id?.uuid || listing?.id;
  const taxAddress = await getTaxAddressFromListing(listing);
  if (!taxAddress) {
    log.warn('Sales tax skipped: no usable listing tax address.', {
      listingId,
    });
    return null;
  }

  const taxableSubtotal = getTaxableSubtotal(lineItems);
  if (!Number.isInteger(taxableSubtotal) || taxableSubtotal <= 0) {
    return null;
  }

  try {
    const stripe = getStripe();
    // Place of supply = facility. address_source shipping matches Stripe Tax's
    // destination-style field; we pass the listing address as that location.
    const calculation = await stripe.tax.calculations.create({
      currency: currency.toLowerCase(),
      customer_details: {
        address: taxAddress.address,
        address_source: 'shipping',
      },
      line_items: [
        {
          amount: taxableSubtotal,
          reference: typeof listingId === 'string' ? listingId : listingId?.uuid || 'order',
          tax_code: getTaxCode(),
        },
      ],
    });

    const taxAmountCents = calculation.tax_amount_exclusive;

    if (taxAmountCents === 0) {
      // Most likely: no active Stripe Tax registration in the listing's state.
      // Stripe returns $0 silently in that case — surface it in the logs.
      log.warn('Stripe Tax returned $0 — check registrations for this state.', {
        listingId,
        state: taxAddress.address.state,
        country: taxAddress.address.country,
        postalCode: taxAddress.address.postal_code,
        calculationId: calculation.id,
        taxAddressSource: taxAddress.source,
      });
    }

    return {
      taxAmountCents,
      calculationId: calculation.id,
      taxAddressSource: taxAddress.source,
      taxAddress: taxAddress.address,
      taxLocationFields: taxAddress.taxLocationFields || null,
    };
  } catch (e) {
    log.error(e, 'stripe-tax-calculation-failed', { listingId });
    return null;
  }
};

/**
 * Sales tax as a Sharetribe line item.
 * includeFor: ['customer'] — the buyer pays it, and it is NOT part of the
 * provider payout, so the collected tax stays in the platform balance for
 * remittance.
 *
 * @param {number} taxAmountCents
 * @param {string} currency
 * @returns {Object}
 */
const buildSalesTaxLineItem = (taxAmountCents, currency) => ({
  code: LINE_ITEM_SALES_TAX,
  unitPrice: new Money(taxAmountCents, currency),
  quantity: 1,
  includeFor: ['customer'],
});

/**
 * Append the sales tax line item to computed line items.
 * A zero/absent tax result appends nothing.
 *
 * @param {Array} lineItems
 * @param {Object|null} taxResult result of calculateSalesTax
 * @param {string} currency
 * @returns {Array}
 */
const appendSalesTaxToLineItems = (lineItems, taxResult, currency) => {
  if (!taxResult || !(taxResult.taxAmountCents > 0)) {
    return lineItems;
  }
  return [...lineItems, buildSalesTaxLineItem(taxResult.taxAmountCents, currency)];
};

/**
 * Extract the Stripe PaymentIntent id from a transaction's protected data.
 * Sharetribe stores it as protectedData.stripePaymentIntents.default.
 *
 * @param {Object} protectedData
 * @returns {string|null}
 */
const getPaymentIntentIdFromTxProtectedData = protectedData => {
  const defaultEntry = protectedData?.stripePaymentIntents?.default;
  if (!defaultEntry) {
    return null;
  }
  if (defaultEntry.stripePaymentIntentId) {
    return defaultEntry.stripePaymentIntentId;
  }
  const clientSecret = defaultEntry.stripePaymentIntentClientSecret;
  if (typeof clientSecret === 'string') {
    return clientSecret.split('_secret_')[0] || null;
  }
  return null;
};

/**
 * Best-effort: write the tax calculation id onto the PaymentIntent metadata so
 * the payment_intent.succeeded webhook can record a filable Stripe Tax
 * transaction. Never throws — a failure here must not fail the checkout.
 *
 * @param {Object} params
 * @param {Object} params.transaction transaction entity returned by initiate/transition
 * @param {string} params.taxCalculationId
 */
const updatePaymentIntentTaxMetadata = async ({ transaction, taxCalculationId }) => {
  if (!isSalesTaxEnabled() || !taxCalculationId) {
    return;
  }
  try {
    const protectedData = transaction?.attributes?.protectedData;
    const paymentIntentId = getPaymentIntentIdFromTxProtectedData(protectedData);
    if (!paymentIntentId) {
      log.warn('Tax metadata skipped: PaymentIntent id not found on transaction.', {
        transactionId: transaction?.id?.uuid,
        taxCalculationId,
      });
      return;
    }
    const stripe = getStripe();
    await stripe.paymentIntents.update(paymentIntentId, {
      metadata: {
        taxCalculationId,
        sharetribeTransactionId: transaction?.id?.uuid || null,
      },
    });
  } catch (e) {
    log.error(e, 'stripe-tax-metadata-update-failed', { taxCalculationId });
  }
};

/**
 * Record a Stripe Tax transaction from the calculation referenced on a
 * succeeded PaymentIntent. Called from the payment_intent.succeeded webhook.
 * The PaymentIntent id is used as the (unique) reference, which makes this
 * idempotent: a duplicate reference error means it was already recorded.
 *
 * @param {Object} paymentIntent Stripe PaymentIntent (webhook event object)
 * @returns {Promise<Object|null>} the created tax transaction or null
 */
const recordTaxTransactionFromPaymentIntent = async paymentIntent => {
  if (!isSalesTaxEnabled()) {
    return null;
  }
  const taxCalculationId = paymentIntent?.metadata?.taxCalculationId;
  if (!taxCalculationId) {
    return null;
  }
  try {
    const stripe = getStripe();
    const taxTransaction = await stripe.tax.transactions.createFromCalculation({
      calculation: taxCalculationId,
      reference: paymentIntent.id,
    });
    log.info('Stripe Tax transaction recorded', {
      paymentIntentId: paymentIntent.id,
      taxCalculationId,
      taxTransactionId: taxTransaction.id,
    });
    return taxTransaction;
  } catch (e) {
    const alreadyExists =
      e?.code === 'tax_transaction_reference_conflict' ||
      /already exists/i.test(e?.message || '');
    if (alreadyExists) {
      log.info('Stripe Tax transaction already recorded for PaymentIntent', {
        paymentIntentId: paymentIntent.id,
      });
      return null;
    }
    log.error(e, 'stripe-tax-transaction-record-failed', {
      paymentIntentId: paymentIntent.id,
      taxCalculationId,
    });
    return null;
  }
};

module.exports = {
  LINE_ITEM_SALES_TAX,
  DEFAULT_TAX_CODE,
  getTaxCode,
  isSalesTaxEnabled,
  getTaxableLineItems,
  getTaxableSubtotal,
  calculateSalesTax,
  buildSalesTaxLineItem,
  appendSalesTaxToLineItems,
  updatePaymentIntentTaxMetadata,
  recordTaxTransactionFromPaymentIntent,
};
