import { useState, useEffect } from 'react';

const STORAGE_KEY = 'treinoway.activeMode';
const VALID_MODES = ['trainer', 'nutritionist'];
const DEFAULT_MODE = 'trainer';

const readStoredMode = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return VALID_MODES.includes(stored) ? stored : DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
};

const writeStoredMode = (mode) => {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Storage unavailable — state still updates in memory
  }
};

/**
 * Persists the user's active role mode (trainer | nutritionist) in localStorage.
 * Listens for `storage` events so changes in one tab propagate to others.
 *
 * @returns {[string, Function]} Tuple of [activeMode, setActiveMode].
 */
const useActiveMode = () => {
  const [activeMode, setActiveModeState] = useState(readStoredMode);

  const setActiveMode = (mode) => {
    if (!VALID_MODES.includes(mode)) return;
    writeStoredMode(mode);
    setActiveModeState(mode);
  };

  // Sync across tabs via storage events
  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== STORAGE_KEY) return;
      const next = VALID_MODES.includes(event.newValue) ? event.newValue : DEFAULT_MODE;
      setActiveModeState(next);
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return [activeMode, setActiveMode];
};

export default useActiveMode;
