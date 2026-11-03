import { useState, useEffect } from 'react';
import { translateError } from '../i18n';

// Runs the memoized `request` on mount and whenever it changes; exposes data, loading and the error message.
const useManagerQuery = (request) => {
  const [result, setResult] = useState({ request: null, data: null, message: null });

  useEffect(() => {
    let cancelled = false;
    request()
      .then((data) => {
        if (!cancelled) setResult({ request, data, message: null });
      })
      .catch((error) => {
        if (!cancelled) setResult({ request, data: null, message: error.userMessage || translateError(error) });
      });
    return () => {
      cancelled = true;
    };
  }, [request]);

  const loading = result.request !== request;
  return { data: loading ? null : result.data, message: loading ? null : result.message, loading };
};

export default useManagerQuery;
