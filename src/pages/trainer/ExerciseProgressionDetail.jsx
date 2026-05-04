import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { translateError } from '../../i18n';
import useExerciseProgressionDetail from '../../hooks/useExerciseProgressionDetail';
import usePeriodPersistence from '../../hooks/usePeriodPersistence';
import {
  DASHBOARD_PERIOD_PRESETS,
  getPeriodPresetLabel,
} from '../../constants/dashboardPeriod';
import {
  formatDayMonthShort,
  formatPeriodRangeShort,
} from '../../utils/formatDashboardDate';
import PeriodPickerSheet from '../../components/PeriodPickerSheet';
import TrendChip from '../../components/TrendChip';
import EmptyDataMessage from '../../components/EmptyDataMessage';

const SESSION_PAGE_SIZE = 10;

const formatLoad = (value) => (value === null || value === undefined ? '-' : `${value} kg`);

const computeTrend = (sessions) => {
  if (!Array.isArray(sessions) || sessions.length < 2) {
    return { startLoad: null, endLoad: null, deltaPct: null };
  }
  const sorted = [...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const startLoad = sorted[0].maxLoad ?? null;
  const endLoad = sorted[sorted.length - 1].maxLoad ?? null;
  if (startLoad === null || endLoad === null || startLoad === 0) {
    return { startLoad, endLoad, deltaPct: null };
  }
  const deltaPct = Number((((endLoad - startLoad) / startLoad) * 100).toFixed(2));
  return { startLoad, endLoad, deltaPct };
};

const ExerciseProgressionDetail = () => {
  const { studentId, exerciseId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  // Drilldown deep-links carry the active range as URL params; prefer those
  // over the persisted preset so back/forward and shared links both work.
  const initialOverride = fromParam && toParam
    ? { presetKey: DASHBOARD_PERIOD_PRESETS.CUSTOM, from: fromParam, to: toParam }
    : null;
  const [period, setPeriod] = usePeriodPersistence(user?.id, { initialOverride });
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data, loading, error, refetch } = useExerciseProgressionDetail(studentId, exerciseId, period);

  const sessions = useMemo(() => data?.sessions ?? [], [data]);
  const exercise = data?.exercise ?? null;
  const responseWindow = data?.window ?? null;

  const sessionsKey = sessions.length ? sessions.map((s) => s.sessionId).join('|') : '';
  const [expandedSessionIds, setExpandedSessionIds] = useState(() => new Set());

  useEffect(() => {
    if (!sessions.length) return;
    // Defer to keep "setState in effect body" lint rule satisfied — no cascading
    // render: this only runs once per fresh response.
    queueMicrotask(() => {
      const next = new Set();
      const sortedDesc = [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const last = sortedDesc[0];
      const first = sortedDesc[sortedDesc.length - 1];
      if (last) next.add(last.sessionId);
      if (first && first.sessionId !== last.sessionId) next.add(first.sessionId);
      setExpandedSessionIds(next);
    });
    // sessionsKey is a stable serialized identity of the sessions array — using it
    // avoids re-running when React produces a new array reference for the same data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionsKey]);

  const trend = useMemo(() => computeTrend(sessions), [sessions]);

  const periodLabel = period.presetKey === DASHBOARD_PERIOD_PRESETS.CUSTOM
    ? formatPeriodRangeShort(period.from, period.to) || 'Período personalizado'
    : getPeriodPresetLabel(period.presetKey);

  const handleApplyPeriod = (next) => {
    setPeriod(next);
    setPickerOpen(false);
  };

  const handleToggleSession = (sessionId) => {
    setExpandedSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  };

  const handleBack = () => {
    navigate(`/trainer/students/${studentId}`);
  };

  if (loading && !data) {
    return (
      <div className="loading-screen">
        <span className="loading-text">Carregando...</span>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="dashboard-not-found" role="alert">
        <p className="empty-state-title">Falha ao carregar</p>
        <p className="text-muted text-sm">{translateError(error)}</p>
        <div className="btn-group">
          <button type="button" className="btn-secondary" onClick={handleBack}>Voltar</button>
          <button type="button" className="btn-primary" onClick={refetch}>Tentar novamente</button>
        </div>
      </div>
    );
  }

  if (!exercise) {
    return null;
  }

  const sessionCount = sessions.length;
  const trendDelta = trend.deltaPct;
  const trendRange = trend.startLoad !== null && trend.endLoad !== null
    ? `${trend.startLoad} → ${trend.endLoad} kg`
    : '—';
  const firstSessionDate = responseWindow?.from ? formatDayMonthShort(responseWindow.from) : null;
  const earliestSessionInWindow = sessions.length
    ? formatDayMonthShort([...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0].date)
    : null;
  const anchorDate = earliestSessionInWindow ?? firstSessionDate;

  return (
    <div className="exercise-progression-detail">
      <div className="page-header exercise-progression-detail-header">
        <button type="button" className="btn-back" onClick={handleBack} aria-label="Voltar para aluno">
          <ArrowLeft size={16} strokeWidth={2} />
          Aluno
        </button>
        <button
          type="button"
          className="activity-period-chip"
          aria-haspopup="dialog"
          aria-expanded={pickerOpen}
          aria-label={`Alterar período. Atual: ${periodLabel}`}
          onClick={() => setPickerOpen(true)}
        >
          <span className="activity-period-chip-label">{periodLabel}</span>
          <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      <h1 className="exercise-progression-detail-title">{exercise.name}</h1>

      <section className="exercise-progression-summary">
        <p className="exercise-progression-summary-line">
          {sessionCount} {sessionCount === 1 ? 'sessão' : 'sessões'} neste período
        </p>
        <p className="exercise-progression-summary-line">
          {trendRange}
          {' '}
          <TrendChip deltaPct={trendDelta} ariaLabel={trendDelta !== null ? `Variação ${trendDelta}%` : 'Sem comparativo'} />
        </p>
        {exercise.trainingName && (
          <p className="exercise-progression-summary-line text-sm text-muted">
            {exercise.trainingName}
          </p>
        )}
        {anchorDate && (
          <p className="exercise-progression-summary-anchor text-sm text-muted">
            Comparado à 1ª sessão ({anchorDate})
          </p>
        )}
      </section>

      {sessions.length === 0 ? (
        <EmptyDataMessage
          title="Aluno ainda não treinou nesse período"
          description="Tente ampliar a janela de datas."
        />
      ) : (
        <ul className="exercise-progression-sessions">
          {sessions.map((session) => (
            <ExerciseSessionCard
              key={session.sessionId}
              session={session}
              expanded={expandedSessionIds.has(session.sessionId)}
              onToggle={() => handleToggleSession(session.sessionId)}
              hasLoad={exercise.hasLoad}
            />
          ))}
        </ul>
      )}

      <PeriodPickerSheet
        open={pickerOpen}
        currentPeriod={period}
        onApply={handleApplyPeriod}
        onCancel={() => setPickerOpen(false)}
      />
    </div>
  );
};

const ExerciseSessionCard = ({ session, expanded, onToggle, hasLoad }) => {
  const sets = Array.isArray(session.sets) ? session.sets : [];
  const dateLabel = formatDayMonthShort(session.date) || '-';
  const repRange = `${session.completedSets ?? 0} séries · ${session.totalReps ?? 0} reps`;

  return (
    <li className="exercise-session-card">
      <button
        type="button"
        className="exercise-session-card-header"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <span className="exercise-session-card-date">{dateLabel}</span>
        <span className="exercise-session-card-summary">{repRange}</span>
        {expanded
          ? <ChevronUp size={16} strokeWidth={2} aria-hidden="true" />
          : <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />}
      </button>
      {expanded && (
        <ul className="exercise-session-set-list">
          {sets.length === 0 && (
            <li className="exercise-session-set-empty text-sm text-muted">Sem séries registradas</li>
          )}
          {sets.map((set) => (
            <SetRow key={`${session.sessionId}-${set.setNumber}`} set={set} hasLoad={hasLoad} />
          ))}
        </ul>
      )}
    </li>
  );
};

const SetRow = ({ set, hasLoad }) => {
  const reps = set.repetitions ?? 0;
  const rpe = set.rpe !== null && set.rpe !== undefined ? `RPE ${set.rpe}` : null;
  const completedMark = set.completed ? '✓' : '–';
  return (
    <li className={`exercise-session-set-row${set.completed ? '' : ' exercise-session-set-row--skipped'}`}>
      <span className="exercise-session-set-label">Set {set.setNumber}</span>
      <span className="exercise-session-set-reps">{reps} reps</span>
      {hasLoad && set.load !== null && set.load !== undefined && (
        <span className="exercise-session-set-load">{formatLoad(set.load)}</span>
      )}
      {rpe && <span className="exercise-session-set-rpe">{rpe}</span>}
      <span className="exercise-session-set-mark" aria-label={set.completed ? 'Concluída' : 'Não concluída'}>{completedMark}</span>
    </li>
  );
};

ExerciseSessionCard.propTypes = {
  session: PropTypes.shape({
    sessionId: PropTypes.string.isRequired,
    date: PropTypes.string,
    completedSets: PropTypes.number,
    totalReps: PropTypes.number,
    sets: PropTypes.array,
  }).isRequired,
  expanded: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  hasLoad: PropTypes.bool,
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

export default ExerciseProgressionDetail;
