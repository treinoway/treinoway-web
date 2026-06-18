import PropTypes from 'prop-types';
import { Trash2 } from 'lucide-react';

/**
 * LibraryBatchBar — slim selection toolbar that sits flush above a LibraryList.
 * Reads as part of the list (not a detached card): a select-all/clear text
 * toggle on the left, and a contextual count + delete action on the right that
 * appear only when at least one row is selected.
 *
 * The select-all affordance is a text BUTTON (not a checkbox): in this
 * contextual toolbar a lone checkbox has weak semantics — it is not the header
 * of a checkbox column. The button flips its label by selection state and the
 * count conveys partial selection, so no indeterminate state is needed.
 *
 * Props:
 *  - allSelected (bool)        — whether every row on the page is selected
 *  - selectedCount (number)    — number of currently selected rows
 *  - onToggleSelectAll (func)  — selects all when none/some are selected, clears when all are
 *  - onDelete (func)           — triggers the bulk delete flow
 */
const LibraryBatchBar = ({
  allSelected,
  selectedCount,
  onToggleSelectAll,
  onDelete,
}) => {
  const hasSelection = selectedCount > 0;
  const toggleLabel = hasSelection || allSelected ? 'Limpar seleção' : 'Selecionar todos';

  return (
    <div className="library-batch-bar">
      <button
        type="button"
        className="library-batch-bar-select"
        onClick={onToggleSelectAll}
        aria-pressed={allSelected}
      >
        {toggleLabel}
      </button>

      {hasSelection && (
        <div className="library-batch-bar-actions">
          <span className="library-batch-bar-count">
            {selectedCount} selecionado{selectedCount === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            className="library-batch-bar-delete"
            onClick={onDelete}
          >
            <Trash2 size={15} strokeWidth={2} aria-hidden="true" />
            Excluir selecionados
          </button>
        </div>
      )}
    </div>
  );
};

LibraryBatchBar.propTypes = {
  allSelected: PropTypes.bool.isRequired,
  selectedCount: PropTypes.number.isRequired,
  onToggleSelectAll: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default LibraryBatchBar;
