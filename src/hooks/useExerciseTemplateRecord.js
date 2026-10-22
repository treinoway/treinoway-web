import { useState, useEffect } from 'react';
import { translateError } from '../i18n';
import api from '../api/axios';

/**
 * Loads one exercise template for the editor page. Without an id (create mode) it is
 * immediately 'ready' with no record. `status`: 'loading' | 'ready' | 'notFound' | 'error'.
 * "notFound" is only reported after the request fails with a 404 (never while loading).
 */
const useExerciseTemplateRecord = (templateId) => {
  const [status, setStatus] = useState(templateId ? 'loading' : 'ready');
  const [template, setTemplate] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!templateId) return undefined;
    let cancelled = false;
    api
      .get(`/trainer/exercise-templates/${templateId}`)
      .then((response) => {
        if (cancelled) return;
        setTemplate(response.data);
        setStatus('ready');
      })
      .catch((error) => {
        if (cancelled) return;
        const isNotFound = error?.response?.status === 404;
        if (!isNotFound) setLoadError(error.userMessage || translateError(error));
        setStatus(isNotFound ? 'notFound' : 'error');
      });
    return () => {
      cancelled = true;
    };
  }, [templateId, reloadKey]);

  const retry = () => {
    setStatus('loading');
    setReloadKey((key) => key + 1);
  };

  return { status, template, loadError, retry };
};

export default useExerciseTemplateRecord;
