import PropTypes from 'prop-types';
import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import { ChevronDown, ChevronUp, GripVertical, X } from 'lucide-react';

// Square icon-only action of a technique row (move / remove).
const RowAction = ({ label, icon: Icon, disabled, onClick }) => (
  <button type="button" className="technique-row__action" aria-label={label} disabled={disabled} onClick={onClick}>
    <Icon size={16} strokeWidth={2} aria-hidden="true" />
  </button>
);

RowAction.propTypes = {
  label: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  disabled: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
};

// One ordered technique: drag handle, position, name, up/down and remove.
const TechniqueRow = ({ technique, index, total, disabled, onMove, onRemove }) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: technique.id,
    disabled: disabled || total < 2,
  });
  const style = {
    transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
    transition,
    zIndex: isDragging ? 'var(--z-dropdown)' : undefined,
  };

  return (
    <li ref={setNodeRef} style={style} className={`technique-row${isDragging ? ' technique-row--dragging' : ''}`}>
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="exercise-drag-handle"
        aria-label={`Arrastar ${technique.name}`}
        disabled={disabled || total < 2}
        {...attributes}
        {...listeners}
      >
        <GripVertical size={16} strokeWidth={2} aria-hidden="true" />
      </button>
      <span className="technique-row__order type-caption-strong" aria-hidden="true">{index + 1}</span>
      <span className="technique-row__name type-body-strong">
        {technique.name}
        {technique.isDeleted && (
          <>
            {' '}
            <span className="badge badge--tag badge--warning">Excluída</span>
            <span className="technique-row__hint type-caption">Técnica excluída da biblioteca — será removida ao salvar.</span>
          </>
        )}
      </span>
      <RowAction label={`Mover ${technique.name} para cima`} icon={ChevronUp} disabled={disabled || index === 0} onClick={() => onMove(index, index - 1)} />
      <RowAction label={`Mover ${technique.name} para baixo`} icon={ChevronDown} disabled={disabled || index === total - 1} onClick={() => onMove(index, index + 1)} />
      <RowAction label={`Remover ${technique.name}`} icon={X} disabled={disabled} onClick={() => onRemove(technique.id)} />
    </li>
  );
};

TechniqueRow.propTypes = {
  technique: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  disabled: PropTypes.bool,
  onMove: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

/** Ordered list of the picked techniques (execution order = list order): drag, up/down and remove. */
const SelectedTechniquesList = ({ value, disabled = false, onChange }) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = value.map((technique) => technique.id);

  const handleMove = (from, to) => onChange(arrayMove(value, from, to));
  const handleRemove = (id) => onChange(value.filter((technique) => technique.id !== id));

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    handleMove(ids.indexOf(active.id), ids.indexOf(over.id));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis, restrictToParentElement]} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ol className="technique-list" aria-label="Técnicas selecionadas">
          {value.map((technique, index) => (
            <TechniqueRow
              key={technique.id}
              technique={technique}
              index={index}
              total={value.length}
              disabled={disabled}
              onMove={handleMove}
              onRemove={handleRemove}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
};

SelectedTechniquesList.propTypes = {
  value: PropTypes.arrayOf(PropTypes.object).isRequired,
  disabled: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
};

export default SelectedTechniquesList;
