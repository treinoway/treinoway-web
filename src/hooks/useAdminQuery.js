import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';
import { translateError } from '../i18n';

const IDLE_RESULT = { params: null, reloadKey: -1, data: null, error: null };

// Runs `fetcher(params)` whenever the memoized `params` change; exposes data, staleData (last result while refetching), loading, error, reload and setData.
const useAdminQuery = (fetcher, params) => {
  const { showToast } = useToast();
  const [result, setResult] = useState(IDLE_RESULT);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetcher(params)
      .then((data) => {
        if (!cancelled) setResult({ params, reloadKey, data, error: null });
      })
      .catch((error) => {
        if (cancelled) return;
        setResult({ params, reloadKey, data: null, error });
        showToast(error.userMessage || translateError(error), 'error');
      });
    return () => {
      cancelled = true;
    };
  }, [fetcher, params, reloadKey, showToast]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  const setData = useCallback(
    (update) => setResult((previous) => ({ ...previous, data: update(previous.data) })),
    []
  );

  const loading = result.params !== params || result.reloadKey !== reloadKey;
  return { data: loading ? null : result.data, staleData: result.data, loading, error: loading ? null : result.error, reload, setData };
};

export default useAdminQuery;
