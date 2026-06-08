import { WEEK_DAYS } from '../constants/weekDays';

/**
 * Returns the canonical sort index for a weekDay value (case-insensitive).
 * Returns Infinity for null/undefined/unknown values so they sort last.
 *
 * @param {string|null|undefined} weekDay - e.g. "monday", "MONDAY"
 * @returns {number}
 */
function weekDayIndex(weekDay) {
  if (!weekDay || typeof weekDay !== 'string') return Infinity;
  const idx = WEEK_DAYS.indexOf(weekDay.toLowerCase());
  return idx === -1 ? Infinity : idx;
}

/**
 * Sorts an array of training objects by weekDay in canonical order
 * (monday → sunday). Trainings without a weekDay go last, preserving
 * their relative order among themselves (stable tiebreaker via `order`
 * field, then original index).
 *
 * Does NOT mutate the original array.
 *
 * @param {Array<{weekDay?: string|null, order?: number}>} trainings
 * @returns {Array}
 */
export function sortTrainingsByWeekDay(trainings) {
  return trainings
    .map((t, originalIndex) => ({ t, originalIndex }))
    .sort((a, b) => {
      const idxA = weekDayIndex(a.t.weekDay);
      const idxB = weekDayIndex(b.t.weekDay);

      // Both have a known weekDay and they differ — sort by day.
      if (idxA !== idxB && Number.isFinite(idxA - idxB)) return idxA - idxB;

      // One assigned, one unassigned — assigned goes first.
      if (Number.isFinite(idxA) && !Number.isFinite(idxB)) return -1;
      if (!Number.isFinite(idxA) && Number.isFinite(idxB)) return 1;

      // Same day (or both unassigned): stable tiebreak by `order`, then original index.
      const orderA = a.t.order ?? a.originalIndex;
      const orderB = b.t.order ?? b.originalIndex;
      if (orderA !== orderB) return orderA - orderB;
      return a.originalIndex - b.originalIndex;
    })
    .map(({ t }) => t);
}
