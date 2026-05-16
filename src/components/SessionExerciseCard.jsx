import { useState } from 'react';
import PropTypes from 'prop-types';
import { ChevronDown, X } from 'lucide-react';
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

/**
 * Collapsible exercise card shown inside SessionDetail.
 *
 * @param {object}  props
 * @param {number}  props.index        - 1-based display index
 * @param {object}  props.exerciseLog  - Full exerciseLog object from API
 * @param {boolean} props.defaultOpen  - Whether to start expanded (default false)
 */
const SessionExerciseCard = ({ index, exerciseLog, defaultOpen }) => {
  const [open, setOpen] = useState(defaultOpen ?? false);

  const exercise = exerciseLog.exercise ?? {};
  const setLogs = exerciseLog.setLogs ?? [];
  const skipped = isExerciseSkipped(exerciseLog);
  const volume = skipped ? 0 : computeVolume(setLogs);

  const sets = exercise.sets ?? null;
  const repsLabel = formatRepetitions(exercise.repetitions);
  const rest = exercise.restInterval ?? null;

  const metaParts = [];
  if (sets != null) {
    const label = skipped ? `${sets} séries planejadas` : `${sets} séries`;
    metaParts.push(label);
  }
  if (repsLabel) metaParts.push(`${repsLabel} reps`);
  const metaText = metaParts.join(' · ');
  const restText = rest != null ? `desc. ${rest}s` : null;

  const skipNote = exerciseLog.notes ?? null;

  return (
    <div className={`exercise-card${open ? ' exercise-card--open' : ''}${skipped ? ' exercise-card--skipped' : ''}`}>
      <button
        type="button"
        className="exercise-card-header"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label={`${open ? 'Recolher' : 'Expandir'} exercício ${exercise.name ?? index}`}
      >
        <span className="exercise-card-index" aria-hidden="true">{index}</span>

        <div className="exercise-card-body">
          <div className="exercise-card-name">{exercise.name ?? '—'}</div>
          <div className="exercise-card-meta">
            {metaText}
            {restText && (
              <>
                <span className="exercise-card-meta-sep" aria-hidden="true">·</span>
                {restText}
              </>
            )}
          </div>
        </div>

        {skipped ? (
          <span className="exercise-card-status">
            <X size={12} strokeWidth={2} aria-hidden="true" />
            Pulado
          </span>
        ) : (
          <div className="exercise-card-stat">
            <span className="exercise-card-stat-label">Volume</span>
            <span className="exercise-card-stat-value">
              {volume.toLocaleString('pt-BR')}
              <span className="exercise-card-stat-unit">kg</span>
            </span>
          </div>
        )}

        <ChevronDown
          size={18}
          strokeWidth={2}
          className="exercise-card-chevron"
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="exercise-card-body-detail">
          {skipped ? (
            <div className="exercise-card-skip-note">
              <span className="exercise-card-skip-note-label">Motivo · anotação do aluno</span>
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
  defaultOpen: PropTypes.bool,
};

export default SessionExerciseCard;
