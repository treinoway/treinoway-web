import { useId, useRef } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import useModalBehavior from './useModalBehavior';

// Non-blocking floating card: bottom sheet below 768px, card anchored to its positioned parent above.
const Popover = ({ title, onClose, children, footer, className = '', closeLabel = 'Fechar' }) => {
  const titleId = useId();
  const popoverRef = useRef(null);
  useModalBehavior(popoverRef, onClose);

  return (
    <div
      ref={popoverRef}
      className={`ds-popover${className ? ` ${className}` : ''}`}
      role="dialog"
      aria-labelledby={titleId}
      tabIndex={-1}
    >
      <div className="ds-popover__header">
        <h2 id={titleId} className="ds-popover__title type-body-strong">{title}</h2>
        <button type="button" className="icon-button" aria-label={closeLabel} title={closeLabel} onClick={onClose}>
          <X size={20} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
      <div className="ds-popover__body">{children}</div>
      {footer && <div className="ds-popover__footer">{footer}</div>}
    </div>
  );
};

Popover.propTypes = {
  title: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node,
  footer: PropTypes.node,
  className: PropTypes.string,
  closeLabel: PropTypes.string,
};

export default Popover;
