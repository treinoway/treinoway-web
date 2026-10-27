import { useState, useCallback } from 'react';

const STORAGE_KEY = 'routineEditor.formLayout';
const VALID_LAYOUTS = ['modal', 'side'];
const DEFAULT_LAYOUT = 'modal';

// Reads the stored layout; any storage failure or invalid value yields the default.
const readStoredLayout = () => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return VALID_LAYOUTS.includes(stored) ? stored : DEFAULT_LAYOUT;
  } catch {
    return DEFAULT_LAYOUT;
  }
};

// Persists the layout; storage failures are ignored because the in-memory state still applies.
const storeLayout = (layout) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, layout);
  } catch {
    // why: private mode or blocked storage must not break the editor; the choice lives in memory only
  }
};

// User preference for how routine forms open: "modal" (default) or "side" panel.
const useFormLayoutPreference = () => {
  const [layout, setLayoutState] = useState(readStoredLayout);

  const setLayout = useCallback((next) => {
    if (!VALID_LAYOUTS.includes(next)) return;
    setLayoutState(next);
    storeLayout(next);
  }, []);

  return [layout, setLayout];
};

export default useFormLayoutPreference;
