import { useState, useEffect } from 'react';
import { translateError } from '../i18n';
import api from '../api/axios';

const isLinkedTo = (link, anamnesisId) =>
  link.anamnesis?.id === anamnesisId || link.anamnesisId === anamnesisId;

const fetchLinkedStudentIds = async (students, anamnesisId) => {
  const results = await Promise.allSettled(
    students.map((student) => api.get(`/trainer/students/${student.id}/anamneses`)),
  );
  const linked = new Set();
  results.forEach((result, index) => {
    if (result.status !== 'fulfilled') return;
    const links = result.value.data ?? [];
    if (links.some((link) => isLinkedTo(link, anamnesisId))) linked.add(students[index].id);
  });
  return linked;
};

const loadAssignData = async (anamnesisId) => {
  const [anamnesisResponse, studentsResponse] = await Promise.all([
    api.get(`/trainer/anamneses/${anamnesisId}`),
    api.get('/trainer/students'),
  ]);
  const students = studentsResponse.data;
  const linkedIds = await fetchLinkedStudentIds(students, anamnesisId);
  return { anamnesis: anamnesisResponse.data, students, linkedIds };
};

/**
 * Loads what the assign screen needs: the anamnesis, the trainer's students and which of them
 * already have it. `status` is 'loading' | 'ready' | 'notFound' | 'error'.
 */
const useAssignAnamnesisData = (anamnesisId) => {
  const [data, setData] = useState({ anamnesis: null, students: [], linkedIds: new Set() });
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadAssignData(anamnesisId)
      .then((loaded) => {
        if (cancelled) return;
        setData(loaded);
        setStatus('ready');
      })
      .catch((error) => {
        if (cancelled) return;
        setErrorMessage(error.userMessage || translateError(error));
        setStatus(error.response?.status === 404 ? 'notFound' : 'error');
      });
    return () => { cancelled = true; };
  }, [anamnesisId, attempt]);

  const retry = () => {
    setStatus('loading');
    setAttempt((prev) => prev + 1);
  };

  return { ...data, status, errorMessage, retry };
};

export default useAssignAnamnesisData;
