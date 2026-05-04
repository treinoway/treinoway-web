/**
 * Formats an RPE value for display in pt-BR.
 *
 * Rules:
 *   - null / undefined / NaN → null (caller decides what to show)
 *   - Integer values (e.g. 7.0) → "RPE 7" (no decimal)
 *   - Decimal values (e.g. 7.5) → "RPE 7,5" (pt-BR comma separator)
 *   - Clamped to [1, 10] range; values outside are still formatted but not clipped.
 *
 * @param {number | null | undefined} rpe
 * @returns {string | null}
 */
const formatRpe = (rpe) => {
  if (rpe === null || rpe === undefined || !Number.isFinite(rpe)) return null;

  const rounded = Math.round(rpe * 10) / 10;
  const isInteger = Number.isInteger(rounded);
  const formatted = isInteger
    ? String(rounded)
    : rounded.toFixed(1).replace('.', ',');

  return `RPE ${formatted}`;
};

export default formatRpe;
