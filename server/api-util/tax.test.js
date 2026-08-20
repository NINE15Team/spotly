jest.mock('../log', () => ({ error: jest.fn(), info: jest.fn(), warn: jest.fn() }));

const mockTaxCalculationsCreate = jest.fn();
const mockTaxTransactionsCreateFromCalculation = jest.fn();
const mockPaymentIntentsUpdate = jest.fn();

jest.mock('./stripeClient', () => ({
  isStripeConfigured: jest.fn(),
  getStripe: jest.fn(),
}));

const { types } = require('sharetribe-flex-sdk');
const { Money } = types;

const { isStripeConfigured, getStripe } = require('./stripeClient');

const stripeMock = {
  tax: {
    calculations: { create: mockTaxCalculationsCreate },
    transactions: { createFromCalculation: mockTaxTransactionsCreateFromCalculation },
  },
  paymentIntents: { update: mockPaymentIntentsUpdate },
};
const {
  LINE_ITEM_SALES_TAX,
  isSalesTaxEnabled,
  getTaxableLineItems,
  getTaxableSubtotal,
  calculateSalesTax,
  buildSalesTaxLineItem,
  appendSalesTaxToLineItems,
  recordTaxTransactionFromPaymentIntent,
} = require('./tax');
const { getTaxAddressFromOrderData, normalizeAddress, isUsableTaxAddress } = require('./taxAddress');

const lineItems = [
  {
    code: 'line-item/day',
    unitPrice: new Money(10000, 'USD'),
    quantity: 1,
    includeFor: ['customer', 'provider'],
  },
  {
    code: 'line-item/provider-commission',
    unitPrice: new Money(10000, 'USD'),
    percentage: -10,
    includeFor: ['provider'],
  },
  {
    code: 'line-item/customer-commission',
    unitPrice: new Money(10000, 'USD'),
    percentage: 5,
    includeFor: ['customer'],
  },
];

const orderDataWithAddress = {
  protectedData: {
    taxAddress: { line1: '1 Main St', city: 'Lansing', state: 'MI', postalCode: '48933', country: 'US' },
  },
};

describe('taxAddress', () => {
  it('normalizes checkout billing address keys', () => {
    const address = normalizeAddress({ addressLine1: '1 Main St', postal: '48933', country: 'US' });
    expect(address).toEqual({ line1: '1 Main St', postal_code: '48933', country: 'US' });
  });

  it('requires country and postal code', () => {
    expect(isUsableTaxAddress({ country: 'US' })).toBe(false);
    expect(isUsableTaxAddress({ country: 'US', postal_code: '48933' })).toBe(true);
  });

  it('resolves the tax address from protectedData.taxAddress', () => {
    const result = getTaxAddressFromOrderData(orderDataWithAddress);
    expect(result).toEqual({
      address: { line1: '1 Main St', city: 'Lansing', state: 'MI', postal_code: '48933', country: 'US' },
      source: 'customer_address',
    });
  });

  it('falls back to shippingDetails.address', () => {
    const result = getTaxAddressFromOrderData({
      protectedData: {
        shippingDetails: { address: { postalCode: '90001', country: 'US', state: 'CA' } },
      },
    });
    expect(result.address).toEqual({ state: 'CA', postal_code: '90001', country: 'US' });
  });

  it('returns null when no usable address exists', () => {
    expect(getTaxAddressFromOrderData({})).toBeNull();
    expect(getTaxAddressFromOrderData({ protectedData: { taxAddress: { city: 'Lansing' } } })).toBeNull();
  });
});

