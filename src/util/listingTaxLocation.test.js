import {
  taxLocationFromMapboxFeature,
  taxLocationFromGoogleAddressComponents,
  mergeLocationWithTaxFields,
  pickUsableTaxLocationFields,
} from './listingTaxLocation';

describe('listingTaxLocation (client)', () => {
  it('maps Mapbox features to tax fields', () => {
    const feature = {
      place_type: ['address'],
      address: '200',
      text: 'Market St',
      context: [
        { id: 'postcode.1', text: '94105' },
        { id: 'place.1', text: 'San Francisco' },
        { id: 'region.1', short_code: 'US-CA', text: 'California' },
        { id: 'country.1', short_code: 'us', text: 'United States' },
      ],
    };
    expect(taxLocationFromMapboxFeature(feature)).toEqual({
      country: 'US',
      postalCode: '94105',
      state: 'CA',
      city: 'San Francisco',
      line1: '200 Market St',
    });
  });

  it('maps Google addressComponents (new Places API shape)', () => {
    const components = [
      { longText: '200', shortText: '200', types: ['street_number'] },
      { longText: 'Market St', shortText: 'Market St', types: ['route'] },
      { longText: 'San Francisco', shortText: 'SF', types: ['locality'] },
      { longText: 'California', shortText: 'CA', types: ['administrative_area_level_1'] },
      { longText: '94105', shortText: '94105', types: ['postal_code'] },
      { longText: 'United States', shortText: 'us', types: ['country'] },
    ];
    expect(taxLocationFromGoogleAddressComponents(components)).toEqual({
      country: 'US',
      postalCode: '94105',
      state: 'CA',
      city: 'San Francisco',
      line1: '200 Market St',
    });
  });

  it('overwrites previous tax fields when merging location', () => {
    const merged = mergeLocationWithTaxFields(
      {
        address: 'New address',
        building: 'B',
        country: 'US',
        postalCode: '00000',
        state: 'NY',
      },
      { country: 'US', postalCode: '94105', state: 'CA', city: 'San Francisco' }
    );
    expect(merged).toEqual({
      address: 'New address',
      building: 'B',
      country: 'US',
      postalCode: '94105',
      state: 'CA',
      city: 'San Francisco',
    });
  });

  it('strips tax fields when the new place has no usable tax location', () => {
    const merged = mergeLocationWithTaxFields(
      {
        address: 'Somewhere',
        building: '',
        country: 'US',
        postalCode: '48933',
      },
      null
    );
    expect(merged).toEqual({ address: 'Somewhere', building: '' });
    expect(pickUsableTaxLocationFields(merged)).toBeNull();
  });
});
