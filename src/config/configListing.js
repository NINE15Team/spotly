/////////////////////////////////////////////////////////
// Configurations related to listing.                  //
// Main configuration here is the extended data config //
/////////////////////////////////////////////////////////

// Note: The listingFields come from listingFields asset nowadays by default.
//       To use this built-in configuration, you need to change the overwrite from configHelper.js
//       (E.g. use mergeDefaultTypesAndFieldsForDebugging func)

/**
 * Configuration options for listing fields (custom extended data fields):
 * - key:                           Unique key for the extended data field.
 * - scope (optional):              Scope of the extended data can be 'public', 'private', or 'metadata'.
 *                                  Default value: 'public'.
 *                                  Note: listing doesn't support 'protected' scope atm.
 * - schemaType (optional):         Schema for this extended data field.
 *                                  This is relevant when rendering components and querying listings.
 *                                  Possible values: 'enum', 'multi-enum', 'text', 'long', 'boolean'.
 * - enumOptions (optional):        Options shown for 'enum' and 'multi-enum' extended data.
 *                                  These are used to render options for inputs and filters on
 *                                  EditListingPage, ListingPage, and SearchPage.
 * - listingTypeConfig (optional):  Relationship configuration against listing types.
 *   - limitToListingTypeIds:         Indicator whether this listing field is relevant to a limited set of listing types.
 *   - listingTypeIds:                An array of listing types, for which this custom listing field is
 *                                    relevant and should be added. This is mandatory if limitToListingTypeIds is true.
 * - categoryConfig (optional):     Relationship configuration against categories.
 *   - limitToCategoryIds:            Indicator whether this listing field is relevant to a limited set of categories.
 *   - categoryIds:                   An array of categories, for which this custom listing field is
 *                                    relevant and should be added. This is mandatory if limitToCategoryIds is true.
 * - filterConfig:                  Filter configuration for listings query.
 *    - indexForSearch (optional):    If set as true, it is assumed that the extended data key has
 *                                    search index in place. I.e. the key can be used to filter
 *                                    listing queries (then scope needs to be 'public').
 *                                    Note: Sharetribe CLI can be used to set search index for the key:
 *                                    https://www.sharetribe.com/docs/references/extended-data/#search-schema
 *                                    Read more about filtering listings with public data keys from API Reference:
 *                                    https://www.sharetribe.com/api-reference/marketplace.html#extended-data-filtering
 *                                    Default value: false,
 *   - filterType:                    Sometimes a single schemaType can be rendered with different filter components.
 *                                    For 'enum' schema, filterType can be 'SelectSingleFilter' or 'SelectMultipleFilter'
 *   - label:                         Label for the filter, if the field can be used as query filter
 *   - searchMode (optional):         Search mode for indexed data with multi-enum schema.
 *                                    Possible values: 'has_all' or 'has_any'.
 *   - group:                         SearchPageWithMap has grouped filters. Possible values: 'primary' or 'secondary'.
 * - showConfig:                    Configuration for rendering listing. (How the field should be shown.)
 *   - label:                         Label for the saved data.
 *   - isDetail                       Can be used to hide detail row (of type enum, boolean, or long) from listing page.
 *                                    Default value: true,
 * - saveConfig:                    Configuration for adding and modifying extended data fields.
 *   - label:                         Label for the input field.
 *   - placeholderMessage (optional): Default message for user input.
 *   - isRequired (optional):         Is the field required for providers to fill
 *   - requiredMessage (optional):    Message for those fields, which are mandatory.
 */
