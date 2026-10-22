import { useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';
import { translateError } from '../i18n';
import { isStudentLinksConflict } from '../utils/anamnesisEditor';

/**
 * Returns `reportError(error)`: a student-links conflict (409) opens the fork dialog through
 * `onConflict`; any other failure becomes an error toast.
 */
const useAnamnesisMutationError = (onConflict) => {
  const { showToast } = useToast();
  return useCallback((error) => {
    if (isStudentLinksConflict(error)) {
      onConflict();
      return;
    }
    showToast(error.userMessage || translateError(error), 'error');
  }, [onConflict, showToast]);
};

export default useAnamnesisMutationError;
