/**
 * Hako Search Results sidebar filters matching Figma (Search Results filters).
 * These are injected into the search page even if hosted listing-fields omit them.
 */
export const HAKO_SIDEBAR_FILTERS = [
  {
    key: 'spaceType',
    scope: 'public',
    schemaType: 'multi-enum',
    enumOptions: [
      { option: 'outdoor-lot', label: 'Outdoor lot' },
      { option: 'covered-parkade', label: 'Covered parkade' },
      { option: 'private-driveway', label: 'Private driveway' },
      { option: 'underground', label: 'Underground' },
    ],
    filterConfig: {
      indexForSearch: true,
      showFilter: true,
      label: 'Space Type',
      group: 'primary',
      searchMode: 'has_any',
    },
  },
  {
    key: 'amenities',
    scope: 'public',
    schemaType: 'multi-enum',
    enumOptions: [
      { option: 'ev-charging', label: 'EV charging' },
      { option: 'security-camera', label: 'Security camera' },
      { option: 'gated-locked', label: 'Gated / locked' },
      { option: 'accessible', label: 'Accessible' },
    ],
    filterConfig: {
      indexForSearch: true,
      showFilter: true,
      label: 'Amenities',
      group: 'primary',
      searchMode: 'has_any',
    },
  },
  {
    key: 'vehicleSize',
    scope: 'public',
    schemaType: 'multi-enum',
    enumOptions: [
      { option: 'sedan-compact', label: 'Sedan / compact' },
      { option: 'suv-truck', label: 'SUV / truck' },
      { option: 'airport-shuttle', label: 'Airport Shuttle' },
      { option: 'oversized', label: 'Oversized' },
    ],
    filterConfig: {
      indexForSearch: true,
      showFilter: true,
      label: 'Vehicle Size',
      group: 'primary',
      searchMode: 'has_any',
    },
  },
  {
    key: 'vehicleHeightMin',
    scope: 'public',
    schemaType: 'multi-enum',
    enumOptions: [
      { option: '10-ft', label: '10 ft+' },
      { option: '12-ft', label: '12 ft+' },
      { option: '15-ft', label: '15 ft+' },
      { option: '18-ft', label: '18 ft+' },
      { option: '20-ft', label: '20 ft+' },
    ],
    filterConfig: {
      indexForSearch: true,
      showFilter: true,
      label: 'Vehicle Height',
      group: 'primary',
      searchMode: 'has_any',
    },
  },
  {
    key: 'vehicleLengthMin',
    scope: 'public',
    schemaType: 'multi-enum',
    enumOptions: [
      { option: '6-ft', label: '6 ft+' },
      { option: '7-ft', label: '7 ft+' },
      { option: '8-ft', label: '8 ft+' },
      { option: '9-ft', label: '9 ft+' },
      { option: '10-ft', label: '10 ft+' },
    ],
    filterConfig: {
      indexForSearch: true,
      showFilter: true,
      label: 'Vehicle Length',
      group: 'primary',
      searchMode: 'has_any',
    },
  },
];

export const HAKO_HIDDEN_SIDEBAR_FILTER_KEYS = ['listingType', 'dates', 'keywords'];
export const HAKO_HIDDEN_SIDEBAR_SCHEMA_TYPES = ['listingType', 'dates', 'keywords'];

export const isHakoHiddenSidebarFilter = filterConfig => {
  if (!filterConfig) {
    return false;
  }
  return (
    HAKO_HIDDEN_SIDEBAR_FILTER_KEYS.includes(filterConfig.key) ||
    HAKO_HIDDEN_SIDEBAR_SCHEMA_TYPES.includes(filterConfig.schemaType)
  );
};
