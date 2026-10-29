import { useState, useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';
import { translateError } from '../i18n';

/**
 * Drives a `ds/ConfirmDialog`. `requestConfirm({ message, onConfirm, confirmLabel?, confirmTone?, busyLabel? })`
 * opens it; the dialog stays open (busy) while `onConfirm` runs and closes afterwards.
 * A rejected `onConfirm` surfaces as an error toast.
 *
 * Returns `dialogProps` (null while closed) to spread into `<ConfirmDialog />`.
 */
const useConfirmDialog = () => {
  const { showToast } = useToast();
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);

  const requestConfirm = useCallback((config) => setPending(config), []);
  const handleCancel = useCallback(() => setPending(null), []);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await pending.onConfirm();
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  const dialogProps = pending
    ? {
        message: pending.message,
        confirmLabel: pending.confirmLabel,
        confirmTone: pending.confirmTone,
        busyLabel: pending.busyLabel ?? 'Excluindo…',
        busy,
        onConfirm: handleConfirm,
        onCancel: handleCancel,
      }
    : null;

  return { dialogProps, requestConfirm };
};

export default useConfirmDialog;
