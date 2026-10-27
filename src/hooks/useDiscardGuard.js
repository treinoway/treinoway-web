import { useState, useCallback } from 'react';

const DISCARD_MESSAGE = 'Descartar alterações?';

// Guards closing a form overlay: asks for confirmation when `dirty`, closes directly otherwise.
const useDiscardGuard = (onClose, dirty) => {
  const [confirming, setConfirming] = useState(false);

  const requestClose = useCallback(() => {
    if (confirming) return;
    if (!dirty) {
      onClose();
      return;
    }
    setConfirming(true);
  }, [confirming, dirty, onClose]);

  const handleKeepEditing = useCallback(() => setConfirming(false), []);

  const handleDiscard = useCallback(() => {
    setConfirming(false);
    onClose();
  }, [onClose]);

  const dialogProps = confirming
    ? {
        message: DISCARD_MESSAGE,
        confirmLabel: 'Descartar',
        onConfirm: handleDiscard,
        onCancel: handleKeepEditing,
      }
    : null;

  return { requestClose, dialogProps };
};

export default useDiscardGuard;
