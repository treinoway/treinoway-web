/**
 * Pure helpers for the "Volume por sessão" day-timeline chart (PulseWaveform).
 * Input is the `days` array from computeVolumeTimeline(): one slot per calendar
 * day, `session` null on rest days.
 */

import { statusLabel } from '../constants/dashboardViz';
import { td } from './studentCockpit';

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAYS_IN_WEEK = 7;

// A value label is ~45px wide (~15% of the plot at 375px): two labels closer
// than this share of the slots would overlap, so only the max keeps its label.
const LABEL_MIN_DISTANCE_FRACTION = 0.15;
// Slots in the outer share of the plot align overflowing content inward.
const VALUE_LABEL_EDGE_FRACTION = 0.08;
const TOOLTIP_EDGE_FRACTION = 0.3;

const parseDateKey = (dateStr) => {
  const [year, month, day] = (dateStr ?? '').split('-').map(Number);
  return year && month && day ? { year, month, day } : null;
};

/** "4 set" — axis ticks. */
export const formatShortDate = (dateStr) => {
  const parts = parseDateKey(dateStr);
  return parts ? `${parts.day} ${MONTHS_SHORT[parts.month - 1]}` : '-';
};

/** "Qui, 3 de set" — tooltip, aria-labels and the data table. */
export const formatLongDate = (dateStr) => {
  const parts = parseDateKey(dateStr);
  if (!parts) return '-';
  const weekday = WEEKDAYS_SHORT[new Date(parts.year, parts.month - 1, parts.day).getDay()];
  return `${weekday}, ${parts.day} de ${MONTHS_SHORT[parts.month - 1]}`;
};

export const formatKg = (volumeKg) => Math.round(volumeKg).toLocaleString('pt-BR');

/** "10.029 kg", or "Sem carga registrada" for duration-only sessions. */
export const formatSessionVolume = (session) =>
  (session.hasLoad ? `${formatKg(session.volumeKg)} kg` : td('volume.noLoad'));

export const formatSets = (completedSets, totalSets) =>
  (completedSets > 0 || totalSets > 0 ? `${completedSets}/${totalSets}` : '—');

export const buildSessionAriaLabel = (date, session) => {
  const parts = [statusLabel(session.status), formatSessionVolume(session)];
  if (session.sessionCount > 1) parts.push(td('volume.sessionsCount', { count: session.sessionCount }));
  return `${formatLongDate(date)}: ${parts.join(', ')}`;
};

/** Weekly ticks anchored on the period end, so the end date is always labelled. */
export const buildTickIndices = (slotCount) => {
  const ticks = new Set();
  for (let index = slotCount - 1; index >= 0; index -= DAYS_IN_WEEK) ticks.add(index);
  return ticks;
};

/** 'start' | 'end' | 'center' — keeps overflowing content inside the plot near its edges. */
export const computeEdgeAlign = (index, total, edgeFraction) => {
  const position = (index + 0.5) / total;
  if (position < edgeFraction) return 'start';
  if (position > 1 - edgeFraction) return 'end';
  return 'center';
};

export const computeValueLabelAlign = (index, total) =>
  computeEdgeAlign(index, total, VALUE_LABEL_EDGE_FRACTION);

export const computeTooltipAnchor = (index, total) => {
  const align = computeEdgeAlign(index, total, TOOLTIP_EDGE_FRACTION);
  if (align === 'start') return 'left';
  if (align === 'end') return 'right';
  return 'center';
};

export const listSessionIndices = (days) =>
  days.flatMap((day, index) => (day.session ? [index] : []));

/**
 * Direct value labels only on the max bar and the latest bar (ties for max go
 * to the latest). When both would collide, only the max keeps its label.
 * @returns {Set<number>} slot indices to label
 */
export const pickValueLabelIndices = (days) => {
  const loaded = listSessionIndices(days).filter((index) => days[index].session.hasLoad);
  if (loaded.length === 0) return new Set();
  const maxIndex = loaded.reduce((best, index) =>
    (days[index].session.volumeKg >= days[best].session.volumeKg ? index : best));
  const latestIndex = listSessionIndices(days).at(-1);
  const latestHasLoad = days[latestIndex].session.hasLoad;
  const tooClose = Math.abs(latestIndex - maxIndex) / days.length < LABEL_MIN_DISTANCE_FRACTION;
  if (!latestHasLoad || latestIndex === maxIndex || tooClose) return new Set([maxIndex]);
  return new Set([maxIndex, latestIndex]);
};

/**
 * Roving-focus target for a key press on a session bar.
 * @returns {number | null} slot index to focus, or null when the key is not navigation
 */
export const findKeyboardTarget = (key, currentIndex, sessionIndices) => {
  const position = sessionIndices.indexOf(currentIndex);
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return sessionIndices[Math.min(position + 1, sessionIndices.length - 1)];
    case 'ArrowLeft':
    case 'ArrowUp':
      return sessionIndices[Math.max(position - 1, 0)];
    case 'Home': return sessionIndices[0];
    case 'End': return sessionIndices.at(-1);
    default: return null;
  }
};
