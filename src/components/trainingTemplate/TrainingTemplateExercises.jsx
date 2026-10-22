import PropTypes from 'prop-types';
import { Plus } from 'lucide-react';
import ExerciseTemplateSearchPicker from './ExerciseTemplateSearchPicker';
import ExerciseRowCard from '../ExerciseRowCard';
import RowMenu from '../RowMenu';
import { formatSnapshotSummary } from '../../utils/exerciseMeta';
import { findJunction } from '../../utils/trainingTemplateDraft';

const ExerciseRow = ({ id, junction, source, onEdit, onRemove }) => {
  const name = junction?.name || junction?.exerciseTemplate?.name || source?.name || String(id);
  return (
    <div className="training-template-exercise-row">
      <ExerciseRowCard
        name={name}
        summary={junction ? formatSnapshotSummary(junction) : null}
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
  return (
    <section className="section-card editor-page__section" aria-labelledby="tt-exercises-heading">
      <h2 id="tt-exercises-heading" className="editor-page__section-title type-h3">Exercícios do treino</h2>

      <ExerciseTemplateSearchPicker
        initialExercises={availableExercises}
        addedIds={exerciseIds}
        disabled={disabled}
        onSelect={onAdd}
      />

      {exerciseIds.length > 0 && (
        <div className="tt-exercise-list">
          {exerciseIds.map((id) => (
            <ExerciseRow
              key={id}
              id={id}
              junction={findJunction(junctions, id)}
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
