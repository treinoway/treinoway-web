import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { translateError } from '../i18n';
import { useAuth } from '../contexts/AuthContext';
import {
  TRAINER_DASHBOARD_CACHE_KEY,
  scopedCacheKey,
  readJsonCache,
  writeJsonCache,
} from '../utils/trainerCaches';

// Money and adherence fields are returned as numeric strings (e.g. "2500.00")
// by the real /trainer/dashboard contract, but older cache entries may still
// hold raw numbers from before this change shipped — accept either so we
// don't invalidate existing users' cached data for a wire-format nuance that
// downstream formatters already tolerate.
const isNumericValue = (value) =>
  typeof value === 'number'
  || (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)));

const isValidDashboardData = (value) =>
  !!value
  && !!value.plans
  && typeof value.plans.expiredCount === 'number'
  && typeof value.plans.renewingSoonCount === 'number'
  && !!value.routines
  && typeof value.routines.expiredCount === 'number'
  && typeof value.routines.expiringSoonCount === 'number'
  && !!value.finance
  && isNumericValue(value.finance.monthReceived)
  && isNumericValue(value.finance.totalReceived)
  && typeof value.finance.overdueCount === 'number'
  && isNumericValue(value.finance.overdueAmount)
  && !!value.engagement
  && typeof value.engagement.inactiveStudentsCount === 'number'
  && isNumericValue(value.engagement.adherenceMonthPct)
  && (value.engagement.adherenceDeltaPp === null || isNumericValue(value.engagement.adherenceDeltaPp))
  && typeof value.engagement.weekPrCount === 'number'
  && typeof value.generatedAt === 'string';

// Reads the user's cached panel payload, or null when absent or malformed.
const readCache = (userId) => {
  const parsed = readJsonCache(scopedCacheKey(TRAINER_DASHBOARD_CACHE_KEY, userId));
  return isValidDashboardData(parsed) ? parsed : null;
};

/**
 * Patches `finance.overdueCount/overdueAmount` of the user's cached dashboard
 * payload so the sidebar badge and the Dashboard agree with what Financeiro
 * just loaded (overview overdue is "as of today" for any month). No-op without
 * a valid cache entry.
 */
export const patchTrainerDashboardFinanceCache = ({ userId, overdueCount, overdueAmount }) => {
  const cached = readCache(userId);
  if (!cached) return;
  writeJsonCache(
    scopedCacheKey(TRAINER_DASHBOARD_CACHE_KEY, userId),
    { ...cached, finance: { ...cached.finance, overdueCount, overdueAmount } },
  );
};

/**
 * Reads the last-known "Tua semana em foco" panel data from localStorage
 * synchronously so the ControlTower can paint real numbers instantly, then
 * refreshes from the network in the background. Mirrors useTrainerRoster's
 * cache-first/silent-error conventions exactly.
 *
 * Errors are kept silent: on failure the last cached data (if any) is
 * preserved and `error` carries the user-facing message so the UI can offer
 * a retry, but nothing is toasted and nothing turns red.
 *
 * @param {boolean} enabled — fetch/refetch only while true (active trainer mode).
 */
const useTrainerDashboard = (enabled) => {
  const { user } = useAuth();
  const userId = user?.id;
  const [data, setData] = useState(() => readCache(userId));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    // Reset on setup so React 19 StrictMode's dev-only mount → cleanup →
    // remount cycle doesn't leave this permanently false after the first
    // (synchronous) cleanup runs.
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/trainer/dashboard');
      const next = response.data;
      if (!mountedRef.current) return;
      setData(next);
      writeJsonCache(scopedCacheKey(TRAINER_DASHBOARD_CACHE_KEY, userId), next);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err.userMessage || translateError(err));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!enabled) return;
    fetchDashboard();
  }, [enabled, fetchDashboard]);

  return {
    data,
    loading,
    error,
    hasData: data !== null,
    refetch: fetchDashboard,
  };
};

export default useTrainerDashboard;
