import { useState, useCallback } from 'react';

/** Page state that falls back to page 1 whenever `resetKey` (the active filters) changes. */
const useResettablePage = (resetKey) => {
  const [state, setState] = useState({ resetKey, page: 1 });
  const page = state.resetKey === resetKey ? state.page : 1;
  const setPage = useCallback((next) => setState({ resetKey, page: next }), [resetKey]);
  return [page, setPage];
};

export default useResettablePage;
