import { useId, useRef } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import useModalBehavior from './useModalBehavior';

const Modal = ({ title, eyebrow, onClose, children, footer, wide = false, closeDisabled = false, closeLabel = 'Fechar' }) => {
  const titleId = useId();
  const dialogRef = useRef(null);
  useModalBehavior(dialogRef, onClose);

  return (
    <div className="ds-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className={`ds-modal${wide ? ' ds-modal--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ds-modal__header">
          <div className="ds-modal__heading">
            {eyebrow && <span className="ds-modal__eyebrow type-caption">{eyebrow}</span>}
            <h2 id={titleId} className="ds-modal__title type-h3">{title}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label={closeLabel}
            title={closeLabel}
            disabled={closeDisabled}
            onClick={onClose}
          >
            <X size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        <div className="ds-modal__body">{children}</div>
        {footer && <div className="ds-modal__footer">{footer}</div>}
      </div>
    </div>
  );
};

Modal.propTypes = {
  title: PropTypes.string.isRequired,
  eyebrow: PropTypes.string,
  closeDisabled: PropTypes.bool,
  closeLabel: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node,
  footer: PropTypes.node,
  wide: PropTypes.bool,
};

export default Modal;
