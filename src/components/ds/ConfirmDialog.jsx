import { useRef } from 'react';
import PropTypes from 'prop-types';
import useModalBehavior from './useModalBehavior';

const ConfirmDialog = ({ message, confirmLabel = 'Excluir', cancelLabel = 'Cancelar', confirmTone = 'danger', onConfirm, onCancel }) => {
  const dialogRef = useRef(null);
  useModalBehavior(dialogRef, onCancel);

  return (
    <div className="ds-overlay ds-overlay--center" onClick={onCancel}>
      <div
        ref={dialogRef}
        className="ds-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-label={message}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="ds-dialog__message type-body-lg">{message}</p>
        <div className="ds-actions">
          <button type="button" className="btn btn--secondary" onClick={onCancel}>{cancelLabel}</button>
          <button type="button" className={`btn btn--${confirmTone}`} onClick={onConfirm}>{confirmLabel}</button>
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
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default ConfirmDialog;
