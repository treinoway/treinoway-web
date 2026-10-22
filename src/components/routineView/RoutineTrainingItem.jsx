import PropTypes from 'prop-types';
import { ChevronDown } from 'lucide-react';
import Badge from '../ds/Badge';
import DurationLabel from '../DurationLabel';
import { getWeekDayLabel } from '../../constants/weekDays';
import { formatExerciseMeta } from '../../utils/exerciseMeta';

const PREVIEW_LIMIT = 3;

const buildPreview = (exercises) => {
  if (exercises.length === 0) return null;
  const names = exercises.slice(0, PREVIEW_LIMIT).map((exercise) => exercise.name).join(' · ');
  const extra = exercises.length - PREVIEW_LIMIT;
  return extra > 0 ? `${names} · +${extra}` : names;
};

const ExerciseList = ({ exercises }) => {
  if (exercises.length === 0) {
    return <p className="type-body routine-training__empty">Nenhum exercício cadastrado.</p>;
  }
  return (
    <ul className="routine-exercises">
      {exercises.map((exercise) => {
        const meta = formatExerciseMeta(exercise);
        return (
          <li key={exercise.id} className="routine-exercise">
            <span className="type-body-strong">{exercise.name}</span>
            {meta && <span className="type-caption routine-exercise__meta">{meta}</span>}
            {exercise.notes && <p className="type-caption routine-exercise__meta">{exercise.notes}</p>}
          </li>
        );
      })}
    </ul>
  );
};

ExerciseList.propTypes = { exercises: PropTypes.array.isRequired };

/** One training of the routine: accordion header (§4.13) + its exercises. */
const RoutineTrainingItem = ({ training, exercises, open, onToggle }) => {
  const panelId = `routine-training-panel-${training.id}`;
  const preview = buildPreview(exercises);

  return (
    <li className={`routine-training${open ? ' routine-training--open' : ''}`}>
      <h3 className="routine-training__heading">
        <button
          type="button"
          className="routine-training__toggle"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={`Treino ${training.name}`}
          onClick={() => onToggle(training.id)}
        >
          <span className="routine-training__index type-caption-strong">{training.order}</span>
          <span className="routine-training__summary">
            <span className="routine-training__title type-body-lg-strong">{training.name}</span>
            <span className="routine-training__meta type-caption">
              {exercises.length} {exercises.length === 1 ? 'exercício' : 'exercícios'}
            </span>
            {!open && preview && <span className="routine-training__preview type-caption">{preview}</span>}
          </span>
          <span className="routine-training__side">
            <Badge variant="tag" tone={training.weekDay ? 'brand' : 'neutral'}>
              {training.weekDay ? getWeekDayLabel(training.weekDay) : 'Livre'}
            </Badge>
            <DurationLabel seconds={training.estimatedDurationSeconds} variant="inline" />
            <ChevronDown size={20} strokeWidth={2} className="routine-training__chevron" aria-hidden="true" />
          </span>
        </button>
      </h3>
      <div id={panelId} className="routine-training__panel" hidden={!open}>
        <ExerciseList exercises={exercises} />
      </div>
    </li>
  );
};

RoutineTrainingItem.propTypes = {
  training: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    order: PropTypes.number,
    weekDay: PropTypes.string,
    estimatedDurationSeconds: PropTypes.number,
  }).isRequired,
  exercises: PropTypes.array.isRequired,
  open: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
};

export default RoutineTrainingItem;