// Hako parking/storage fields. These are collected on the Details step and shown on the listing
// page. They intentionally omit filterConfig: turning one into a search filter also requires a
// search schema for the key in the Marketplace API (Sharetribe CLI) plus showFilter: true.
export const listingFields = [
  // --- Multi-participant waiver signing ---------------------------------------
  // Maximum number of participants (including the primary renter) that can be
  // added at checkout. The buyer chooses how many, up to this maximum. Applies
  // to both booking and subscription listings. Defaults to 1 (buyer only) when
  // unset. If you manage listing fields in Console (hosted config), create the
  // same field there: key `waiverMaxParticipants`, scope public, type long.
  {
    key: 'waiverMaxParticipants',
    scope: 'public',
    schemaType: 'long',
    numberConfig: { minimum: 1, maximum: 50 },
    showConfig: { label: 'Maximum waiver participants', isDetail: false },
    saveConfig: {
      label: 'Maximum number of participants (including you)',
      placeholderMessage: 'e.g. 4',
      isRequired: false,
    },
  },
  // ---------------------------------------------------------------------------
  {
    key: 'accessHours',
    scope: 'public',
    schemaType: 'enum',
    enumOptions: [
      { option: '24-7', label: '24/7' },
      { option: 'business-hours', label: 'Business hours' },
      { option: 'restricted', label: 'Restricted' },
    ],
    showConfig: {
      label: 'Access hours',
      isDetail: true,
    },
    saveConfig: {
      label: 'Access hours',
      placeholderMessage: '24/7',
      isRequired: false,
    },
    helpText:
      'If restricted, operators should specify hours in the description or during the availability step.',
  },
  {
    key: 'securityFeatures',
    scope: 'public',
    schemaType: 'multi-enum',
    enumOptions: [
      { option: 'cctv', label: 'CCTV' },
      { option: 'gated', label: 'Gated' },
      { option: 'fenced', label: 'Fenced' },
      { option: 'on-site-staff', label: 'On-site staff' },
    ],
    showConfig: {
      label: 'Security features',
    },
    saveConfig: {
      label: 'Security features',
      isRequired: false,
    },
    twoColumns: true,
  },
  {
    key: 'vehicleSizes',
    scope: 'public',
    schemaType: 'multi-enum',
    enumOptions: [
      { option: 'cars', label: 'Cars' },
      { option: 'trucks', label: 'Trucks' },
      { option: 'suv', label: 'SUV' },
      { option: 'trailer', label: 'Trailer' },
      { option: 'boats', label: 'Boats' },
      { option: 'camper-vans', label: 'Camper vans' },
      { option: 'motorcycles', label: 'Motorcycles' },
      { option: 'bus', label: 'Bus' },
    ],
    showConfig: {
      label: 'Vehicle size',
    },
    saveConfig: {
      label: 'Vehicle Size',
      isRequired: false,
    },
    twoColumns: true,
  },
  {
    key: 'minVehicleHeight',
    scope: 'public',
    schemaType: 'long',
    numberConfig: {
      minimum: 0,
      maximum: 50,
    },
    showConfig: {
      label: 'Minimum vehicle height',
      isDetail: true,
    },
    saveConfig: {
      label: 'Minimum vehicle height',
      placeholderMessage: '6',
      isRequired: false,
    },
    helpText: 'Unit: feet',
  },
  {
    key: 'vehicleHeight',
    scope: 'public',
    schemaType: 'long',
    numberConfig: {
      minimum: 0,
      maximum: 50,
    },
    showConfig: {
      label: 'Maximum vehicle height',
      isDetail: true,
    },
    saveConfig: {
      label: 'Maximum vehicle height',
      placeholderMessage: '6',
      isRequired: false,
    },
    helpText: 'Unit: feet',
  },
  {
    key: 'vehicleLength',
    scope: 'public',
    schemaType: 'long',
    numberConfig: {
      minimum: 0,
      maximum: 100,
    },
    showConfig: {
      label: 'Maximum vehicle length',
      isDetail: true,
    },
    saveConfig: {
      label: 'Maximum vehicle length',
      placeholderMessage: '12',
      isRequired: false,
    },
    helpText: 'Unit: feet',
  },
  {
    key: 'surfaceType',
    scope: 'public',
    schemaType: 'enum',
    enumOptions: [
      { option: 'paved', label: 'Paved' },
      { option: 'gravel', label: 'Gravel' },
      { option: 'dirt', label: 'Dirt' },
      { option: 'concrete', label: 'Concrete' },
    ],
    showConfig: {
      label: 'Surface type',
      isDetail: true,
    },
    saveConfig: {
      label: 'Surface type',
      placeholderMessage: 'Paved',
      isRequired: false,
    },
  },
  {
    key: 'vehicleWeight',
    scope: 'public',
    schemaType: 'long',
    numberConfig: {
      minimum: 0,
      maximum: 100000,
    },
    showConfig: {
      label: 'Weight limit',
      isDetail: true,
    },
    saveConfig: {
      label: 'Weight limit',
      placeholderMessage: '4000',
      isRequired: false,
    },
    helpText: 'Unit: lbs',
  },
  {
    key: 'hoaRestrictions',
    scope: 'public',
    schemaType: 'enum',
    enumOptions: [
      { option: 'none', label: 'No restrictions' },
      { option: 'guest-only', label: 'Guest parking only' },
      { option: 'permit-required', label: 'Permit required' },
      { option: 'other', label: 'Other (see description)' },
    ],
    showConfig: {
      label: 'HOA restrictions',
      isDetail: true,
    },
    saveConfig: {
      label: 'HOA restrictions',
      placeholderMessage: 'No restrictions',
      isRequired: false,
    },
  },
];

