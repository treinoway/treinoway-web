import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import { translateError } from '../i18n';

const BASE_URL = '/trainer/consistency-ranking';

// Panel of one student in the consistency ranking and its actions (pause, resume, adjust target, log contact); actions reject with the API error and reload the panel on success
const useConsistencyStudentPanel = (studentId) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(studentId));
  const [error, setError] = useState(null);

  const fetchPanel = useCallback(async () => {
    const response = await api.get(`${BASE_URL}/students/${studentId}`);
    setData(response.data);
    setError(null);
  }, [studentId]);

  const reload = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      await fetchPanel();
    } catch (err) {
      setError(err.userMessage || translateError(err));
    } finally {
      setLoading(false);
    }
  }, [studentId, fetchPanel]);

  useEffect(() => {
    setData(null);
    setError(null);
    reload();
  }, [reload]);

  const pauseWeek = useCallback(async ({ weekStart, reason }) => {
    await api.post(`${BASE_URL}/pauses`, { weekStart, studentId, reason });
    await fetchPanel();
  }, [studentId, fetchPanel]);

  const resumeWeek = useCallback(async (weekStart) => {
    await api.delete(`${BASE_URL}/pauses`, { data: { weekStart, studentId } });
    await fetchPanel();
  }, [studentId, fetchPanel]);

  const adjustTarget = useCallback(async ({ pillar, value }) => {
    await api.put(`${BASE_URL}/students/${studentId}/targets`, { pillar, value });
    await fetchPanel();
  }, [studentId, fetchPanel]);

  const logContact = useCallback(async (pillar) => {
    await api.post(`${BASE_URL}/students/${studentId}/contacts`, { pillar });
    await fetchPanel();
  }, [studentId, fetchPanel]);

  return { data, loading, error, reload, pauseWeek, resumeWeek, adjustTarget, logContact };
};

export default useConsistencyStudentPanel;
