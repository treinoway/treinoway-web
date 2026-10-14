import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { countStudentsByStatus } from '../utils/studentStatus';

// v2: counts are now derived from `billingStatus`. The unversioned key held
// all-zero ativo/pendente/vencido counts (computed from a field the API never
// returned), so it is intentionally abandoned.
export const TRAINER_ROSTER_CACHE_KEY = 'treinoway.trainerRosterCounts.v2';

const computeCounts = (students) => ({
  total: students.length,
  ...countStudentsByStatus(students),
});

const isValidCounts = (value) =>
  !!value
  && typeof value.total === 'number'
  && typeof value.ativo === 'number'
  && typeof value.pendente === 'number'
  && typeof value.vencido === 'number';

const readCache = () => {
  try {
    const raw = localStorage.getItem(TRAINER_ROSTER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValidCounts(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const writeCache = (counts) => {
  try {
    localStorage.setItem(TRAINER_ROSTER_CACHE_KEY, JSON.stringify(counts));
  } catch {
    // Storage unavailable (quota/private mode) — in-memory state still updates.
  }
};

/**
 * Reads last-known roster counts from localStorage synchronously so the
 * Dashboard Pulse can paint real numbers instantly, then refreshes from the
 * network in the background. A single fetch powers both the Pulse chips and
 * the "Criar rotina" empty-roster guard — no extra on-click round-trip.
 *
 * Status classification uses the shared billingStatus mapper
 * (src/utils/studentStatus.js), same as src/pages/trainer/Students.jsx.
 *
 * Errors are kept silent: on failure the last cached counts (if any) are
 * preserved and `error` is set so the UI can offer a retry, but nothing is
 * toasted and nothing turns red on Home.
 *
 * @param {boolean} enabled — fetch/refetch only while true (active trainer mode).
 */
const useTrainerRoster = (enabled) => {
  const [counts, setCounts] = useState(readCache);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
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

  const fetchRoster = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await api.get('/trainer/students');
      const next = computeCounts(response.data);
      if (!mountedRef.current) return;
      setCounts(next);
      writeCache(next);
    } catch {
      if (!mountedRef.current) return;
      setError(true);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    fetchRoster();
  }, [enabled, fetchRoster]);

  return {
    counts,
    loading,
    error,
    hasCounts: counts !== null,
    isEmpty: counts !== null && counts.total === 0,
    refetch: fetchRoster,
  };
};

export default useTrainerRoster;
