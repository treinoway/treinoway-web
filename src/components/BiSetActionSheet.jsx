import PropTypes from 'prop-types';
import Modal from './ds/Modal';
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
    <Modal title={title} onClose={onClose}>
      <div className="biset-action-sheet-body">
        <button type="button" className="row-menu-item row-menu-item--danger" onClick={onDissolve}>
          {t('exerciseGroup.dissolveBiset') || 'Desfazer bi-set'}
        </button>
        {onEditOrder && (
          <button type="button" className="row-menu-item" onClick={onEditOrder}>
            Editar ordem dos membros
          </button>
        )}
        <button type="button" className="row-menu-item" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </Modal>
  );
};

BiSetActionSheet.propTypes = {
  open: PropTypes.bool.isRequired,
  onDissolve: PropTypes.func.isRequired,
  onEditOrder: PropTypes.func,
  onClose: PropTypes.func.isRequired,
};

export default BiSetActionSheet;
