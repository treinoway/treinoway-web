import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';
import { useToast } from '../contexts/ToastContext';
import { translateError } from '../i18n';
import useDelayedFlag from './useDelayedFlag';

const DEBOUNCE_MS = 300;
const SPINNER_DELAY_MS = 250;

/**
 * Debounced server-side search hook for exercise templates.
 *
 * When `query` is empty, `results` is null (caller falls back to the initial
 * prop-provided list). When non-empty, fires GET /trainer/exercise-templates
 * with params { q, limit: 100 } and returns the server results.
 *
 * `seenMap` accumulates every template the user has ever seen (initial list +
 * all search results), so `onSubmitFromLibrary`/import can resolve selected ids
 * even if the template is no longer visible in the current filtered list.
 *
 * `staleResults` holds the last resolved result set and is kept visible while
 * a new fetch is in flight, preventing a blank-list flash.
 *
 * `showSpinner` is a delayed version of `searching` (250 ms threshold) so
 * fast fetches never render a spinner at all.
 *
 * @param {object[]} initialTemplates - The cached templates passed in as a prop.
 * @returns {{ results: object[]|null, staleResults: object[]|null, searching: boolean, showSpinner: boolean, query: string, setQuery: Function, seenMap: Map }}
 */
const useExerciseTemplateSearch = (initialTemplates) => {
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [staleResults, setStaleResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const showSpinner = useDelayedFlag(searching, SPINNER_DELAY_MS);

  // seenMap: id → template object — accumulates everything the user has seen
  const seenMapRef = useRef(new Map());

  // Populate seenMap with the initial list on mount / when initialTemplates changes
  useEffect(() => {
    for (const tmpl of initialTemplates) {
      seenMapRef.current.set(tmpl.id, tmpl);
    }
  }, [initialTemplates]);

  const debounceRef = useRef(null);

  const handleSetQuery = useCallback((value) => {
    setQuery(value);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();

    if (!trimmed) {
      setResults(null);
      // Do NOT reset staleResults here — the caller falls back to initialTemplates
      // when query is empty, so staleResults is irrelevant. Preserving it avoids
      // a blank-list flash if the user clears and immediately retypes a new query.
      setSearching(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await api.get('/trainer/exercise-templates', {
          params: { q: trimmed, limit: 100 },
        });
        const fetched = response.data?.data || [];
        // Accumulate into seenMap
        for (const tmpl of fetched) {
          seenMapRef.current.set(tmpl.id, tmpl);
        }
        setResults(fetched);
        setStaleResults(fetched);
      } catch (error) {
        showToast(error.userMessage || translateError(error), 'error');
        setResults([]);
        setStaleResults([]);
      } finally {
        setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [query, showToast]);

  return {
    results,
    staleResults,
    searching,
    showSpinner,
    query,
    setQuery: handleSetQuery,
    seenMap: seenMapRef.current,
  };
};

export default useExerciseTemplateSearch;
