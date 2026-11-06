import PropTypes from 'prop-types';
import { X } from 'lucide-react';

// Non-modal, dismissible hint card with a down arrow and an optional title; position it via className on a positioned parent.
const Callout = ({ title, onClose, children, className = '', closeLabel = 'Fechar' }) => (
  <div className={`ds-callout${className ? ` ${className}` : ''}`} role="status">
    <div className="ds-callout__content">
      {title && <p className="ds-callout__title type-body-strong">{title}</p>}
      <div className={`ds-callout__body type-caption${title ? ' ds-callout__body--with-title' : ''}`}>{children}</div>
    </div>
    <button type="button" className="icon-button" aria-label={closeLabel} title={closeLabel} onClick={onClose}>
      <X size={20} strokeWidth={2} aria-hidden="true" />
    </button>
  </div>
);

Callout.propTypes = {
  title: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node,
  className: PropTypes.string,
  closeLabel: PropTypes.string,
};

export default Callout;
