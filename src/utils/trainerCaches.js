export const TRAINER_ROSTER_CACHE_KEY = 'treinoway.trainerRosterCounts.v2';
export const TRAINER_DASHBOARD_CACHE_KEY = 'treinoway.trainerDashboardData';

const CACHE_KEY_PREFIXES = [TRAINER_ROSTER_CACHE_KEY, TRAINER_DASHBOARD_CACHE_KEY];

// Builds the per-user storage key, or null while the user id is unknown.
export const scopedCacheKey = (baseKey, userId) => (
  userId === undefined || userId === null ? null : `${baseKey}:${userId}`
);

// Reads and parses a JSON cache entry; null on missing, corrupt or unavailable storage.
export const readJsonCache = (key) => {
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// Writes a JSON cache entry, ignoring quota/private-mode failures.
export const writeJsonCache = (key, value) => {
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // why: storage unavailable (quota/private mode) — in-memory state still updates
  }
};

// Removes every roster/dashboard cache entry (any user, plus legacy unscoped keys).
export const clearTrainerCaches = () => {
  try {
    const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i));
    keys
      .filter((key) => key && CACHE_KEY_PREFIXES.some((prefix) => key === prefix || key.startsWith(`${prefix}:`)))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // why: storage unavailable — nothing to clear
  }
};