///////////////////////////////////////////////////////////////////////
// Configurations related to listing types and transaction processes //
///////////////////////////////////////////////////////////////////////

// A presets of supported listing configurations
//
// Note 1: The listingTypes come from listingTypes asset nowadays by default.
//         To use this built-in configuration, you need to change the overwrite from configHelper.js
//         (E.g. use mergeDefaultTypesAndFieldsForDebugging func)
// Note 2: transaction type is part of listing type. It defines what transaction process and units
//         are used when transaction is created against a specific listing.

/**
 * Configuration options for listing experience:
 * - listingType:         Unique string. This will be saved to listing's public data on
 *                        EditListingWizard.
 * - label                Label for the listing type. Used as microcopy for options to select
 *                        listing type in EditListingWizard.
 * - transactionType      Set of configurations how this listing type will behave when transaction is
 *                        created.
 *   - process              Transaction process.
 *                          The process must match one of the processes that this client app can handle
 *                          (check src/util/transactions/transaction.js) and the process must also exists in correct
 *                          marketplace environment.
 *   - alias                Valid alias for the aforementioned process. This will be saved to listing's
 *                          public data as transctionProcessAlias and transaction is initiated with this.
 *   - unitType             Unit type is mainly used as pricing unit. This will be saved to
 *                          transaction's protected data.
 *                          Recommendation: don't use same unit types in completely different processes
 *                          ('item' sold should not be priced the same as 'item' booked).
 * - stockType            This is relevant only to listings using default-purchase process.
 *                        If set to 'oneItem', stock management is not showed and the listing is
 *                        considered unique (stock = 1).
 *                        Possible values: 'oneItem', 'multipleItems', 'infiniteOneItem', and 'infiniteMultipleItems'.
 *                        Default: 'multipleItems'.
 * - availabilityType     This is relevant only to listings using default-booking process.
 *                        If set to 'oneSeat', seat management is not showed and the listing is
 *                        considered per person (seat = 1).
 *                        Possible values: 'oneSeat' and 'multipleSeats'.
 *                        Default: 'oneSeat'.
 * - priceVariations      This is relevant only to listings using default-booking process.
 *   - enabled:             If set to true, price variations are enabled.
 *                          Default: false.
 * - defaultListingFields These are tied to transaction processes. Different processes have different flags.
 *                        E.g. default-inquiry can toggle price and location to true/false value to indicate,
 *                        whether price (or location) tab should be shown. If defaultListingFields.price is not
 *                        explicitly set to _false_, price will be shown.
 *                        If the location or pickup is not used, listing won't be returned with location search.
 *                        Use keyword search as main search type if location is not enforced.
 *                        The payoutDetails flag allows provider to bypass setting of payout details.
 *                        Note: customers can't order listings, if provider has not set payout details! Monitor
 *                        providers who have not set payout details and contact them to ensure that they add the details.
 * - transactionFields    You can define an array of custom transaction fields for each listing type. Each transaction field
 *                        should have the following attributes:
 *                        - key (string)
 *                        - label (string)
 *                        - showTo (string, options: 'customer', 'provider'). Option 'provider' is only used for negotiation process.
 *                        - schemaType (string, options: 'enum', 'multi-enum', 'text', 'long', 'boolean', 'youtubeVideoUrl')
 *                        - saveConfig (object, optional,  { required: true })
 *                        - schema specific attributes:
 *                          - numberConfig (object, for schemaType: 'long'): { minimum: number, maximum: number }
 *                          - enumOptions (array, for schemaType: 'enum', 'multi-enum'): [{ label: string, option: string }]
 */

