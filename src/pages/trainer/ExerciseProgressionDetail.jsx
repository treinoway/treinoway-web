import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, ChevronDown, ChevronUp, Minus } from 'lucide-react';
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
import StatDisplay from '../../components/StatDisplay';

const SESSION_PAGE_SIZE = 10;

const formatLoad = (value) => (value === null || value === undefined ? '—' : `${value} kg`);

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

const computeKpis = (sessions) => {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return { peakLoad: null, totalReps: 0 };
  }
  const peakLoad = sessions.reduce((max, s) => {
    const load = s.maxLoad ?? null;
    if (load === null) return max;
    return max === null ? load : Math.max(max, load);
  }, null);
  const totalReps = sessions.reduce((sum, s) => sum + (s.totalReps ?? 0), 0);
  return { peakLoad, totalReps };
};

const formatDateHeader = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '-';
  const day = String(date.getDate()).padStart(2, '0');
  const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  return `${day} ${MONTHS[date.getMonth()]}`;
};

const ExerciseProgressionDetail = () => {
  const { studentId, exerciseId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  const initialOverride = fromParam && toParam
    ? { presetKey: DASHBOARD_PERIOD_PRESETS.CUSTOM, from: fromParam, to: toParam }
    : null;
  const [period, setPeriod] = usePeriodPersistence(user?.id, { initialOverride });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [includeAbandoned, setIncludeAbandoned] = useState(false);

  const { data, loading, error, refetch } = useExerciseProgressionDetail(studentId, exerciseId, period, includeAbandoned);

  const sessions = useMemo(() => data?.sessions ?? [], [data]);
  const exercise = data?.exercise ?? null;
  const responseWindow = data?.window ?? null;

  const sessionsKey = sessions.length ? sessions.map((s) => s.sessionId).join('|') : '';
  const [expandedSessionIds, setExpandedSessionIds] = useState(() => new Set());

  useEffect(() => {
    if (!sessions.length) return;
    queueMicrotask(() => {
      const next = new Set();
      const sortedDesc = [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const last = sortedDesc[0];
      const first = sortedDesc[sortedDesc.length - 1];
      if (last) next.add(last.sessionId);
      if (first && first.sessionId !== last.sessionId) next.add(first.sessionId);
      setExpandedSessionIds(next);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionsKey]);

  const trend = useMemo(() => computeTrend(sessions), [sessions]);
  const kpis = useMemo(() => computeKpis(sessions), [sessions]);

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
  const hasTrendData = sessions.length >= 2;
  const firstSessionDate = responseWindow?.from ? formatDayMonthShort(responseWindow.from) : null;
  const earliestSessionInWindow = sessions.length
    ? formatDayMonthShort([...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0].date)
    : null;
  const anchorDate = earliestSessionInWindow ?? firstSessionDate;

  const deltaPctDisplay = trendDelta !== null
    ? (trendDelta > 0 ? `+${trendDelta}%` : `${trendDelta}%`)
    : '—';
  const deltaPctDirection = trendDelta === null ? 'neutral' : trendDelta > 0 ? 'up' : trendDelta < 0 ? 'down' : 'neutral';

  return (
    <div className="exercise-progression-detail">

      {/* ── Stadium hero ── */}
      <section className="theme-stadium epd-hero">
        <div className="epd-hero-nav">
          <button
            type="button"
            className="epd-back-btn"
            onClick={handleBack}
            aria-label="Voltar para aluno"
          >
            <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
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

        {exercise.trainingName && (
          <span className="epd-hero-eyebrow">{exercise.trainingName}</span>
        )}
        <h1 className="epd-hero-title">{exercise.name}</h1>

        <div className="epd-hero-stats">
          <StatDisplay
            value={sessionCount}
            label="Sessões no período"
          />
          <StatDisplay
            value={kpis.peakLoad !== null ? kpis.peakLoad : '—'}
            unit={kpis.peakLoad !== null ? 'kg' : undefined}
            label="Pico de carga"
          />
          <StatDisplay
            value={deltaPctDisplay}
            label="Variação"
            trendDirection={deltaPctDisplay !== '—' ? deltaPctDirection : undefined}
          />
          <StatDisplay
            value={kpis.totalReps}
            label="Total de reps"
          />
        </div>

        {/* Evolução callout */}
        {hasTrendData ? (
          <div className="epd-evolucao">
            <span className="epd-evolucao-label">Evolução</span>
            <span className="epd-evolucao-range">
              {trend.startLoad} → {trend.endLoad} kg
            </span>
            <TrendChip
              deltaPct={trendDelta}
              ariaLabel={trendDelta !== null ? `Variação ${trendDelta}%` : 'Sem comparativo'}
            />
          </div>
        ) : (
          <div className="epd-evolucao epd-evolucao--empty">
            <span className="epd-evolucao-label">Evolução</span>
            <span className="epd-evolucao-dash">—</span>
            <span className="epd-evolucao-hint">Precisa de pelo menos 2 sessões para comparar</span>
          </div>
        )}

        {anchorDate && (
          <p className="epd-hero-anchor">
            Comparado à 1ª sessão ({anchorDate})
          </p>
        )}
      </section>

      {/* ── Filter row ── */}
      <div className="exercise-progression-filter">
        <label className="toggle-row" htmlFor="include-abandoned-toggle">
          <div className="toggle-row-content">
            <span className="toggle-row-title">Incluir sessões abandonadas</span>
          </div>
          <div className="switch">
            <input
              id="include-abandoned-toggle"
              type="checkbox"
              checked={includeAbandoned}
              onChange={(e) => setIncludeAbandoned(e.target.checked)}
            />
            <span className="switch-slider" />
          </div>
        </label>
      </div>

      {/* ── Session list ── */}
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
              status={session.status}
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

const ExerciseSessionCard = ({ session, expanded, onToggle, hasLoad, status }) => {
  const sets = Array.isArray(session.sets) ? session.sets : [];
  const dateLabel = formatDateHeader(session.date);
  const setCount = session.completedSets ?? 0;
  const totalReps = session.totalReps ?? 0;
  const repSummary = `${setCount} ${setCount === 1 ? 'série' : 'séries'} · ${totalReps} reps`;
  const isAbandoned = status === 'abandoned';

  return (
    <li className="exercise-session-card">
      <button
        type="button"
        className="exercise-session-card-header"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <div className="exercise-session-card-date-block">
          <span className="exercise-session-card-date">{dateLabel}</span>
          <span className="exercise-session-card-summary">{repSummary}</span>
        </div>
        <div className="exercise-session-card-badges">
          {isAbandoned && (
            <span className="badge badge-gray">Abandonada</span>
          )}
          {expanded
            ? <ChevronUp size={16} strokeWidth={2} aria-hidden="true" />
            : <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />}
        </div>
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
  const loadValue = hasLoad && set.load !== null && set.load !== undefined ? formatLoad(set.load) : null;
  const rpeValue = set.rpe !== null && set.rpe !== undefined ? `RPE ${set.rpe}` : null;

  return (
    <li className={`exercise-session-set-row${set.completed ? '' : ' exercise-session-set-row--skipped'}`}>
      <span className="exercise-session-set-label">Set {set.setNumber}</span>
      <span className="exercise-session-set-reps">{reps} reps</span>
      {/* Always render the load slot so the grid stays stable */}
      <span className={loadValue ? 'exercise-session-set-load' : 'exercise-session-set-slot-empty'} aria-hidden={loadValue ? undefined : 'true'}>
        {loadValue ?? ''}
      </span>
      {/* Always render the rpe slot so the grid stays stable */}
      <span className={rpeValue ? 'exercise-session-set-rpe' : 'exercise-session-set-slot-empty'} aria-hidden={rpeValue ? undefined : 'true'}>
        {rpeValue ?? ''}
      </span>
      <span
        className="exercise-session-set-mark"
        aria-label={set.completed ? 'Concluída' : 'Não concluída'}
      >
        {set.completed
          ? <Check size={14} strokeWidth={2} aria-hidden="true" />
          : <Minus size={14} strokeWidth={2} aria-hidden="true" />}
      </span>
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
  status: PropTypes.string,
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
