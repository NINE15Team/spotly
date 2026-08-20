/**
 * Validated configuration for PandaDoc waiver auto-reminders and document
 * expiration. All values come from environment variables with safe defaults.
 *
 * Reminders are delegated to PandaDoc's per-document auto-reminders
 * (PATCH /public/v1/documents/{id}/auto-reminders), so there is no custom
 * reminder job. Delivery is email only. The reminder window is capped by a
 * document expiration (PATCH /public/v2/documents/{id}/settings -> expires_in),
 * because auto-reminders themselves have no "stop after N" option.
 *
 * Parsing is strict: an invalid override throws with a clear message rather than
 * silently degrading. Callers in the checkout path treat setup as best-effort and
 * catch these errors so a misconfiguration never blocks signing.
 */

const DAY_MIN = 1;
const DAY_MAX = 180;

const parseBoolEnv = (raw, fallback, name) => {
  if (raw == null || String(raw).trim() === '') {
    return fallback;
  }
  const value = String(raw).trim().toLowerCase();
  if (['true', '1', 'yes'].includes(value)) {
    return true;
  }
  if (['false', '0', 'no'].includes(value)) {
    return false;
  }
  throw new Error(`${name} must be a boolean (true/false), got "${raw}"`);
};

const parseIntEnv = (raw, fallback, name, { min = DAY_MIN, max = DAY_MAX } = {}) => {
  if (raw == null || String(raw).trim() === '') {
    return fallback;
  }
  const value = Number(String(raw).trim());
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}, got "${raw}"`);
  }
  return value;
};

const parseWaiverReminderConfig = (env = process.env) => {
  const enabled = parseBoolEnv(env.WAIVER_REMINDER_ENABLED, true, 'WAIVER_REMINDER_ENABLED');
  const initialDelayDays = parseIntEnv(
    env.WAIVER_REMINDER_INITIAL_DELAY_DAYS,
    1,
    'WAIVER_REMINDER_INITIAL_DELAY_DAYS'
  );
  const recurring = parseBoolEnv(env.WAIVER_REMINDER_RECURRING, true, 'WAIVER_REMINDER_RECURRING');
  const frequencyDays = parseIntEnv(
    env.WAIVER_REMINDER_FREQUENCY_DAYS,
    2,
    'WAIVER_REMINDER_FREQUENCY_DAYS'
  );
  const expirationDays = parseIntEnv(env.WAIVER_EXPIRATION_DAYS, 7, 'WAIVER_EXPIRATION_DAYS');

  if (expirationDays <= initialDelayDays) {
    throw new Error(
      `WAIVER_EXPIRATION_DAYS (${expirationDays}) must be greater than ` +
        `WAIVER_REMINDER_INITIAL_DELAY_DAYS (${initialDelayDays})`
    );
  }

  return {
    enabled,
    deliveryMethod: 'email',
    initialDelayDays,
    recurring,
    frequencyDays,
    expirationDays,
  };
};

const getWaiverReminderConfig = () => parseWaiverReminderConfig(process.env);

module.exports = { parseWaiverReminderConfig, getWaiverReminderConfig };
