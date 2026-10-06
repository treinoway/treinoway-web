import { useRef } from 'react';
import PropTypes from 'prop-types';
import useModalBehavior from './useModalBehavior';

/**
 * Confirm dialog (SKILL §4.16). `busy` keeps it open while the confirmed request
 * is in flight: both buttons are disabled, Escape/scrim do nothing and the
 * confirm button shows `busyLabel`.
 */
const ConfirmDialog = ({
  message,
  confirmLabel = 'Excluir',
  cancelLabel = 'Cancelar',
  confirmTone = 'danger',
  busy = false,
  busyLabel = 'Carregando...',
  onConfirm,
  onCancel,
}) => {
  const dialogRef = useRef(null);
  const handleCancel = () => {
    if (!busy) onCancel();
  };
  useModalBehavior(dialogRef, handleCancel);

  return (
    <div className="ds-overlay ds-overlay--center" onClick={handleCancel}>
      <div
        ref={dialogRef}
        className="ds-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-label={message}
        aria-busy={busy || undefined}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="ds-dialog__message type-body-lg">{message}</p>
        <div className="ds-actions">
          <button type="button" className="btn btn--secondary" onClick={handleCancel} disabled={busy}>{cancelLabel}</button>
          <button type="button" className={`btn btn--${confirmTone}`} onClick={onConfirm} disabled={busy}>
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

ConfirmDialog.propTypes = {
  message: PropTypes.string.isRequired,
  confirmLabel: PropTypes.string,
  cancelLabel: PropTypes.string,
  confirmTone: PropTypes.oneOf(['danger', 'primary']),
  busy: PropTypes.bool,
  busyLabel: PropTypes.string,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default ConfirmDialog;
