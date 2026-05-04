/**
 * Visualization constants and helpers for the student activity dashboard.
 * Controls waveform vs heatmap threshold and status palette.
 */

/**
 * Period length (in days) above which the waveform collapses to a heatmap.
 * Rationale: at 320px wide, 30 bars ≈ 10px each. Beyond 60 bars each bar
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
 * Maps a daily-activity status to its CSS fill modifier.
 * @param {'completed' | 'partial' | 'abandoned' | 'empty'} status
 * @returns {'success' | 'partial' | 'danger' | 'empty'}
 */
export const statusToFillModifier = (status) => {
  switch (status) {
    case 'completed': return 'success';
    case 'partial': return 'partial';
    case 'abandoned': return 'danger';
    default: return 'empty';
  }
};

/**
 * Maps a daily-activity status to a human-readable label (pt-BR).
 * @param {'completed' | 'partial' | 'abandoned' | 'empty'} status
 * @returns {string}
 */
export const statusLabel = (status) => {
  switch (status) {
    case 'completed': return 'Concluído';
    case 'partial': return 'Parcial';
    case 'abandoned': return 'Abandonado';
    default: return 'Sem treino';
  }
};

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
