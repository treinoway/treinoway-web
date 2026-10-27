import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Plus } from 'lucide-react';
import ExerciseTemplateSearchPicker from './ExerciseTemplateSearchPicker';
import ExerciseRowCard from '../ExerciseRowCard';
import RowMenu from '../RowMenu';
import Badge from '../ds/Badge';
import { formatSnapshotSummary } from '../../utils/exerciseMeta';
import { findJunction } from '../../utils/trainingTemplateDraft';

const ExerciseRow = ({ id, junction, source, highlighted = false, onEdit, onRemove }) => {
  const rowRef = useRef(null);
  const name = junction?.name || junction?.exerciseTemplate?.name || source?.name || String(id);

  useEffect(() => {
    if (highlighted && typeof rowRef.current?.scrollIntoView === 'function') {
      rowRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [highlighted]);

  return (
    <div
      ref={rowRef}
      className={`training-template-exercise-row${highlighted ? ' training-template-exercise-row--just-added' : ''}`}
    >
      <ExerciseRowCard
        name={name}
        summary={junction ? formatSnapshotSummary(junction) : null}
        techniques={junction?.advancedTechniques}
        media={junction}
        emptyHint="Toque para definir séries, repetições e carga"
        sourceDeleted={!!junction && junction.exerciseTemplate == null}
        onClick={() => onEdit(id)}
        ariaLabel={`Editar exercício ${name}`}
      />
      <RowMenu ariaLabel={`Ações do exercício ${name}`} onDelete={() => onRemove(id)} deleteLabel="Remover" />
    </div>
  );
};

ExerciseRow.propTypes = {
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  junction: PropTypes.object,
  source: PropTypes.object,
  highlighted: PropTypes.bool,
  onEdit: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

/** "Exercícios do treino" section: searchable picker, ordered list, create-new shortcut. */
const TrainingTemplateExercises = ({
  exerciseIds,
  junctions,
  availableExercises,
  disabled = false,
  onAdd,
  onRemove,
  onEdit,
  onCreateNew,
}) => {
  const [lastAdded, setLastAdded] = useState(null);

  const handleAdd = (exercise) => {
    setLastAdded({ id: exercise.id, message: `${exercise.name} adicionado ao treino` });
    onAdd(exercise);
  };

  return (
    <section className="section-card editor-page__section" aria-labelledby="tt-exercises-heading">
      <div className="tt-exercises-header">
        <h2 id="tt-exercises-heading" className="editor-page__section-title type-h3">Exercícios do treino</h2>
        {exerciseIds.length > 0 && <Badge tone="brand" variant="tag">{exerciseIds.length}</Badge>}
      </div>

      <ExerciseTemplateSearchPicker
        initialExercises={availableExercises}
        addedIds={exerciseIds}
        disabled={disabled}
        onSelect={handleAdd}
      />

      <p className="visually-hidden" role="status">{lastAdded?.message}</p>

      {exerciseIds.length > 0 && (
        <div className="tt-exercise-list">
          {exerciseIds.map((id) => (
            <ExerciseRow
              key={id}
              id={id}
              junction={findJunction(junctions, id)}
              highlighted={lastAdded !== null && String(lastAdded.id) === String(id)}
              source={availableExercises.find((item) => String(item.id) === String(id))}
              onEdit={onEdit}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        className="btn btn--ghost editor-page__inline-action"
        onClick={onCreateNew}
        disabled={disabled}
        aria-label="Criar novo exercício"
      >
        <Plus size={16} strokeWidth={2} aria-hidden="true" />
        Criar novo exercício
      </button>
    </section>
  );
};

TrainingTemplateExercises.propTypes = {
  exerciseIds: PropTypes.array.isRequired,
  junctions: PropTypes.array.isRequired,
  availableExercises: PropTypes.array.isRequired,
  disabled: PropTypes.bool,
  onAdd: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onCreateNew: PropTypes.func.isRequired,
};

export default TrainingTemplateExercises;
