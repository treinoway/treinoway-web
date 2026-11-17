import { getFinanceSummary } from '../api/subscriptions';

const entries = new WeakMap();

// Entry of the signed-in user object, created on demand.
const entryFor = (user) => {
  if (!entries.has(user)) entries.set(user, { summary: null, broadcast: null, pending: null });
  return entries.get(user);
};

/** Overdue count last broadcast by the finance overview for this user object, or null. */
export const getBroadcastOverdueCount = (user) => (user ? entryFor(user).broadcast : null);

/** Overdue count of the finance summary already loaded for this user object, or null. */
export const getSummaryOverdueCount = (user) => (user ? entryFor(user).summary : null);

/** Remembers a count broadcast by the finance overview so the next mount starts from it. */
export const setBroadcastOverdueCount = (user, count) => {
  if (user) entryFor(user).broadcast = count;
};

/** Drops the cached summary and stored broadcast of this user object so the next mount re-requests it. */
export const invalidateFinanceSummary = (user) => {
  if (user) entries.delete(user);
};

/**
 * Loads the finance summary overdue count once per user object, sharing the in-flight request.
 * @param {object} user - signed-in user object (cache key)
 * @returns {Promise<number|null>} the count, or null when the request failed (retried next time)
 */
export const loadSummaryOverdueCount = async (user) => {
  const entry = entryFor(user);
  if (entry.summary !== null) return entry.summary;
  if (!entry.pending) {
    entry.pending = getFinanceSummary()
      .then((summary) => {
        if (typeof summary?.overdueCount === 'number') entry.summary = summary.overdueCount;
        return entry.summary;
      })
      .catch(() => null)
      .finally(() => {
        entry.pending = null;
      });
  }
  return entry.pending;
};
