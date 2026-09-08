/**
 * Turns a listing's publicData into display rows using the hosted listing-fields
 * config (Sharetribe Console).
 *
 * The Hako listing sections used to render hardcoded placeholder content — a fixed
 * amenity list ("EV Charging", "Covered Stall", …) and fixed metric limits
 * ("2.11 m", "4,000 kg") — for every listing, because they looked up keys that do
 * not exist in the real data. Everything here comes from the listing itself, so a
 * field added or removed in Console is reflected automatically, and units come
 * from the Console label (e.g. "Maximum vehicle length (feet)").
 */

// Category selections are rendered separately as breadcrumbs.
const isCategoryKey = key => /^categoryLevel\d+$/.test(key);

const labelForField = fieldConfig =>
  fieldConfig?.showConfig?.label || fieldConfig?.label || fieldConfig?.key || '';

const labelForOption = (fieldConfig, option) => {
  const match = fieldConfig?.enumOptions?.find(o => `${o.option}` === `${option}`);
  // Stored options often use underscores (e.g. "On-site_staff").
  return match?.label || `${option}`.replace(/_/g, ' ');
};

/**
 * Public listing fields that have a value on this listing.
 *
 * @param {Object} publicData listing publicData
 * @param {Array} listingFields hosted listing-fields config (config.listing.listingFields)
 * @returns {Array<{key,schemaType,label,values,value}>}
 */
export const getListingDetailEntries = (publicData = {}, listingFields = []) => {
  return (listingFields || [])
    .filter(f => f && (f.scope == null || f.scope === 'public') && !isCategoryKey(f.key))
    .map(fieldConfig => {
      const { key, schemaType } = fieldConfig;
      const raw = publicData?.[key];

      const isEmpty =
        raw == null ||
        raw === '' ||
        (Array.isArray(raw) && raw.length === 0);
      if (isEmpty) {
        return null;
      }

      const label = labelForField(fieldConfig);

      if (schemaType === 'multi-enum') {
        const values = (Array.isArray(raw) ? raw : [raw]).map(o => labelForOption(fieldConfig, o));
        return { key, schemaType, label, values, value: values.join(', ') };
      }
      if (schemaType === 'enum') {
        const value = labelForOption(fieldConfig, raw);
        return { key, schemaType, label, values: [value], value };
      }
      if (schemaType === 'boolean') {
        // Only surface a boolean when it is true — "no" is not something offered.
        return raw === true || raw === 'true'
          ? { key, schemaType, label, values: [label], value: label }
          : null;
      }
      // long / shortText and anything else: show the raw value.
      return { key, schemaType, label, values: [`${raw}`], value: `${raw}` };
    })
    .filter(Boolean);
};

/** Things the spot offers: multi-select and single-select attributes. */
export const getAmenityEntries = (publicData, listingFields) =>
  getListingDetailEntries(publicData, listingFields).filter(e =>
    ['multi-enum', 'enum', 'boolean'].includes(e.schemaType)
  );

/** Measurements and limits: numeric and free-text values. */
export const getMeasurementEntries = (publicData, listingFields) =>
  getListingDetailEntries(publicData, listingFields).filter(e =>
    ['long', 'shortText', 'text'].includes(e.schemaType)
  );
