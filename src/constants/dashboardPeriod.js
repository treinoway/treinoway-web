/**
 * Period presets for the trainer student-dashboard.
 *
 * Backend default is 90d (when no params sent), but the refined design specifies a
 * 30d default at the UI layer with one-tap presets for 90d, 6m and 1y. We always
 * send explicit dateFrom/dateTo to remove ambiguity.
 */
export const DASHBOARD_PERIOD_PRESETS = {
  LAST_30_DAYS: 'last-30-days',
  LAST_90_DAYS: 'last-90-days',
  LAST_6_MONTHS: 'last-6-months',
  LAST_1_YEAR: 'last-1-year',
  CUSTOM: 'custom',
};

export const DEFAULT_DASHBOARD_PERIOD_KEY = DASHBOARD_PERIOD_PRESETS.LAST_30_DAYS;

const PRESET_DAY_OFFSETS = {
  [DASHBOARD_PERIOD_PRESETS.LAST_30_DAYS]: 30,
  [DASHBOARD_PERIOD_PRESETS.LAST_90_DAYS]: 90,
  [DASHBOARD_PERIOD_PRESETS.LAST_6_MONTHS]: 180,
  [DASHBOARD_PERIOD_PRESETS.LAST_1_YEAR]: 365,
};

const PRESET_LABELS = {
  [DASHBOARD_PERIOD_PRESETS.LAST_30_DAYS]: 'Últimos 30 dias',
  [DASHBOARD_PERIOD_PRESETS.LAST_90_DAYS]: 'Últimos 90 dias',
  [DASHBOARD_PERIOD_PRESETS.LAST_6_MONTHS]: 'Últimos 6 meses',
  [DASHBOARD_PERIOD_PRESETS.LAST_1_YEAR]: 'Último 1 ano',
  [DASHBOARD_PERIOD_PRESETS.CUSTOM]: 'Personalizar',
};

export const DASHBOARD_PERIOD_PRESET_LIST = [
  DASHBOARD_PERIOD_PRESETS.LAST_30_DAYS,
  DASHBOARD_PERIOD_PRESETS.LAST_90_DAYS,
  DASHBOARD_PERIOD_PRESETS.LAST_6_MONTHS,
  DASHBOARD_PERIOD_PRESETS.LAST_1_YEAR,
  DASHBOARD_PERIOD_PRESETS.CUSTOM,
];

export const DASHBOARD_MAX_WINDOW_DAYS = 365;

/**
 * Returns a label for a preset key.
 */
export const getPeriodPresetLabel = (presetKey) => PRESET_LABELS[presetKey] ?? PRESET_LABELS[DEFAULT_DASHBOARD_PERIOD_KEY];

/**
 * Computes ISO from/to range for a preset key. The window ends "now" and starts
 * (offsetDays) ago for fixed presets. For "custom" the caller must supply explicit dates.
 *
 * @param {string} presetKey
 * @param {Date} [now] — injected for tests.
 * @returns {{ from: string, to: string }}
 */
export const computePresetWindow = (presetKey, now = new Date()) => {
  const offsetDays = PRESET_DAY_OFFSETS[presetKey] ?? PRESET_DAY_OFFSETS[DEFAULT_DASHBOARD_PERIOD_KEY];
  const to = new Date(now.getTime());
  const from = new Date(now.getTime());
  from.setDate(from.getDate() - offsetDays);
  return { from: from.toISOString(), to: to.toISOString() };
};

/**
 * Builds a normalized period descriptor used by the dashboard hooks. Presets compute
 * window from "now"; custom requires explicit dates (YYYY-MM-DD strings or ISO timestamps).
 */
export const buildPeriod = ({ presetKey, customFrom, customTo, now }) => {
  if (presetKey === DASHBOARD_PERIOD_PRESETS.CUSTOM) {
    return { presetKey, from: customFrom ?? null, to: customTo ?? null };
  }
  const window = computePresetWindow(presetKey, now);
  return { presetKey, from: window.from, to: window.to };
};

/**
 * Returns the cache/dedup key for a period descriptor.
 */
export const getPeriodCacheKey = (period) => `${period.presetKey}|${period.from ?? ''}|${period.to ?? ''}`;

/**
 * Computes the previous period of equal length, used to fetch deltas.
 * Returns null if the input window is incomplete or invalid.
 */
export const computePreviousPeriod = (period) => {
  if (!period?.from || !period?.to) return null;
  const fromDate = new Date(period.from);
  const toDate = new Date(period.to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return null;
  const durationMs = toDate.getTime() - fromDate.getTime();
  if (durationMs <= 0) return null;
  const prevTo = new Date(fromDate.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - durationMs);
  return { from: prevFrom.toISOString(), to: prevTo.toISOString() };
};