describe('tax', () => {
  beforeEach(() => {
    // resetMocks (jest config) clears implementations before every test.
    process.env.SALES_TAX_ENABLED = 'true';
    isStripeConfigured.mockReturnValue(true);
    getStripe.mockReturnValue(stripeMock);
    mockTaxCalculationsCreate.mockResolvedValue({
      id: 'taxcalc_1',
      tax_amount_exclusive: 600,
    });
  });

  afterEach(() => {
    delete process.env.SALES_TAX_ENABLED;
    delete process.env.STRIPE_TAX_CODE;
  });

  it('is disabled unless SALES_TAX_ENABLED=true and Stripe is configured', () => {
    expect(isSalesTaxEnabled()).toBe(true);
    process.env.SALES_TAX_ENABLED = 'false';
    expect(isSalesTaxEnabled()).toBe(false);
    process.env.SALES_TAX_ENABLED = 'true';
    isStripeConfigured.mockReturnValue(false);
    expect(isSalesTaxEnabled()).toBe(false);
  });

  it('taxes only items included for both customer and provider', () => {
    const taxable = getTaxableLineItems(lineItems);
    expect(taxable).toHaveLength(1);
    expect(taxable[0].code).toBe('line-item/day');
    expect(getTaxableSubtotal(lineItems)).toBe(10000);
  });

  it('calculates tax via Stripe with the customer address', async () => {
    const result = await calculateSalesTax({
      lineItems,
      orderData: orderDataWithAddress,
      currency: 'USD',
      listingId: 'listing-1',
    });

    expect(mockTaxCalculationsCreate).toHaveBeenCalledWith({
      currency: 'usd',
      customer_details: {
        address: expect.objectContaining({ state: 'MI', postal_code: '48933', country: 'US' }),
        address_source: 'shipping',
      },
      line_items: [
        { amount: 10000, reference: 'listing-1', tax_code: 'txcd_99999999' },
      ],
    });
    expect(result).toEqual({
      taxAmountCents: 600,
      calculationId: 'taxcalc_1',
      taxAddressSource: 'customer_address',
    });
  });

  it('returns null when disabled or the address is missing', async () => {
    process.env.SALES_TAX_ENABLED = 'false';
    expect(await calculateSalesTax({ lineItems, orderData: orderDataWithAddress, currency: 'USD' })).toBeNull();

    process.env.SALES_TAX_ENABLED = 'true';
    expect(await calculateSalesTax({ lineItems, orderData: {}, currency: 'USD' })).toBeNull();
    expect(mockTaxCalculationsCreate).not.toHaveBeenCalled();
  });

  it('fails open when the Stripe call throws', async () => {
    mockTaxCalculationsCreate.mockRejectedValue(new Error('stripe down'));
    const result = await calculateSalesTax({
      lineItems,
      orderData: orderDataWithAddress,
      currency: 'USD',
    });
    expect(result).toBeNull();
  });

  it('appends a customer-only tax line item, omitting $0 tax', () => {
    const taxLine = buildSalesTaxLineItem(600, 'USD');
    expect(taxLine.code).toBe(LINE_ITEM_SALES_TAX);
    expect(taxLine.includeFor).toEqual(['customer']);
    expect(taxLine.unitPrice.amount).toBe(600);

    const withTax = appendSalesTaxToLineItems(lineItems, { taxAmountCents: 600 }, 'USD');
    expect(withTax).toHaveLength(4);
    expect(withTax[3].code).toBe(LINE_ITEM_SALES_TAX);

    expect(appendSalesTaxToLineItems(lineItems, { taxAmountCents: 0 }, 'USD')).toHaveLength(3);
    expect(appendSalesTaxToLineItems(lineItems, null, 'USD')).toHaveLength(3);
  });

  it('records a Stripe Tax transaction from PaymentIntent metadata', async () => {
    mockTaxTransactionsCreateFromCalculation.mockResolvedValue({ id: 'taxtxn_1' });
    const paymentIntent = { id: 'pi_1', metadata: { taxCalculationId: 'taxcalc_1' } };

    const result = await recordTaxTransactionFromPaymentIntent(paymentIntent);

    expect(mockTaxTransactionsCreateFromCalculation).toHaveBeenCalledWith({
      calculation: 'taxcalc_1',
      reference: 'pi_1',
    });
    expect(result).toEqual({ id: 'taxtxn_1' });
  });

  it('ignores PaymentIntents without a tax calculation id', async () => {
    const result = await recordTaxTransactionFromPaymentIntent({ id: 'pi_2', metadata: {} });
    expect(result).toBeNull();
    expect(mockTaxTransactionsCreateFromCalculation).not.toHaveBeenCalled();
  });
});
