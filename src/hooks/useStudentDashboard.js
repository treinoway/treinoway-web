import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { computePreviousPeriod, getPeriodCacheKey } from '../constants/dashboardPeriod';

const buildBlock = () => ({ data: null, loading: true, error: null });

const initialState = () => ({
  summary: buildBlock(),
  previousSummary: buildBlock(),
  recentSessions: buildBlock(),
  progression: buildBlock(),
  dailyActivity: buildBlock(),
  studentNotFound: false,
});

const isStudentNotFoundError = (error) => error?.response?.data?.error === 'STUDENT_NOT_FOUND';

const isCancelledError = (error) =>
  error?.code === 'ERR_CANCELED'
  || error?.name === 'CanceledError'
  || error?.name === 'AbortError';

/**
 * Fetches the three dashboard endpoints (summary, recent sessions, exercise progression)
 * and the previous-period summary used for the "vs período anterior" delta.
 *
 * - Each block is independent: errors in one don't block the others (Promise.allSettled).
 * - Period changes cancel any in-flight requests via AbortController.
 * - Results are cached in-memory by `studentId:period` so re-mounting doesn't refetch.
 * - When the GET to /summary returns STUDENT_NOT_FOUND, sets `studentNotFound: true`
 *   so the page can render the inline 404 (per refined design — no toast + auto-redirect).
 */
const useStudentDashboard = (studentId, period) => {
  const [state, setState] = useState(initialState);
  const cacheRef = useRef(new Map());
  const abortRef = useRef(null);

  const cacheKey = studentId && period ? `${studentId}:${getPeriodCacheKey(period)}` : null;

  const fetchBlock = useCallback(
    async (urlBuilder, signal) => {
      try {
        const response = await api.get(urlBuilder.url, {
          params: urlBuilder.params,
          signal,
        });
        return { data: response.data, error: null };
      } catch (error) {
        if (isCancelledError(error)) return { cancelled: true };
        return { data: null, error };
      }
    },
    [],
  );

  const runFetch = useCallback(async () => {
    if (!studentId || !period?.from || !period?.to) return;

    const cached = cacheKey ? cacheRef.current.get(cacheKey) : null;
    if (cached) {
      setState({ ...cached, studentNotFound: false });
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((prev) => ({
      ...prev,
      summary: { ...prev.summary, loading: true, error: null },
      previousSummary: { ...prev.previousSummary, loading: true, error: null },
      recentSessions: { ...prev.recentSessions, loading: true, error: null },
      progression: { ...prev.progression, loading: true, error: null },
      dailyActivity: { ...prev.dailyActivity, loading: true, error: null },
      studentNotFound: false,
    }));

    const summaryParams = { dateFrom: period.from, dateTo: period.to };
    const recentParams = { dateFrom: period.from, dateTo: period.to, limit: 5 };
    const progressionParams = { dateFrom: period.from, dateTo: period.to, limit: 20, includeDurationOnly: false };
    const dailyActivityParams = { dateFrom: period.from, dateTo: period.to };

    const previousPeriod = computePreviousPeriod(period);
    const previousParams = previousPeriod
      ? { dateFrom: previousPeriod.from, dateTo: previousPeriod.to }
      : null;

    const requests = [
      fetchBlock({ url: `/trainer/students/${studentId}/dashboard/summary`, params: summaryParams }, controller.signal),
      previousParams
        ? fetchBlock({ url: `/trainer/students/${studentId}/dashboard/summary`, params: previousParams }, controller.signal)
        : Promise.resolve({ data: null, error: null }),
      fetchBlock({ url: `/trainer/students/${studentId}/dashboard/recent-sessions`, params: recentParams }, controller.signal),
      fetchBlock({ url: `/trainer/students/${studentId}/dashboard/exercise-progression`, params: progressionParams }, controller.signal),
      fetchBlock({ url: `/trainer/students/${studentId}/dashboard/daily-activity`, params: dailyActivityParams }, controller.signal),
    ];

    const [summaryResult, previousResult, recentResult, progressionResult, dailyActivityResult] = await Promise.all(requests);

    if (controller.signal.aborted) return;
    if ([summaryResult, previousResult, recentResult, progressionResult, dailyActivityResult].some((r) => r?.cancelled)) return;

    const studentNotFound = isStudentNotFoundError(summaryResult.error);

    const next = {
      summary: { data: summaryResult.data, loading: false, error: studentNotFound ? null : summaryResult.error },
      previousSummary: { data: previousResult.data, loading: false, error: previousResult.error },
      recentSessions: { data: recentResult.data, loading: false, error: recentResult.error },
      progression: { data: progressionResult.data, loading: false, error: progressionResult.error },
      dailyActivity: { data: dailyActivityResult.data, loading: false, error: dailyActivityResult.error },
      studentNotFound,
    };

    if (cacheKey && !studentNotFound) cacheRef.current.set(cacheKey, next);
    setState(next);
  }, [cacheKey, fetchBlock, period, studentId]);

  // Stable ref to the latest fetcher so the mount-effect can call it without
  // having `runFetch` itself in the dependency array (the effect would otherwise
  // re-run on every state update and trigger the lint warning).
  const runFetchRef = useRef(runFetch);

  useEffect(() => {
    runFetchRef.current = runFetch;
  }, [runFetch]);

  useEffect(() => {
    // Defer one microtask to keep React's "setState inside effect body" lint rule happy.
    // The fetcher synchronously transitions to loading state which would otherwise look
    // like a cascading render to the linter even though the work is asynchronous.
    queueMicrotask(() => runFetchRef.current());
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [cacheKey]);

  const refetch = useCallback(() => {
    runFetchRef.current();
  }, []);

  const retryBlock = useCallback((block) => {
    setState((prev) => ({ ...prev, [block]: { ...prev[block], loading: true, error: null } }));
    runFetchRef.current();
  }, []);

  return { ...state, refetch, retryBlock };
};

export default useStudentDashboard;
