import { useId } from 'react';
import PropTypes from 'prop-types';
import { Check, ChevronDown, Minus } from 'lucide-react';
import Badge from './ds/Badge';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const formatSessionDay = (dateStr) => {
  if (!dateStr) return '-';
  const dateOnly = DATE_ONLY_PATTERN.exec(dateStr);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '-';
  return `${String(date.getDate()).padStart(2, '0')} ${MONTHS[date.getMonth()]}`;
};

const formatNumber = (value) => value.toLocaleString('pt-BR');

const buildSummary = (completedSets, totalReps) =>
  `${completedSets} ${completedSets === 1 ? 'série' : 'séries'} · ${formatNumber(totalReps)} reps`;

const SetRow = ({ set, hasLoad }) => {
  const hasLoadValue = hasLoad && set.load !== null && set.load !== undefined;
  const hasRpe = set.rpe !== null && set.rpe !== undefined;
  const MarkIcon = set.completed ? Check : Minus;

  return (
    <li className={`progression-set type-body${set.completed ? '' : ' progression-set--skipped'}`}>
      <span className="progression-set__label type-body-strong">Série {set.setNumber}</span>
      <span className="progression-set__reps">{formatNumber(set.repetitions ?? 0)} reps</span>
      <span className="progression-set__end">
        {hasRpe && <span className="progression-set__rpe type-caption">RPE {set.rpe}</span>}
        {hasLoadValue && <span className="progression-set__load">{formatNumber(set.load)} kg</span>}
        <span
          className={`progression-set__mark${set.completed ? ' progression-set__mark--done' : ''}`}
          role="img"
          aria-label={set.completed ? 'Concluída' : 'Não concluída'}
        >
          <MarkIcon size={16} strokeWidth={2} aria-hidden="true" />
        </span>
      </span>
    </li>
  );
};

SetRow.propTypes = {
  set: PropTypes.shape({
    setNumber: PropTypes.number.isRequired,
    repetitions: PropTypes.number,
    load: PropTypes.number,
    rpe: PropTypes.number,
    completed: PropTypes.bool,
  }).isRequired,
  hasLoad: PropTypes.bool,
};

/**
 * Collapsible session row (Accordion, DS §4.13) for the exercise progression screen.
 * Header: date + "N séries · N reps"; body: one row per set.
 */
const ProgressionSessionAccordion = ({ session, expanded, onToggle, hasLoad }) => {
  const bodyId = useId();
  const sets = Array.isArray(session.sets) ? session.sets : [];
  const dayLabel = formatSessionDay(session.date);
  const summary = buildSummary(session.completedSets ?? 0, session.totalReps ?? 0);

  return (
    <li className="accordion">
      <button
        type="button"
        className="accordion-header"
        aria-expanded={expanded}
        aria-controls={bodyId}
        aria-label={`${expanded ? 'Recolher' : 'Expandir'} sessão de ${dayLabel}`}
        onClick={onToggle}
      >
        <span className="accordion-heading progression-session__heading">
          <span className="accordion-title type-body-strong">{dayLabel}</span>
          <span className="accordion-meta type-caption">{summary}</span>
        </span>
        <span className="progression-session__trailing">
          {session.status === 'abandoned' && <Badge tone="neutral" variant="tag">Abandonada</Badge>}
          <ChevronDown size={20} strokeWidth={2} className="accordion-chevron" aria-hidden="true" />
        </span>
      </button>
      {expanded && (
        <div id={bodyId} className="accordion-body">
          {sets.length === 0 ? (
            <p className="progression-session__empty type-body">Sem séries registradas</p>
          ) : (
            <ul className="progression-sets">
              {sets.map((set) => (
                <SetRow key={`${session.sessionId}-${set.setNumber}`} set={set} hasLoad={hasLoad} />
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
};

ProgressionSessionAccordion.propTypes = {
  session: PropTypes.shape({
    sessionId: PropTypes.string.isRequired,
    date: PropTypes.string,
    status: PropTypes.string,
    completedSets: PropTypes.number,
    totalReps: PropTypes.number,
    sets: PropTypes.array,
  }).isRequired,
  expanded: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  hasLoad: PropTypes.bool,
};

export default ProgressionSessionAccordion;
