import PropTypes from 'prop-types';
import { ChevronRight } from 'lucide-react';
import { WEEK_DAY_OPTIONS_SHORT } from '../constants/weekDays';
import Badge from './ds/Badge';

const TRAINING_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const getWeekDayShortLabel = (value) => {
  if (!value) return null;
  const found = WEEK_DAY_OPTIONS_SHORT.find(
    (o) => o.value === value.toLowerCase()
  );
  return found ? found.label : value;
};

const computeReadiness = (exercises) => {
  if (!exercises || exercises.length === 0) return { tone: 'neutral', label: 'Vazio' };
  if (exercises.length < 3) return { tone: 'warning', label: 'Parcial' };
  return { tone: 'success', label: 'Pronto' };
};

const formatExerciseStat = (ex) => {
  const sets = ex.sets;
  const reps = ex.repetitions;
  if (!sets) return null;
  if (reps) {
    const repsStr =
      reps.min === reps.max ? String(reps.min) : `${reps.min}–${reps.max}`;
    return `${sets}×${repsStr}`;
  }
  if (ex.duration) return `${sets}×${ex.duration}s`;
  return String(sets);
};

const formatExerciseMeta = (ex) => {
  const parts = [];
  if (ex.suggestedLoad != null && ex.hasLoad) parts.push(`${ex.suggestedLoad}kg`);
  if (ex.restInterval && ex.restInterval > 0) {
    const secs = ex.restInterval;
    if (secs < 60) parts.push(`${secs}s`);
    else {
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      parts.push(s === 0 ? `${m}min` : `${m}min ${s}s`);
    }
  }
  return parts.length ? parts.join(' · ') : null;
};

const RoutineSummarySheetItem = ({
  training,
  index,
  onJumpToTraining,
  onJumpToExercise,
}) => {
  const exercises = training.exercises || [];
  const letter = TRAINING_LETTERS[index] || String(index + 1);
  const readiness = computeReadiness(exercises);
  const weekDayLabel = getWeekDayShortLabel(training.weekDay);
  const exerciseCount = exercises.length;

  const countLabel =
    exerciseCount === 1 ? '1 ex' : `${exerciseCount} ex`;

  return (
    <div className="routine-summary-peek-item">
      <div className="routine-summary-peek-head">
        <span className="accordion-index type-caption-strong" aria-hidden="true">
          {letter}
        </span>
        <span className="routine-summary-peek-title type-body-strong">
          {training.name || '—'}
        </span>
        <span
          className={`badge badge--tag ${weekDayLabel ? 'badge--brand' : 'badge--neutral'}`}
          aria-label={`Dia: ${weekDayLabel || 'Sem dia'}`}
        >
          {weekDayLabel || 'Sem dia'}
        </span>
        <Badge variant="tag" tone={readiness.tone}>{readiness.label}</Badge>
        <span className="routine-summary-peek-count type-caption">{countLabel}</span>
        <button
          type="button"
          className="icon-button"
          aria-label={`Ir para ${training.name || 'treino'}`}
          title={`Ir para ${training.name || 'treino'}`}
          onClick={() => onJumpToTraining(training.id)}
        >
          <ChevronRight size={20} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      {exerciseCount > 0 ? (
        <div className="routine-summary-peek-exercises">
          {exercises.map((ex) => {
            const exData = ex.exerciseTemplate || ex;
            const name = exData.name || ex.name || '—';
            const stat = formatExerciseStat(exData);
            const meta = formatExerciseMeta(exData);

            return (
              <div
                key={ex.id}
                className="routine-summary-peek-exercise"
                role="button"
                tabIndex={0}
                aria-label={`Ir para exercício ${name}`}
                onClick={() => onJumpToExercise(training.id, ex.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onJumpToExercise(training.id, ex.id);
                  }
                }}
              >
                <span className="routine-summary-peek-exercise-stat type-caption-strong">
                  {stat || '—'}
                </span>
                <span className="routine-summary-peek-exercise-name type-body">{name}</span>
                {meta && (
                  <span className="routine-summary-peek-exercise-meta type-caption">{meta}</span>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="routine-summary-peek-empty type-caption" aria-label="Nenhum exercício adicionado.">
          Nenhum exercício adicionado.
        </div>
      )}
    </div>
  );
};

RoutineSummarySheetItem.propTypes = {
  training: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    weekDay: PropTypes.string,
    exercises: PropTypes.array,
  }).isRequired,
  index: PropTypes.number.isRequired,
  onJumpToTraining: PropTypes.func.isRequired,
  onJumpToExercise: PropTypes.func.isRequired,
};

export default RoutineSummarySheetItem;
