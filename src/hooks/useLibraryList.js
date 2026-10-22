import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../contexts/ToastContext';
import { translateError } from '../i18n';
import api from '../api/axios';

const SEARCH_DEBOUNCE_MS = 300;

export const LIBRARY_STATUS = { LOADING: 'loading', READY: 'ready', ERROR: 'error' };

const pluralizeItems = (count) => `${count} ${count === 1 ? 'item' : 'itens'} selecionado${count === 1 ? '' : 's'}`;

/**
 * Server-paginated Biblioteca list: debounced search, filters, incremental
 * "Ver mais" (appends the next page), per-list selection and delete flows.
 *
 * - `status` is `loading` only until the first fetch settles; later fetches set
 *   `refetching` so the toolbar/list stay mounted.
 * - `filters` is a flat object of primitives; empty values are not sent.
 * - `requestConfirm` comes from `useConfirmDialog`.
 * - `isSelectable(item)` (default: all) marks rows that may be selected / batch-deleted; others are
 *   skipped by "select all" and by `toggleSelect`.
 */
const useLibraryList = ({ endpoint, filters = {}, pageSize = 20, requestConfirm, isSelectable = () => true }) => {
  const { showToast } = useToast();
  const filtersKey = JSON.stringify(filters);

  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState(LIBRARY_STATUS.LOADING);
  const [loadError, setLoadError] = useState('');
  const [refetching, setRefetching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const requestIdRef = useRef(0);
  const pageRef = useRef(1);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setQ(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchPage = useCallback(async (page, { append = false } = {}) => {
    const requestId = ++requestIdRef.current;
    const isCurrent = () => requestId === requestIdRef.current;
    if (!hasLoadedRef.current) setStatus(LIBRARY_STATUS.LOADING);
    else if (append) setLoadingMore(true);
    else setRefetching(true);

    try {
      const params = { page, limit: pageSize };
      Object.entries(JSON.parse(filtersKey)).forEach(([key, value]) => {
        if (value) params[key] = value;
      });
      if (q) params.q = q;
      const { data } = await api.get(endpoint, { params });
      if (!isCurrent()) return;
      setItems((prev) => (append ? [...prev, ...data.data] : data.data));
      setTotal(data.total);
      pageRef.current = page;
      hasLoadedRef.current = true;
      setStatus(LIBRARY_STATUS.READY);
    } catch (error) {
      if (!isCurrent()) return;
      const message = error.userMessage || translateError(error);
      if (hasLoadedRef.current) {
        showToast(message, 'error');
      } else {
        setLoadError(message);
        setStatus(LIBRARY_STATUS.ERROR);
      }
    } finally {
      if (isCurrent()) {
        setRefetching(false);
        setLoadingMore(false);
      }
    }
  }, [endpoint, filtersKey, q, pageSize, showToast]);

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  // Selection belongs to what is on screen: drop it when the query changes.
  useEffect(() => {
    setSelectedIds([]);
  }, [q, filtersKey]);

  const reload = useCallback(() => fetchPage(1), [fetchPage]);
  const loadMore = () => fetchPage(pageRef.current + 1, { append: true });

  const toggleSelect = (id) => {
    if (!items.some((item) => item.id === id && isSelectable(item))) return;
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const pageIds = items.filter(isSelectable).map((item) => item.id);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
  const toggleSelectAll = () => setSelectedIds(allSelected ? [] : pageIds);

  const deleteOne = ({ id, message, successMessage }) => {
    requestConfirm({
      message,
      confirmLabel: 'Excluir',
      onConfirm: async () => {
        await api.delete(`${endpoint}/${id}`);
        showToast(successMessage, 'success');
        await reload();
      },
    });
  };

  const deleteSelected = () => {
    const ids = selectedIds;
    requestConfirm({
      message: `Excluir ${pluralizeItems(ids.length)}? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      onConfirm: async () => {
        const res = await api.post(`${endpoint}/batch-delete`, { ids });
        showToast(`${res.data.deletedCount} itens excluídos.`, 'success');
        setSelectedIds([]);
        await reload();
      },
    });
  };

  return {
    items,
    total,
    status,
    loadError,
    refetching,
    loadingMore,
    searchInput,
    setSearchInput,
    q,
    selectedIds,
    allSelected,
    toggleSelect,
    toggleSelectAll,
    reload,
    loadMore,
    deleteOne,
    deleteSelected,
  };
};

export default useLibraryList;
