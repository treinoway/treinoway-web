import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useHistoryBackGuard from './useHistoryBackGuard';
import useInternalLinkGuard from './useInternalLinkGuard';
import { t } from '../i18n';

// While `isDirty`, asks before the trainer leaves by closing the tab, an in-app link or browser Back; returns `leaveTo(path)` for the page's own exits
const useUnsavedChangesGuard = (isDirty, requestConfirm) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isDirty) return undefined;
    const warnBeforeUnload = (event) => event.preventDefault();
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [isDirty]);

  const confirmLeave = useCallback((proceed) => {
    requestConfirm({
      message: t('studentFeedback.unsaved.confirm'),
      confirmLabel: t('studentFeedback.unsaved.discard'),
      busyLabel: t('studentFeedback.unsaved.leaving'),
      onConfirm: proceed,
    });
  }, [requestConfirm]);

  const leaveTo = useCallback((path) => {
    if (!isDirty) {
      navigate(path);
      return;
    }
    confirmLeave(() => navigate(path));
  }, [isDirty, navigate, confirmLeave]);

  useInternalLinkGuard(isDirty, leaveTo);
  useHistoryBackGuard(isDirty, confirmLeave);

  return leaveTo;
};

export default useUnsavedChangesGuard;
