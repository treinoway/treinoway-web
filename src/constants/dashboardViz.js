/**
 * Visualization constants and helpers for the student activity dashboard.
 * Controls waveform vs heatmap threshold and status palette.
 */

import { td } from '../utils/studentCockpit';

/**
 * Period length (in days) above which the waveform collapses to a heatmap.
 * Rationale: at 320px wide, 30 day slots ≈ 10px each. Beyond 60 slots each bar
 * drops below 5px and the height-encodes-effort idea becomes noise.
 */
export const WAVEFORM_THRESHOLD_DAYS = 60;

/**
 * Picks the visualization type for a given period window.
 * @param {number} periodDays - Total days in the period window.
 * @returns {'waveform' | 'heatmap'}
 */
export const pickViz = (periodDays) => {
  if (!Number.isFinite(periodDays) || periodDays <= 0) return 'waveform';
  return periodDays >= WAVEFORM_THRESHOLD_DAYS ? 'heatmap' : 'waveform';
};

/**
 * Maps a daily-activity status to its volume-chart modifier (bar/swatch shape:
 * full = solid, cut = light fill + border, abandoned = dashed outline + ×).
 * @param {'completed' | 'partial' | 'abandoned' | 'empty'} status
 * @returns {'full' | 'cut' | 'abandoned' | 'empty'}
 */
export const statusToChartModifier = (status) => {
  switch (status) {
    case 'completed': return 'full';
    case 'partial': return 'cut';
    case 'abandoned': return 'abandoned';
    default: return 'empty';
  }
};

const STATUS_LABEL_KEYS = ['completed', 'partial', 'abandoned'];

/**
 * Maps a daily-activity status to its label (`studentDetail.volume.status.*`):
 * completed = every planned set done, partial = finished with sets missing.
 * @param {'completed' | 'partial' | 'abandoned' | 'empty'} status
 * @returns {string}
 */
export const statusLabel = (status) =>
  td(`volume.status.${STATUS_LABEL_KEYS.includes(status) ? status : 'empty'}`);

/**
 * Heatmap intensity: maps relative volume to a step class (s1–s4) for completed sessions.
 * @param {number | null} volumeKg - Day volume in kg.
 * @param {number} maxVolumeKg - Max volume in the period (used to normalize).
 * @returns {'s1' | 's2' | 's3' | 's4'}
 */
export const volumeToIntensityStep = (volumeKg, maxVolumeKg) => {
  if (!volumeKg || !maxVolumeKg || maxVolumeKg === 0) return 's1';
  const ratio = volumeKg / maxVolumeKg;
  if (ratio < 0.25) return 's1';
  if (ratio < 0.50) return 's2';
  if (ratio < 0.75) return 's3';
  return 's4';
};
