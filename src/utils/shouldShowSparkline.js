/**
 * Predicate: should the sparkline be shown for this exercise's load history?
 *
 * Rules (from design notes):
 *   1. Mobile: always hidden via CSS — predicate is only consulted on desktop.
 *   2. Returns false when there are fewer than 3 non-null values (insufficient signal).
 *   3. Returns true when ANY of:
 *      a) Direction changed in the last 3 values (plateau-break, regression, recovery).
 *      b) |lastDeltaPct| > 5 — recent move is large enough to warrant visual emphasis.
 *      c) CV (coefficient of variation) > 0.08 — overall series is volatile.
 *   4. Monotonic ascending or descending → false (TrendChip already tells the story).
 *   5. Flat (all equal) → false.
 *   6. Null-heavy (fewer than 3 valid points) → false (graceful).
 *
 * @param {(number | null)[] | null | undefined} loadHistory
 *   Max 6 values, most-recent first.
 * @param {number | null | undefined} lastDeltaPct
 *   The pre-computed pct delta from the backend (trend.maxLoadDeltaPct).
 * @returns {boolean}
 */
const shouldShowSparkline = (loadHistory, lastDeltaPct) => {
  if (!Array.isArray(loadHistory)) return false;

  const valid = loadHistory.filter((v) => v !== null && v !== undefined && Number.isFinite(v));
  if (valid.length < 3) return false;

  // Rule b: large recent move
  if (lastDeltaPct !== null && lastDeltaPct !== undefined && Math.abs(lastDeltaPct) > 5) {
    return true;
  }

  // Rule a: direction changed in last 3 values (most-recent first, so last-3 = indices 0,1,2)
  const last3 = valid.slice(0, 3);
  if (last3.length === 3) {
    // loadHistory is most-recent first: [latest, prev, prevprev]
    // Direction change = sign of (latest - prev) differs from sign of (prev - prevprev)
    const d1 = last3[0] - last3[1]; // latest change
    const d2 = last3[1] - last3[2]; // previous change
    // Direction changed when signs differ AND neither delta is zero
    if (d1 !== 0 && d2 !== 0 && Math.sign(d1) !== Math.sign(d2)) {
      return true;
    }
  }

  // Rule c: coefficient of variation > 0.08
  const mean = valid.reduce((sum, v) => sum + v, 0) / valid.length;
  if (mean === 0) return false;
  const variance = valid.reduce((sum, v) => sum + (v - mean) ** 2, 0) / valid.length;
  const cv = Math.sqrt(variance) / mean;
  if (cv > 0.08) return true;

  return false;
};

export default shouldShowSparkline;
