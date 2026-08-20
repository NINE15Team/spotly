jest.mock('../log', () => ({ error: jest.fn(), info: jest.fn(), warn: jest.fn() }));

const mockTaxCalculationsCreate = jest.fn();
const mockTaxTransactionsCreateFromCalculation = jest.fn();
const mockPaymentIntentsUpdate = jest.fn();
const mockUpdateListingPublicDataLocation = jest.fn();
const mockReverseGeocodeListingLocation = jest.fn();

jest.mock('./stripeClient', () => ({
  isStripeConfigured: jest.fn(),
  getStripe: jest.fn(),
}));

jest.mock('./integrationSdk', () => ({
  isIntegrationSdkConfigured: jest.fn(() => true),
  updateListingPublicDataLocation: (...args) => mockUpdateListingPublicDataLocation(...args),
  normalizeUuid: id => (typeof id === 'string' ? id : id?.uuid || null),
}));

jest.mock('./listingTaxLocation', () => {
  const actual = jest.requireActual('./listingTaxLocation');
  return {
    ...actual,
    reverseGeocodeListingLocation: (...args) => mockReverseGeocodeListingLocation(...args),
  };
});

const { types } = require('sharetribe-flex-sdk');
const { Money } = types;

const { isStripeConfigured, getStripe } = require('./stripeClient');
const { isIntegrationSdkConfigured } = require('./integrationSdk');

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
const {
  getTaxAddressFromListing,
  getTaxAddressFromOrderData,
  normalizeAddress,
  isUsableTaxAddress,
} = require('./taxAddress');
const {
  taxLocationFromMapboxFeature,
  taxLocationFromGoogleGeocodeResult,
  pickUsableTaxLocationFields,
} = require('./listingTaxLocation');

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

const listingWithTaxLocation = {
  id: { uuid: 'listing-1' },
  attributes: {
    geolocation: { lat: 42.73, lng: -84.55 },
    publicData: {
      location: {
        address: '1 Main St, Lansing, MI 48933',
        building: '',
        country: 'US',
        postalCode: '48933',
        state: 'MI',
        city: 'Lansing',
        line1: '1 Main St',
      },
    },
  },
};

const listingWithoutTaxFields = {
  id: { uuid: 'listing-2' },
  attributes: {
    geolocation: { lat: 42.73, lng: -84.55 },
    publicData: {
      location: {
        address: '1 Main St, Lansing, MI',
        building: '',
      },
    },
  },
};

describe('listingTaxLocation mapping', () => {
  it('maps a Mapbox address feature to tax fields', () => {
    const feature = {
      place_type: ['address'],
      address: '1',
      text: 'Main St',
      context: [
        { id: 'postcode.1', text: '48933' },
        { id: 'place.1', text: 'Lansing' },
        { id: 'region.1', short_code: 'US-MI', text: 'Michigan' },
        { id: 'country.1', short_code: 'us', text: 'United States' },
      ],
    };
    expect(taxLocationFromMapboxFeature(feature)).toEqual({
      country: 'US',
      postalCode: '48933',
      state: 'MI',
      city: 'Lansing',
      line1: '1 Main St',
    });
  });

  it('maps Google geocode address_components', () => {
    const result = {
      address_components: [
        { long_name: '1', short_name: '1', types: ['street_number'] },
        { long_name: 'Main St', short_name: 'Main St', types: ['route'] },
        { long_name: 'Lansing', short_name: 'Lansing', types: ['locality'] },
        { long_name: 'Michigan', short_name: 'MI', types: ['administrative_area_level_1'] },
        { long_name: '48933', short_name: '48933', types: ['postal_code'] },
        { long_name: 'United States', short_name: 'US', types: ['country'] },
      ],
    };
    expect(taxLocationFromGoogleGeocodeResult(result)).toEqual({
      country: 'US',
      postalCode: '48933',
      state: 'MI',
      city: 'Lansing',
      line1: '1 Main St',
    });
  });

  it('returns null without country and postal code', () => {
    expect(pickUsableTaxLocationFields({ city: 'Lansing', state: 'MI' })).toBeNull();
  });
});

