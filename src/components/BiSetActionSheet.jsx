import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import { t } from '../i18n';

/**
 * Bottom-sheet action menu shown when the trainer taps a `BiSetBadge`.
 * Offers entries to dissolve the group or edit the order of its members.
 *
 * Pure presentational component — the parent owns the open/close state and
 * supplies the action callbacks.
 */
const BiSetActionSheet = ({ open, onDissolve, onEditOrder, onClose }) => {
  if (!open) return null;

  const title = t('exerciseGroup.biset') || 'Bi-set';

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="bottom-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="bottom-sheet-header">
          <h2 className="bottom-sheet-title">{title}</h2>
          <button
            type="button"
            className="bottom-sheet-close"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>
        <div className="bottom-sheet-body biset-action-sheet-body">
          <button
            type="button"
            className="biset-action-sheet-item biset-action-sheet-item--danger"
            onClick={onDissolve}
          >
            {t('exerciseGroup.dissolveBiset') || 'Desfazer bi-set'}
          </button>
          {onEditOrder && (
            <button
              type="button"
              className="biset-action-sheet-item"
              onClick={onEditOrder}
            >
              Editar ordem dos membros
            </button>
          )}
          <button
            type="button"
            className="biset-action-sheet-item biset-action-sheet-item--cancel"
            onClick={onClose}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

BiSetActionSheet.propTypes = {
  open: PropTypes.bool.isRequired,
  onDissolve: PropTypes.func.isRequired,
  onEditOrder: PropTypes.func,
  onClose: PropTypes.func.isRequired,
};

export default BiSetActionSheet;
