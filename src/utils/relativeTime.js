/**
 * formatRelativeTime
 *
 * Returns a human-readable relative time string for a given ISO timestamp.
 * Used for draft-save labels and similar UI needs.
 *
 * @param {string|null|undefined} iso - ISO 8601 timestamp string.
 * @returns {string|null} Relative label, or null when iso is falsy.
 */
const formatRelativeTime = (iso) => {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  return `há ${Math.floor(hours / 24)}d`;
};

export default formatRelativeTime;
