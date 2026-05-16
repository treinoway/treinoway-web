/**
 * Formats a completion rate (0–1) as a percentage string.
 * @param {number|null|undefined} rate
 * @returns {string|null}
 */
export const formatPercent = (rate) => {
  if (rate === null || rate === undefined) return null;
  return `${Math.round(rate * 100)}%`;
};

/**
 * Formats the delta between current and previous completion rates.
 * Returns "+N%" / "-N%" / "0%" or null when either value is absent.
 * @param {number|null|undefined} currentRate
 * @param {number|null|undefined} previousRate
 * @returns {string|null}
 */
export const formatDelta = (currentRate, previousRate) => {
  if (
    currentRate === null ||
    previousRate === null ||
    previousRate === undefined ||
    currentRate === undefined
  ) return null;
  const diff = Math.round((currentRate - previousRate) * 100);
  if (diff === 0) return '0%';
  return `${diff > 0 ? '+' : ''}${diff}%`;
};

/**
 * Returns a human-readable label for days since last session.
 * @param {number|null|undefined} days
 * @returns {string}
 */
export const formatDaysSinceLast = (days) => {
  if (days === null || days === undefined) return '—';
  if (days === 0) return 'hoje';
  if (days === 1) return 'ontem';
  return `há ${days}d`;
};
