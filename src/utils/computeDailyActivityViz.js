/**
 * Maps the daily-activity API payload to the data structures consumed by
 * PulseWaveform and PulseHeatmap.
 *
 * API shape (per item) — canonical:
 *   { date, status, volumeKg, sessionId, trainingId, trainingName,
 *     completedSets, totalSets }
 *
 * Backward-compatibility:
 *   - `totalVolumeKg` is accepted as a fallback when `volumeKg` is absent
 *     (older backend versions emitted this field name).
 *   - `status: 'done'` is coerced to `'completed'` for legacy clients.
 *
 * Waveform output (one slot per calendar day of the period):
 *   days: [{ date, session: null | { status, volumeKg, hasLoad, pct, sessionCount,
 *            trainingName, completedSets, totalSets } }]
 *   maxVolumeKg: number
 *
 * Heatmap output (weeks × days grid):
 *   weeks: [{ label, days: [{ date, status, volumeKg, isToday, isFirstRow }] }]
 *   maxVolumeKg: number
 */

const DAYS_IN_WEEK = 7;
// ISO day of week: 0=Sun…6=Sat. We render Mon–Sun so Sunday is index 6.
const DOW_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

/**
 * Resolves volume from a daily-activity entry, accepting both the canonical
 * `volumeKg` field and the legacy `totalVolumeKg` alias.
 *
 * @param {object} day
 * @returns {number|null}
 */
const resolveVolume = (day) => day.volumeKg ?? day.totalVolumeKg ?? null;

/**
 * Coerces legacy status values to the canonical set.
 * 'done' → 'completed'; all others pass through unchanged.
 *
 * @param {string|undefined} status
 * @returns {string}
 */
const resolveStatus = (status) => (status === 'done' ? 'completed' : (status ?? 'empty'));

/**
 * Returns the YYYY-MM-DD key of a date in local time.
 * @param {Date} [date]
 * @returns {string}
 */
const formatDateKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
// Smallest bar for a loaded session, so tiny volumes stay visible next to the max.
const MIN_BAR_PCT = 4;

/**
 * Converts a period boundary (YYYY-MM-DD or ISO timestamp) to a local day key.
 * @param {string|null|undefined} value
 * @returns {string|null}
 */
