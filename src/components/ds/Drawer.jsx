import { useId, useRef } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import useModalBehavior from './useModalBehavior';

// Dialog with a scrollable body and a sticky footer: layout 'side' is a right panel and 'modal' a centred dialog at >=1024px, both a bottom sheet below that.
const Drawer = ({ title, onClose, children, footer, busy = false, layout = 'side', returnFocusSelector, closeLabel = 'Fechar' }) => {
  const titleId = useId();
  const dialogRef = useRef(null);
  const handleClose = () => {
    if (!busy) onClose();
  };
  useModalBehavior(dialogRef, handleClose, { returnFocusSelector });

  return (
    <div className={`ds-overlay ds-drawer-overlay ds-drawer-overlay--${layout}`} onClick={handleClose}>
      <div
        ref={dialogRef}
        className="ds-drawer"
        data-layout={layout}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ds-drawer__header">
          <h2 id={titleId} className="ds-drawer__title type-h3">{title}</h2>
          <button
            type="button"
            className="icon-button"
            aria-label={closeLabel}
            title={closeLabel}
            disabled={busy}
            onClick={handleClose}
          >
            <X size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        <div className="ds-drawer__body" role="region" aria-labelledby={titleId}>{children}</div>
        {footer && <div className="ds-drawer__footer">{footer}</div>}
      </div>
    </div>
  );
};

Drawer.propTypes = {
  title: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node,
  footer: PropTypes.node,
  busy: PropTypes.bool,
  layout: PropTypes.oneOf(['modal', 'side']),
  returnFocusSelector: PropTypes.string,
  closeLabel: PropTypes.string,
};

export default Drawer;
