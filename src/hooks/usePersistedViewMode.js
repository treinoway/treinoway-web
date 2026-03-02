import { useState } from 'react';

const VALID_MODES = ['card', 'list'];
const DEFAULT_MODE = 'card';

export const VIEW_MODE_KEYS = {
  protocolTemplates: 'treinoway.protocolTemplatesView',
  trainingTemplates: 'treinoway.trainingTemplatesView',
  exerciseTemplates: 'treinoway.exerciseTemplatesView',
};

/**
 * Persists the user's card/list view preference in localStorage.
 * Returns the same [state, setter] API as useState.
 *
 * @param {string} storageKey - Key used in localStorage (use VIEW_MODE_KEYS constants).
 * @returns {[string, Function]} Tuple of [viewMode, setViewMode].
 */
const usePersistedViewMode = (storageKey) => {
  const [viewMode, setViewModeState] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return VALID_MODES.includes(stored) ? stored : DEFAULT_MODE;
    } catch {
      return DEFAULT_MODE;
    }
  });

  const setViewMode = (value) => {
    setViewModeState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      if (VALID_MODES.includes(next)) {
        try {
          localStorage.setItem(storageKey, next);
        } catch {
          // Storage quota exceeded or access denied; state still updates in memory
        }
      }
      return next;
    });
  };

  return [viewMode, setViewMode];
};

export default usePersistedViewMode;
