import React from 'react';
import { useIntl } from '../../../../../util/reactIntl';
import { US_TIME_ZONES, getOtherTimeZoneNames } from '../../../../../util/timeZones';
import { FieldSelect } from '../../../../../components';

/**
 * Field to allow selecting an IANA time zone name.
 *
 * US time zones are listed first with friendly labels ("Eastern Time (New
 * York)"); the rest of the relevant IANA zones follow in their own group.
 *
 * Note: label is optional, but if it is given, an id is also required so
 * the label can reference the input in the `for` attribute
 *
 * @component
 * @param {Object} props
 * @param {string?} props.className
 * @param {string?} props.rootClassName
 * @param {string?} props.id
 * @param {string?} props.label
 * @param {string} props.name
 * @returns {JSX.Element} containing FieldSelect
 */
const FieldTimeZoneSelect = props => {
  const intl = useIntl();

  return (
    <FieldSelect {...props}>
      <option disabled value="">
        {intl.formatMessage({ id: 'FieldTimeZoneSelect.placeholder' })}
      </option>
      <optgroup label={intl.formatMessage({ id: 'FieldTimeZoneSelect.groupUnitedStates' })}>
        {US_TIME_ZONES.map(({ value, labelKey }) => (
          <option key={value} value={value}>
            {intl.formatMessage({ id: labelKey })}
          </option>
        ))}
      </optgroup>
      <optgroup label={intl.formatMessage({ id: 'FieldTimeZoneSelect.groupOther' })}>
        {getOtherTimeZoneNames().map(tz => (
          <option key={tz} value={tz}>
            {tz}
          </option>
        ))}
      </optgroup>
    </FieldSelect>
  );
};

export default FieldTimeZoneSelect;