const toLocalDateKey = (value) => {
  if (!value) return null;
  if (DATE_KEY.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : formatDateKey(date);
};

/** Period range in day keys; falls back to the data's own first/last day. */
const resolveRange = (rows, period) => {
  const from = toLocalDateKey(period?.from) ?? rows[0].date;
  const to = toLocalDateKey(period?.to) ?? rows[rows.length - 1].date;
  return from <= to ? { from, to } : null;
};

/** Every calendar day key from `from` to `to`, inclusive. */
const listDateKeys = ({ from, to }) => {
  const [year, month, day] = from.split('-').map(Number);
  const cursor = new Date(year, month - 1, day, 12);
  const keys = [];
  for (let key = from; key <= to; key = formatDateKey(cursor)) {
    keys.push(key);
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
};

const hasLoad = (volumeKg) => Number.isFinite(volumeKg) && volumeKg > 0;

const toSession = (row, maxVolumeKg) => {
  const volumeKg = resolveVolume(row);
  const loaded = hasLoad(volumeKg);
  return {
    status: resolveStatus(row.status),
    volumeKg: loaded ? volumeKg : null,
    hasLoad: loaded,
    pct: loaded ? Math.max(MIN_BAR_PCT, Math.round((volumeKg / maxVolumeKg) * 100)) : 0,
    sessionCount: row.sessionCount ?? 1,
    trainingName: row.trainingName ?? null,
    completedSets: row.completedSets ?? 0,
    totalSets: row.totalSets ?? 0,
  };
};

/**
 * Builds the day-timeline for the volume chart: one slot per calendar day of
 * the selected period, `session` null on rest days. The API already aggregates
 * every session of a day into one row (summed volume + `sessionCount`), so a
 * multi-session day is one bar.
 *
 * @param {object[]} dailyActivity - Array from API, sorted ascending by date.
 * @param {{ from?: string, to?: string }} [period] - Selected period.
 * @returns {{ days: { date: string, session: object|null }[], maxVolumeKg: number }}
 */
export const computeVolumeTimeline = (dailyActivity, period) => {
  const rows = Array.isArray(dailyActivity)
    ? dailyActivity.filter((row) => row?.date && resolveStatus(row.status) !== 'empty')
    : [];
  const range = rows.length > 0 ? resolveRange(rows, period) : null;
  if (!range) return { days: [], maxVolumeKg: 0 };

  const inRange = rows.filter((row) => row.date >= range.from && row.date <= range.to);
  const volumes = inRange.map(resolveVolume).filter(hasLoad);
  const maxVolumeKg = volumes.length > 0 ? Math.max(...volumes) : 0;
  const byDate = new Map(inRange.map((row) => [row.date, row]));
  const days = listDateKeys(range).map((date) => ({
    date,
    session: byDate.has(date) ? toSession(byDate.get(date), maxVolumeKg) : null,
  }));
  return { days, maxVolumeKg };
};

/**
 * Builds heatmap week data from the daily-activity payload.
 * Groups by ISO week (Mon–Sun), pads incomplete weeks with empty ghost cells.
 *
 * @param {object[]} dailyActivity - Array from API, sorted ascending by date.
 * @param {Date} [now] - Injected for tests.
 * @returns {{ weeks: object[], maxVolumeKg: number }}
 */
export const computeHeatmapWeeks = (dailyActivity, now = new Date()) => {
  if (!Array.isArray(dailyActivity) || dailyActivity.length === 0) {
    return { weeks: [], maxVolumeKg: 0 };
  }

  const today = formatDateKey(now);

  const validVolumes = dailyActivity
    .map(resolveVolume)
    .filter((v) => v !== null && v !== undefined && Number.isFinite(v) && v > 0);
  const maxVolumeKg = validVolumes.length > 0 ? Math.max(...validVolumes) : 0;

  // Build a lookup map keyed by YYYY-MM-DD
  const byDate = new Map();
  dailyActivity.forEach((day) => {
    byDate.set(day.date, day);
  });

  // Find the Monday of the first week and Sunday of the last week
  const firstDate = new Date(dailyActivity[0].date + 'T00:00:00');
  const lastDate = new Date(dailyActivity[dailyActivity.length - 1].date + 'T00:00:00');

  // Align to Monday (ISO week starts Monday)
  const firstDow = firstDate.getDay(); // 0=Sun … 6=Sat
  const daysToMon = firstDow === 0 ? 6 : firstDow - 1;
  const weekStart = new Date(firstDate);
  weekStart.setDate(weekStart.getDate() - daysToMon);

  // Align end to Sunday
  const lastDow = lastDate.getDay();
  const daysToSun = lastDow === 0 ? 0 : 7 - lastDow;
  const weekEnd = new Date(lastDate);
  weekEnd.setDate(weekEnd.getDate() + daysToSun);

  const weeks = [];
  const cursor = new Date(weekStart);
  let isFirstRow = true;

  while (cursor <= weekEnd) {
    const days = [];
    let weekLabel = null;

    for (let i = 0; i < DAYS_IN_WEEK; i++) {
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, '0');
      const d = String(cursor.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;

      // Week label: show month abbreviation for first day of each month in this row
      if (i === 0) {
        weekLabel = cursor.getDate() <= 7
          ? cursor.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
          : String(cursor.getDate());
      }

      const entry = byDate.get(dateStr);
      days.push({
        date: dateStr,
        status: resolveStatus(entry?.status),
        volumeKg: entry ? resolveVolume(entry) : null,
        trainingName: entry?.trainingName ?? null,
        completedSets: entry?.completedSets ?? 0,
        totalSets: entry?.totalSets ?? 0,
        isToday: dateStr === today,
        isFirstRow,
        inPeriod: !!entry,
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    weeks.push({ label: weekLabel, days });
    isFirstRow = false;
  }

  return { weeks, maxVolumeKg, dowLabels: DOW_LABELS };
};
