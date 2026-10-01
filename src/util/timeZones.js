import { getDefaultTimeZoneOnBrowser, getTimeZoneNames, isValidTimeZone } from './dates';

/**
 * Time-zone helpers for the listing availability plan.
 *
 * Background (bug "Time-zone selector defaults to Africa"): the availability
 * plan form used to default to the browser's time zone, falling back to
 * `Etc/UTC` when the browser could not report one (privacy modes, the macOS
 * Sonoma Intl bug, "UTC"). `Etc/*` zones are not in the selector's option
 * list, and React (18+) renders a controlled <select> whose value matches no
 * option with the first enabled option selected — alphabetically
 * `Africa/Abidjan` — while the form value silently stays `Etc/UTC`.
 *
 * Resolution order for the default is now: browser time zone (only if it is
 * selectable) → marketplace default (US Eastern).
 */

export const DEFAULT_MARKETPLACE_TIME_ZONE = 'America/New_York';

/**
 * Curated list shown at the top of the selector. Hako operates in the US, so
 * these cover every state; everything else is still available further down.
 * Labels come from translations (`FieldTimeZoneSelect.<key>`).
 */
export const US_TIME_ZONES = [
  { value: 'America/New_York', labelKey: 'FieldTimeZoneSelect.usEastern' },
  { value: 'America/Chicago', labelKey: 'FieldTimeZoneSelect.usCentral' },
  { value: 'America/Denver', labelKey: 'FieldTimeZoneSelect.usMountain' },
  { value: 'America/Phoenix', labelKey: 'FieldTimeZoneSelect.usArizona' },
  { value: 'America/Los_Angeles', labelKey: 'FieldTimeZoneSelect.usPacific' },
  { value: 'America/Anchorage', labelKey: 'FieldTimeZoneSelect.usAlaska' },
  { value: 'Pacific/Honolulu', labelKey: 'FieldTimeZoneSelect.usHawaii' },
];

const US_TIME_ZONE_VALUES = US_TIME_ZONES.map(tz => tz.value);

// IANA database contains irrelevant time zones too (Etc/*, legacy aliases…).
export const RELEVANT_TIME_ZONES_PATTERN = new RegExp(
  '^(Africa|America(?!/(Argentina/ComodRivadavia|Knox_IN|Nuuk))|Antarctica(?!/(DumontDUrville|McMurdo))|Asia(?!/Qostanay)|Atlantic|Australia(?!/(ACT|LHI|NSW))|Europe|Indian|Pacific)'
);

/**
 * Time zones offered in the selector, excluding the curated US ones (which are
 * rendered in their own group).
 *
 * @returns {string[]} IANA time zone names
 */
export const getOtherTimeZoneNames = () =>
  getTimeZoneNames(RELEVANT_TIME_ZONES_PATTERN).filter(tz => !US_TIME_ZONE_VALUES.includes(tz));

let selectableTimeZoneSet = null;
const getSelectableTimeZoneSet = () => {
  if (!selectableTimeZoneSet) {
    selectableTimeZoneSet = new Set([
      ...US_TIME_ZONE_VALUES,
      ...getTimeZoneNames(RELEVANT_TIME_ZONES_PATTERN),
    ]);
  }
  return selectableTimeZoneSet;
};

/**
 * Whether a time zone can be picked in the selector (i.e. it will not leave the
 * <select> with an unmatched value). Membership is checked against the exact
 * option list the selector renders, so a browser whose ICU data is newer than
 * moment-timezone's can never produce an unrendered value.
 *
 * @param {string} timeZone IANA time zone name
 * @returns {boolean}
 */
export const isSelectableTimeZone = timeZone =>
  typeof timeZone === 'string' &&
  getSelectableTimeZoneSet().has(timeZone) &&
  isValidTimeZone(timeZone);

/**
 * Browser time zone, but only when it is something the selector can show.
 *
 * @returns {string|null}
 */
export const getSelectableBrowserTimeZone = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const tz = getDefaultTimeZoneOnBrowser();
    return isSelectableTimeZone(tz) ? tz : null;
  } catch (e) {
    return null;
  }
};

/**
 * Default time zone for a new availability plan.
 *
 * @returns {string} IANA time zone name that is guaranteed to be selectable
 */
export const resolveDefaultTimeZone = () =>
  getSelectableBrowserTimeZone() || DEFAULT_MARKETPLACE_TIME_ZONE;
