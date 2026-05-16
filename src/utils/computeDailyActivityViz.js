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
 * Waveform output (up to 30 bars, most-recent right):
 *   bars: [{ date, status, volumeKg, pct, trainingName, completedSets, totalSets }]
 *   maxVolumeKg: number
 *
 * Heatmap output (weeks × days grid):
 *   weeks: [{ label, days: [{ date, status, volumeKg, isToday, isFirstRow }] }]
 *   maxVolumeKg: number
 */

const WAVEFORM_BAR_COUNT = 30;
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
 * Returns YYYY-MM-DD string for today in local time.
 * @param {Date} [now]
 * @returns {string}
 */
const todayString = (now = new Date()) => {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Builds waveform bar data from the daily-activity payload.
 *
 * @param {object[]} dailyActivity - Array from API, sorted ascending by date.
 * @param {Date} [now] - Injected for tests.
 * @returns {{ bars: object[], maxVolumeKg: number }}
 */
export const computeWaveformBars = (dailyActivity, now = new Date()) => {
  if (!Array.isArray(dailyActivity) || dailyActivity.length === 0) {
    return { bars: [], maxVolumeKg: 0 };
  }

  // Take the last WAVEFORM_BAR_COUNT days (most-recent = last element)
  const slice = dailyActivity.slice(-WAVEFORM_BAR_COUNT);
  const today = todayString(now);

  const validVolumes = slice
    .map(resolveVolume)
    .filter((v) => v !== null && v !== undefined && Number.isFinite(v) && v > 0);
  const maxVolumeKg = validVolumes.length > 0 ? Math.max(...validVolumes) : 0;

  const bars = slice.map((day) => {
    const status = resolveStatus(day.status);
    const vol = resolveVolume(day) ?? 0;
    const hasActivity = status && status !== 'empty';
    let pct = 0;
    if (maxVolumeKg > 0 && vol > 0) {
      pct = Math.max(5, Math.round((vol / maxVolumeKg) * 100));
    } else if (hasActivity) {
      pct = 25;
    }
    return {
      date: day.date,
      status,
      volumeKg: resolveVolume(day),
      pct,
      trainingName: day.trainingName ?? null,
      completedSets: day.completedSets ?? 0,
      totalSets: day.totalSets ?? 0,
      isToday: day.date === today,
    };
  });

  return { bars, maxVolumeKg };
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

  const today = todayString(now);

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
