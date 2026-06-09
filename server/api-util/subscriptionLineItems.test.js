const { types } = require('sharetribe-flex-sdk');
const { Money } = types;
const { subscriptionTransactionLineItems } = require('./subscriptionLineItems');

describe('subscriptionTransactionLineItems', () => {
  const mockListing = {
    attributes: {
      price: new Money(1200, 'USD'), // $12.00 / month
      publicData: {
        unitType: 'day',
        priceVariationsEnabled: false,
      },
    },
  };

  const orderData = {
    bookingStart: new Date(2026, 5, 8),
    currency: 'USD',
  };

  it('creates a full-month line-item/day with quantity 1', () => {
    const result = subscriptionTransactionLineItems(mockListing, orderData, null, null);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      code: 'line-item/day',
      unitPrice: new Money(1200, 'USD'),
      quantity: 1,
      includeFor: ['customer', 'provider'],
    });
  });

  it('charges the full month regardless of start day', () => {
    const result = subscriptionTransactionLineItems(
      mockListing,
      { bookingStart: new Date(2026, 5, 1), currency: 'USD' },
      null,
      null
    );

    expect(result[0].unitPrice).toEqual(new Money(1200, 'USD'));
    expect(result[0].quantity).toBe(1);
  });

  it('adds provider and customer commission line items when configured', () => {
    const providerCommission = { percentage: 10 };
    const customerCommission = { percentage: 5 };

    const result = subscriptionTransactionLineItems(
      mockListing,
      orderData,
      providerCommission,
      customerCommission
    );

    expect(result).toHaveLength(3);
    expect(result[1].code).toBe('line-item/provider-commission');
    expect(result[1].includeFor).toEqual(['provider']);
    expect(result[2].code).toBe('line-item/customer-commission');
    expect(result[2].includeFor).toEqual(['customer']);
  });

  it('uses the price variant subunits when price variations are enabled', () => {
    const listing = {
      attributes: {
        price: new Money(1200, 'USD'),
        publicData: {
          unitType: 'day',
          priceVariationsEnabled: true,
          priceVariants: [{ name: 'standard', priceInSubunits: 3000 }],
        },
      },
    };

    const result = subscriptionTransactionLineItems(
      listing,
      { ...orderData, priceVariantName: 'standard' },
      null,
      null
    );

    expect(result[0].unitPrice).toEqual(new Money(3000, 'USD'));
  });

  it('falls back to orderData currency when listing price has no currency', () => {
    const listing = {
      attributes: {
        price: { amount: 1200 }, // no currency
        publicData: { unitType: 'day' },
      },
    };

    const result = subscriptionTransactionLineItems(listing, orderData, null, null);
    expect(result[0].unitPrice.currency).toBe('USD');
  });

  it('throws a 400 error when bookingStart is missing', () => {
    expect(() =>
      subscriptionTransactionLineItems(mockListing, { currency: 'USD' }, null, null)
    ).toThrow('Subscription checkout requires bookingStart in orderData.');
  });
});
