import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import { translateError } from '../i18n';
import useDebouncedValue from './useDebouncedValue';
import useIntervalTick from './useIntervalTick';
import { POLL_INTERVAL_MS, SEARCH_DEBOUNCE_MS, STANDINGS_FILTER, STANDINGS_TAB } from '../constants/consistencyRanking';

const BASE_URL = '/trainer/consistency-ranking';

const TAB_URLS = Object.freeze({
  [STANDINGS_TAB.CURRENT]: `${BASE_URL}/standings`,
  [STANDINGS_TAB.HISTORY]: `${BASE_URL}/history`,
  [STANDINGS_TAB.SEASONS]: `${BASE_URL}/seasons`,
});

// Whether the browser tab is in the background, where polling would be wasted
const isPageHidden = () => document.visibilityState === 'hidden';

// Request params of the current tab; only the standings take filter, search and season
const buildParams = (tab, { filter, query, seasonNumber }) => {
  if (tab !== STANDINGS_TAB.CURRENT) return {};
  return seasonNumber ? { filter, q: query, season: seasonNumber } : { filter, q: query };
};

// Ranking page data (standings, history, seasons): refetches on filter, search, tab or season change and polls every 60 s while visible
const useConsistencyStandings = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState(STANDINGS_FILTER.ALL);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState(STANDINGS_TAB.CURRENT);
  const [seasonNumber, setSeasonNumber] = useState(null);
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const tick = useIntervalTick(POLL_INTERVAL_MS);
  const requestIdRef = useRef(0);
  const loadRef = useRef(null);

  const load = useCallback(async ({ silent }) => {
    const requestId = ++requestIdRef.current;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const params = buildParams(tab, { filter, query: debouncedQuery, seasonNumber });
      const response = await api.get(TAB_URLS[tab], { params });
      if (requestId !== requestIdRef.current) return;
      setData(response.data);
      setError(null);
    } catch (err) {
      if (silent || requestId !== requestIdRef.current) return;
      setError(err.userMessage || translateError(err));
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [tab, filter, debouncedQuery, seasonNumber]);

  useEffect(() => {
    load({ silent: false });
  }, [load]);

  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    if (tick === 0 || isPageHidden()) return;
    loadRef.current({ silent: true });
  }, [tick]);

  const reload = useCallback(() => load({ silent: false }), [load]);

  return { data, loading, error, filter, setFilter, query, setQuery, tab, setTab, seasonNumber, setSeasonNumber, reload };
};

export default useConsistencyStandings;
