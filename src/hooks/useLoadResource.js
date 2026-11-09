import { useCallback, useEffect, useRef, useState } from 'react';
import { translateError } from '../i18n';

const INITIAL_STATE = { data: null, error: null, settledKey: undefined, pending: false };

// Loads a resource on mount and when `key` changes; exposes data, loading, error, setData and reload.
const useLoadResource = (load, key, { enabled = true, onSilentError } = {}) => {
  const [state, setState] = useState(INITIAL_STATE);
  const loadRef = useRef(load);
  const keyRef = useRef(key);
  const requestRef = useRef(0);
  const onSilentErrorRef = useRef(onSilentError);

  useEffect(() => {
    loadRef.current = load;
    keyRef.current = key;
    onSilentErrorRef.current = onSilentError;
  });

  const execute = useCallback(async (requestKey, silent = false) => {
    requestRef.current += 1;
    const requestId = requestRef.current;
    try {
      const data = await loadRef.current();
      if (requestId === requestRef.current) setState({ data, error: null, settledKey: requestKey, pending: false });
    } catch (error) {
      if (requestId !== requestRef.current) return;
      const message = error.userMessage || translateError(error);
      // why: a failed silent refresh keeps the list on screen and only reports the failure.
      if (silent) {
        onSilentErrorRef.current?.(message);
        return;
      }
      setState({ data: null, error: message, settledKey: requestKey, pending: false });
    }
  }, []);

  // why: `silent` refreshes after a mutation without flashing the loading state.
  const reload = useCallback(({ silent = false } = {}) => {
    if (!silent) setState((prev) => ({ ...prev, error: null, pending: true }));
    return execute(keyRef.current, silent);
  }, [execute]);

  const setData = useCallback((next) => {
    setState((prev) => ({ ...prev, data: typeof next === 'function' ? next(prev.data) : next }));
  }, []);

  useEffect(() => {
    if (enabled) execute(key);
  }, [execute, key, enabled]);

  const loading = state.pending || state.settledKey !== key;
  return { data: state.data, loading, error: state.error, setData, reload };
};

export default useLoadResource;
