import { useId, useState } from 'react';
import PropTypes from 'prop-types';
import { ChevronDown } from 'lucide-react';
import Badge from './ds/Badge';
import SessionSetsTable from './SessionSetsTable';
import { formatRepetitions } from '../utils/exerciseMeta';

/**
 * Compute total volume (kg) from completed set logs.
 * Volume = Σ (load × repetitions) for completed sets.
 */
const computeVolume = (setLogs) => {
  const total = setLogs.reduce((acc, s) => {
    if (s.completed && s.load != null && s.repetitions != null) {
      return acc + s.load * s.repetitions;
    }
    return acc;
  }, 0);
  return Math.round(total);
};

/**
 * Determine whether an exercise log should be treated as skipped.
 * Skipped when: exerciseLog.status === 'skipped'
 *   OR every set log has completed === false (and there is at least one).
 */
const isExerciseSkipped = (exerciseLog) => {
  if (exerciseLog.status === 'skipped') return true;
  const sets = exerciseLog.setLogs ?? [];
  return sets.length > 0 && sets.every((s) => !s.completed);
};

const buildMetaText = (exercise, skipped) => {
  const sets = exercise.sets ?? null;
  const repsLabel = formatRepetitions(exercise.repetitions);
  const setsLabel = sets != null ? `${sets} ${skipped ? 'séries planejadas' : 'séries'}` : null;
  const repsText = repsLabel ? `${repsLabel} reps` : null;
  const prescription = [setsLabel, repsText].filter(Boolean).join(' × ');
  const rest = exercise.restInterval != null ? `desc. ${exercise.restInterval}s` : null;
  return [prescription, rest].filter(Boolean).join(' · ');
};

/**
 * Collapsible exercise row (Accordion, DS §4.13) shown inside SessionDetail.
 *
 * @param {object}  props
 * @param {number}  props.index        - 1-based display index
 * @param {object}  props.exerciseLog  - Full exerciseLog object from API
 * @param {string}  props.replacedExerciseName - Principal name when the student swapped it for this exercise
 * @param {boolean} props.defaultOpen  - Whether to start expanded (default false)
 */
const SessionExerciseCard = ({ index, exerciseLog, replacedExerciseName, defaultOpen }) => {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const bodyId = useId();

  const exercise = exerciseLog.exercise ?? {};
  const setLogs = exerciseLog.setLogs ?? [];
  const skipped = isExerciseSkipped(exerciseLog);
  const volume = skipped ? 0 : computeVolume(setLogs);
  const metaText = buildMetaText(exercise, skipped);
  const skipNote = exerciseLog.notes ?? null;

  return (
    <div className="accordion session-exercise">
      <button
        type="button"
        className="accordion-header"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={bodyId}
        aria-label={`${open ? 'Recolher' : 'Expandir'} exercício ${exercise.name ?? index}`}
      >
        <span className="accordion-index type-caption-strong" aria-hidden="true">{index}</span>

        <span className="accordion-heading session-exercise__heading">
          <span className="accordion-title type-body-lg">{exercise.name ?? '-'}</span>
          {replacedExerciseName && <Badge tone="brand" variant="tag">Substituto</Badge>}
          {replacedExerciseName && (
            <span className="accordion-meta type-caption">no lugar de {replacedExerciseName}</span>
          )}
          {metaText && <span className="accordion-meta type-caption">{metaText}</span>}
        </span>

        {skipped ? (
          <Badge tone="neutral" variant="tag">Pulado</Badge>
        ) : (
          <span className="type-body-lg session-exercise__volume">
            {volume.toLocaleString('pt-BR')} kg
          </span>
        )}

        <ChevronDown size={20} strokeWidth={2} className="accordion-chevron" aria-hidden="true" />
      </button>

      {open && (
        <div id={bodyId} className="accordion-body">
          {skipped ? (
            <div className="session-exercise__skip-note type-body">
              <span className="type-caption-strong session-exercise__skip-label">
                Motivo · anotação do aluno
              </span>
              {skipNote ?? 'Exercício pulado sem motivo registrado.'}
            </div>
          ) : (
            <SessionSetsTable setLogs={setLogs} />
          )}
        </div>
      )}
    </div>
  );
};

SessionExerciseCard.propTypes = {
  index: PropTypes.number.isRequired,
  exerciseLog: PropTypes.shape({
    id: PropTypes.string.isRequired,
    status: PropTypes.string,
    notes: PropTypes.string,
    exercise: PropTypes.shape({
      name: PropTypes.string,
      sets: PropTypes.number,
      repetitions: PropTypes.object,
      restInterval: PropTypes.number,
    }),
    setLogs: PropTypes.array,
  }).isRequired,
  replacedExerciseName: PropTypes.string,
  defaultOpen: PropTypes.bool,
};

export default SessionExerciseCard;
