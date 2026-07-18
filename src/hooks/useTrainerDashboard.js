import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { translateError } from '../i18n';

const CACHE_KEY = 'treinoway.trainerDashboardData';

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

const readCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValidDashboardData(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const writeCache = (data) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable (quota/private mode) — in-memory state still updates.
  }
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
  const [data, setData] = useState(readCache);
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
      writeCache(next);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err.userMessage || translateError(err));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

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
