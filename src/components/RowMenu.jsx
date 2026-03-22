import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { MoreVertical } from 'lucide-react';

const RowMenu = ({ ariaLabel, onEdit, onDelete, deleteLabel = 'Excluir', extraItems = [] }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="row-menu" ref={menuRef}>
      <button
        type="button"
        className="row-menu-trigger"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <MoreVertical size={18} strokeWidth={1.6} />
      </button>
      {open && (
        <div className="row-menu-dropdown">
          {onEdit && (
            <button type="button" className="row-menu-item" onClick={() => { setOpen(false); onEdit(); }}>
              Editar
            </button>
          )}
          {extraItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`row-menu-item${item.danger ? ' row-menu-item--danger' : ''}`}
              onClick={() => { setOpen(false); item.onClick(); }}
            >
              {item.label}
            </button>
          ))}
          <button type="button" className="row-menu-item row-menu-item--danger" onClick={() => { setOpen(false); onDelete(); }}>
            {deleteLabel}
          </button>
        </div>
      )}
    </div>
  );
};

RowMenu.propTypes = {
  ariaLabel: PropTypes.string.isRequired,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func.isRequired,
  deleteLabel: PropTypes.string,
  extraItems: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired,
    danger: PropTypes.bool,
  })),
};

export default RowMenu;
