import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { MoreVertical } from 'lucide-react';

const RowMenu = ({
  ariaLabel,
  onEdit,
  onDelete,
  deleteLabel = 'Excluir',
  deleteDisabled = false,
  deleteDisabledTitle,
  extraItems = [],
  triggerDisabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleTriggerClick = (e) => {
    e.stopPropagation();
    setOpen((prev) => !prev);
  };

  const handleItemClick = (e, callback) => {
    e.stopPropagation();
    setOpen(false);
    // Park focus on the trigger so a sheet/dialog opened by the item can
    // return focus here when it closes.
    triggerRef.current?.focus();
    callback();
  };

  return (
    <div className="row-menu" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        className="row-menu-trigger"
        aria-label={ariaLabel}
        title={ariaLabel}
        aria-expanded={open}
        onClick={handleTriggerClick}
        disabled={triggerDisabled}
      >
        <MoreVertical size={20} strokeWidth={2} aria-hidden="true" />
      </button>
      {open && (
        <div className="row-menu-dropdown">
          {onEdit && (
            <button type="button" className="row-menu-item" onClick={(e) => handleItemClick(e, onEdit)}>
              Editar
            </button>
          )}
          {extraItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`row-menu-item${item.danger ? ' row-menu-item--danger' : ''}`}
              onClick={(e) => handleItemClick(e, item.onClick)}
              disabled={item.disabled}
            >
              {item.label}
            </button>
          ))}
          {typeof onDelete === 'function' && (
            <button
              type="button"
              className="row-menu-item row-menu-item--danger"
              onClick={(e) => handleItemClick(e, onDelete)}
              disabled={deleteDisabled}
              title={deleteDisabled ? deleteDisabledTitle : undefined}
            >
              {deleteLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

RowMenu.propTypes = {
  ariaLabel: PropTypes.string.isRequired,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  deleteLabel: PropTypes.string,
  deleteDisabled: PropTypes.bool,
  deleteDisabledTitle: PropTypes.string,
  extraItems: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired,
    danger: PropTypes.bool,
    disabled: PropTypes.bool,
  })),
  triggerDisabled: PropTypes.bool,
};

export default RowMenu;