// Hako offers exactly two listing types:
//   - 'hourly-rental'        hourly day parking. Defined in the hosted listing-types asset
//                            (Sharetribe Console), so it is NOT repeated here.
//   - 'monthly-subscription' monthly storage. Defined here because the subscription-rental
//                            transaction process is not selectable in Console.
// Anything else coming from Console is filtered out by SELECTABLE_LISTING_TYPES
// (see src/util/hakoListingTypes.js), which is the single place to change if a
// third type is ever introduced.
export const listingTypes = [
  {
    listingType: 'monthly-subscription',
    label: 'Monthly storage',
    transactionType: {
      process: 'subscription-rental',
      alias: 'subscription-rental/release-5',
      unitType: 'day',
    },
    availabilityType: 'oneSeat',
    defaultListingFields: {
      location: true,
      payoutDetails: true,
    },
  },

  // // Here are some examples of listingTypes
  // // TODO: SearchPage does not work well if both booking and product selling are used at the same time
  // {
  //   listingType: 'daily-booking',
  //   label: 'Daily booking',
  //   transactionType: {
  //     process: 'default-booking',
  //     alias: 'default-booking/release-1',
  //     unitType: 'day',
  //   },
  //   availabilityType: 'oneSeat',
  //   defaultListingFields: {
  //     location: true,
  //     payoutDetails: true,
  //   },
  //   transactionFields: [
  //     {
  //       showTo: 'customer',
  //       label: 'Extra requests for the hosts',
  //       key: 'requests',
  //       schemaType: 'text',
  //     },
  //     {
  //       showTo: 'customer',
  //       label: 'Are you traveling with minors?',
  //       key: 'minors',
  //       schemaType: 'boolean',
  //     },
  //     {
  //       showTo: 'customer',
  //       numberConfig: {
  //         minimum: 1,
  //         maximum: 10,
  //       },
  //       label: 'How many people are staying at the venue',
  //       key: 'peopleStaying',
  //       schemaType: 'long',
  //       saveConfig: {
  //         required: true,
  //       },
  //     },
  //     {
  //       showTo: 'customer',
  //       enumOptions: [
  //         {
  //           label: 'Morning cleanup (10am-12am)',
  //           option: 'morning',
  //         },
  //         {
  //           label: 'Afternoon cleanup (2pm-4pm)',
  //           option: 'afternoon',
  //         },
  //       ],
  //       label: 'Schedule preference',
  //       key: 'schedulePreference',
  //       schemaType: 'enum',
  //     },
  //     {
  //       showTo: 'customer',
  //       enumOptions: [
  //         {
  //           label: 'Vegetarian',
  //           option: 'vegetarian',
  //         },
  //         {
  //           label: 'Vegan',
  //           option: 'vegan',
  //         },
  //         {
  //           label: 'Gluten free',
  //           option: 'glutenFree',
  //         },
  //         {
  //           label: 'No caffeine',
  //           option: 'decaf',
  //         },
  //         {
  //           label: 'Nut free',
  //           option: 'nutFree',
  //         },
  //         {
  //           label: 'Dairy free',
  //           option: 'dairyFree',
  //         },
  //       ],
  //       label: 'Dietary preferences',
  //       key: 'dietaryPreferences',
  //       schemaType: 'multi-enum',
  //     },
  //   ],
  // },
  // {
  //   listingType: 'nightly-booking',
  //   label: 'Nightly booking',
  //   transactionType: {
  //     process: 'default-booking',
  //     alias: 'default-booking/release-1',
  //     unitType: 'night',
  //   },
  // },
  // {
  //   listingType: 'hourly-booking',
  //   label: 'Hourly booking',
  //   transactionType: {
  //     process: 'default-booking',
  //     alias: 'default-booking/release-1',
  //     unitType: 'hour',
  //   },
  // },
  // {
  //   listingType: 'product-selling',
  //   label: 'Sell bicycles',
  //   transactionType: {
  //     process: 'default-purchase',
  //     alias: 'default-purchase/release-1',
  //     unitType: 'item',
  //   },
  //   stockType: 'multipleItems',
  //   defaultListingFields: {
  //     shipping: true,
  //     pickup: true,
  //     payoutDetails: true,
  //   },
  // },
  // {
  //   listingType: 'inquiry',
  //   label: 'Inquiry',
  //   transactionType: {
  //     process: 'default-inquiry',
  //     alias: 'default-inquiry/release-1',
  //     unitType: 'inquiry',
  //   },
  //   defaultListingFields: {
  //     price: false,
  //     location: true,
  //   },
  // },
];

// SearchPage can enforce listing query to only those listings with valid listingType
// However, it only works if you have set 'enum' type search schema for the public data fields
//   - listingType
//
//  Similar setup could be expanded to 2 other extended data fields:
//   - transactionProcessAlias
//   - unitType
//
// Read More:
// https://www.sharetribe.com/docs/how-to/manage-search-schemas-with-flex-cli/#adding-listing-search-schemas
export const enforceValidListingType = false;
