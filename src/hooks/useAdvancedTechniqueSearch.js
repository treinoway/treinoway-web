import { useState, useEffect } from 'react';
import { listAdvancedTechniques } from '../api/advancedTechniques';
import { translateError } from '../i18n';

const SEARCH_DEBOUNCE_MS = 250;
const SEARCH_LIMIT = 50;

// Lazy debounced technique search: nothing is fetched until activate(); status 'idle' | 'loading' | 'ready' | 'error'.
const useAdvancedTechniqueSearch = () => {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(false);
  const [state, setState] = useState({ status: 'idle', results: [], error: '' });

  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    const term = query.trim();
    const timer = setTimeout(async () => {
      setState((prev) => ({ ...prev, status: 'loading' }));
      try {
        const { data } = await listAdvancedTechniques({ q: term, limit: SEARCH_LIMIT });
        if (!cancelled) setState({ status: 'ready', results: data ?? [], error: '' });
      } catch (error) {
        if (!cancelled) setState({ status: 'error', results: [], error: error.userMessage || translateError(error) });
      }
    }, term ? SEARCH_DEBOUNCE_MS : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [active, query]);

  const activate = () => setActive(true);

  return { query, setQuery, activate, ...state };
};

export default useAdvancedTechniqueSearch;
