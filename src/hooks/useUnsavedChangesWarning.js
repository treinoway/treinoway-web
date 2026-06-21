import { useEffect } from 'react';

/**
 * useUnsavedChangesWarning
 *
 * Registers a `beforeunload` handler that triggers the native browser
 * confirmation prompt when the user tries to close or reload the window
 * while there are unsaved changes.
 *
 * The handler is registered only while `isDirty` is true and automatically
 * cleaned up when `isDirty` becomes false or the component unmounts.
 *
 * @param {boolean} isDirty - Whether there are unsaved in-memory changes.
 */
const useUnsavedChangesWarning = (isDirty) => {
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      // Modern browsers ignore the returnValue string but still require it to
      // be set to trigger the prompt.
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);
};

export default useUnsavedChangesWarning;
