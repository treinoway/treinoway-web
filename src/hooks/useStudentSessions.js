import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import { translateError } from '../i18n';

export const SESSIONS_LIST_LIMIT = 50;

const INITIAL_STATE = { sessions: [], loading: true, error: null };

// True when the request was aborted on purpose (unmount or period change).
const isCancelledError = (error) =>
  error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError' || error?.name === 'AbortError';

/**
 * Sessions of one student in a period (GET dashboard/recent-sessions, max 50, no pagination).
 *
 * @param {string} studentId
 * @param {{ from: string, to: string }} period
 * @returns {{ sessions: Array, loading: boolean, error: string|null, retry: () => void }}
 */
const useStudentSessions = (studentId, period) => {
  const [state, setState] = useState(INITIAL_STATE);
  const [attempt, setAttempt] = useState(0);
  const { from, to } = period;

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => setState(INITIAL_STATE));
    api.get(`/trainer/students/${studentId}/dashboard/recent-sessions`, {
      params: { dateFrom: from, dateTo: to, limit: SESSIONS_LIST_LIMIT },
      signal: controller.signal,
    })
      .then((response) => {
        setState({ sessions: response.data?.data ?? [], loading: false, error: null });
      })
      .catch((err) => {
        if (isCancelledError(err)) return;
        setState({ sessions: [], loading: false, error: err.userMessage || translateError(err) });
      });
    return () => controller.abort();
  }, [studentId, from, to, attempt]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);

  return { ...state, retry };
};

export default useStudentSessions;