describe('taxAddress', () => {
  beforeEach(() => {
    isIntegrationSdkConfigured.mockReturnValue(true);
    mockReverseGeocodeListingLocation.mockReset();
    mockUpdateListingPublicDataLocation.mockReset();
    mockUpdateListingPublicDataLocation.mockResolvedValue({});
  });

  it('normalizes address keys and uppercases country', () => {
    const address = normalizeAddress({ addressLine1: '1 Main St', postal: '48933', country: 'us' });
    expect(address).toEqual({ line1: '1 Main St', postal_code: '48933', country: 'US' });
  });

  it('requires country and postal code', () => {
    expect(isUsableTaxAddress({ country: 'US' })).toBe(false);
    expect(isUsableTaxAddress({ country: 'US', postal_code: '48933' })).toBe(true);
  });

  it('resolves tax address from listing publicData.location', async () => {
    const result = await getTaxAddressFromListing(listingWithTaxLocation);
    expect(result.source).toBe('listing_address');
    expect(result.address).toEqual({
      line1: '1 Main St',
      city: 'Lansing',
      state: 'MI',
      postal_code: '48933',
      country: 'US',
    });
    expect(mockReverseGeocodeListingLocation).not.toHaveBeenCalled();
  });

  it('reverse-geocodes and writes back when tax fields are missing', async () => {
    mockReverseGeocodeListingLocation.mockResolvedValue({
      country: 'US',
      postalCode: '48933',
      state: 'MI',
      city: 'Lansing',
      line1: '1 Main St',
    });

    const result = await getTaxAddressFromListing(listingWithoutTaxFields);

    expect(result.source).toBe('listing_geocode');
    expect(result.address.postal_code).toBe('48933');
    expect(mockUpdateListingPublicDataLocation).toHaveBeenCalledWith(
      'listing-2',
      expect.objectContaining({
        address: '1 Main St, Lansing, MI',
        country: 'US',
        postalCode: '48933',
      })
    );
  });

  it('returns null when listing has no usable address or geocode', async () => {
    mockReverseGeocodeListingLocation.mockResolvedValue(null);
    expect(await getTaxAddressFromListing({})).toBeNull();
    expect(
      await getTaxAddressFromListing({
        attributes: { publicData: { location: { address: 'Somewhere' } } },
      })
    ).toBeNull();
  });

  it('keeps getTaxAddressFromOrderData for compat but tax calc ignores it', () => {
    const result = getTaxAddressFromOrderData({
      protectedData: {
        taxAddress: {
          line1: '1 Main St',
          city: 'Lansing',
          state: 'MI',
          postalCode: '48933',
          country: 'US',
        },
      },
    });
    expect(result.source).toBe('customer_address');
  });
});

describe('tax', () => {
  beforeEach(() => {
    process.env.SALES_TAX_ENABLED = 'true';
    isStripeConfigured.mockReturnValue(true);
    getStripe.mockReturnValue(stripeMock);
    mockTaxCalculationsCreate.mockResolvedValue({
      id: 'taxcalc_1',
      tax_amount_exclusive: 600,
    });
    mockReverseGeocodeListingLocation.mockReset();
    mockUpdateListingPublicDataLocation.mockReset();
    mockUpdateListingPublicDataLocation.mockResolvedValue({});
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

  it('calculates tax via Stripe with the listing address', async () => {
    const result = await calculateSalesTax({
      lineItems,
      listing: listingWithTaxLocation,
      currency: 'USD',
    });

    expect(mockTaxCalculationsCreate).toHaveBeenCalledWith({
      currency: 'usd',
      customer_details: {
        address: expect.objectContaining({ state: 'MI', postal_code: '48933', country: 'US' }),
        address_source: 'shipping',
      },
      line_items: [{ amount: 10000, reference: 'listing-1', tax_code: 'txcd_99999999' }],
    });
    expect(result.taxAmountCents).toBe(600);
    expect(result.calculationId).toBe('taxcalc_1');
    expect(result.taxAddressSource).toBe('listing_address');
  });

  it('ignores customer taxAddress on orderData and uses listing instead', async () => {
    await calculateSalesTax({
      lineItems,
      listing: listingWithTaxLocation,
      currency: 'USD',
    });
    expect(mockTaxCalculationsCreate.mock.calls[0][0].customer_details.address.state).toBe('MI');
  });

  it('returns null when disabled or listing address is missing', async () => {
    process.env.SALES_TAX_ENABLED = 'false';
    expect(
      await calculateSalesTax({ lineItems, listing: listingWithTaxLocation, currency: 'USD' })
    ).toBeNull();

    process.env.SALES_TAX_ENABLED = 'true';
    mockReverseGeocodeListingLocation.mockResolvedValue(null);
    expect(await calculateSalesTax({ lineItems, listing: {}, currency: 'USD' })).toBeNull();
    expect(mockTaxCalculationsCreate).not.toHaveBeenCalled();
  });

  it('fails open when the Stripe call throws', async () => {
    mockTaxCalculationsCreate.mockRejectedValue(new Error('stripe down'));
    const result = await calculateSalesTax({
      lineItems,
      listing: listingWithTaxLocation,
      currency: 'USD',
    });
    expect(result).toBeNull();
  });

  it('appends a customer-only tax line item, including $0 tax', () => {
    const taxLine = buildSalesTaxLineItem(600, 'USD');
    expect(taxLine.code).toBe(LINE_ITEM_SALES_TAX);
    expect(taxLine.includeFor).toEqual(['customer']);
    expect(taxLine.unitPrice.amount).toBe(600);

    const withTax = appendSalesTaxToLineItems(lineItems, { taxAmountCents: 600 }, 'USD');
    expect(withTax).toHaveLength(4);
    expect(withTax[3].code).toBe(LINE_ITEM_SALES_TAX);

    const withZeroTax = appendSalesTaxToLineItems(lineItems, { taxAmountCents: 0 }, 'USD');
    expect(withZeroTax).toHaveLength(4);
    expect(withZeroTax[3].code).toBe(LINE_ITEM_SALES_TAX);
    expect(withZeroTax[3].unitPrice.amount).toBe(0);

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
