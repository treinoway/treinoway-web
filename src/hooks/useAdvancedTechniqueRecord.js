import { useState, useEffect } from 'react';
import { getAdvancedTechnique } from '../api/advancedTechniques';
import { translateError } from '../i18n';

// Loads one technique for the editor; status 'loading' | 'ready' | 'notFound' (only after a 404) | 'error'.
const useAdvancedTechniqueRecord = (techniqueId) => {
  const [status, setStatus] = useState(techniqueId ? 'loading' : 'ready');
  const [technique, setTechnique] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!techniqueId) return undefined;
    let cancelled = false;
    getAdvancedTechnique(techniqueId)
      .then((data) => {
        if (cancelled) return;
        setTechnique(data);
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
  }, [techniqueId, reloadKey]);

  const retry = () => {
    setStatus('loading');
    setReloadKey((key) => key + 1);
  };

  return { status, technique, loadError, retry };
};

export default useAdvancedTechniqueRecord;
