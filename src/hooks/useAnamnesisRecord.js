import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';
import { translateError } from '../i18n';
import api from '../api/axios';

const getErrorMessage = (error) => error.userMessage || translateError(error);

/**
 * Loads one anamnesis. `status` is 'loading' | 'ready' | 'notFound' | 'error' so the page can
 * render each state in place (Rule 9). `refetch` is silent: it keeps the current data on screen
 * and only reports failures through a toast. Mount it keyed by id: a new id means a fresh state.
 */
const useAnamnesisRecord = (anamnesisId) => {
  const { showToast } = useToast();
  const [anamnesis, setAnamnesis] = useState(null);
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [attempt, setAttempt] = useState(0);

  const request = useCallback(() => api.get(`/trainer/anamneses/${anamnesisId}`), [anamnesisId]);

  useEffect(() => {
    let cancelled = false;
    request()
      .then((response) => {
        if (cancelled) return;
        setAnamnesis(response.data);
        setStatus('ready');
      })
      .catch((error) => {
        if (cancelled) return;
        setErrorMessage(getErrorMessage(error));
        setStatus(error.response?.status === 404 ? 'notFound' : 'error');
      });
    return () => { cancelled = true; };
  }, [request, attempt]);

  const refetch = useCallback(async () => {
    try {
      const response = await request();
      setAnamnesis(response.data);
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
    }
  }, [request, showToast]);

  const retry = () => {
    setStatus('loading');
    setAttempt((prev) => prev + 1);
  };

  return { anamnesis, setAnamnesis, status, errorMessage, refetch, retry };
};

export default useAnamnesisRecord;
