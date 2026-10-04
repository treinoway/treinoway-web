import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, CalendarX, TriangleAlert } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
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
import ProgressionSessionAccordion from '../../components/ProgressionSessionAccordion';
import EmptyBlock from '../../components/ds/EmptyBlock';

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

const formatNumber = (value) => value.toLocaleString('pt-BR');

const getStudentName = (student) => {
  if (!student) return null;
  const fullName = [student.firstName, student.lastName].filter(Boolean).join(' ');
  return fullName || student.email || null;
};

const formatDeltaPct = (deltaPct) => {
  if (deltaPct === null) return '—';
  const sign = deltaPct > 0 ? '+' : '';
  return `${sign}${deltaPct.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
};

const Kpi = ({ label, value }) => (
  <div className="kpi">
    <span className="kpi-label type-overline">{label}</span>
    <span className="kpi-value progression-hero__kpi-value type-h2">{value}</span>
  </div>
);

Kpi.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
};

const EvolutionBox = ({ hasTrendData, trend }) => (
  <div className="progression-hero__evolution">
    <div className="progression-hero__evolution-text">
      <span className="progression-hero__evolution-label type-overline">Evolução</span>
      {hasTrendData ? (
        <span className="progression-hero__evolution-value type-body-strong">
          {formatNumber(trend.startLoad)} → {formatNumber(trend.endLoad)} kg
        </span>
      ) : (
        <span className="progression-hero__evolution-hint type-caption">
          Precisa de pelo menos 2 sessões para comparar
        </span>
      )}
    </div>
    {hasTrendData && (
      <TrendChip
        deltaPct={trend.deltaPct}
        ariaLabel={trend.deltaPct !== null ? `Variação ${formatDeltaPct(trend.deltaPct)}` : 'Sem comparativo'}
      />
    )}
  </div>
);

EvolutionBox.propTypes = {
  hasTrendData: PropTypes.bool.isRequired,
  trend: PropTypes.shape({
    startLoad: PropTypes.number,
    endLoad: PropTypes.number,
    deltaPct: PropTypes.number,
  }).isRequired,
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
  const [studentName, setStudentName] = useState(null);

  const { data, loading, error, refetch } = useExerciseProgressionDetail(studentId, exerciseId, period, includeAbandoned);

  const sessions = useMemo(() => data?.sessions ?? [], [data]);
  const exercise = data?.exercise ?? null;
  const responseWindow = data?.window ?? null;

  const sessionsKey = sessions.length ? sessions.map((s) => s.sessionId).join('|') : '';
  const [expandedSessionIds, setExpandedSessionIds] = useState(() => new Set());

  useEffect(() => {
    let cancelled = false;
    api.get('/trainer/students')
      .then((response) => {
        if (cancelled || !Array.isArray(response?.data)) return;
        const found = response.data.find((student) => String(student.id) === String(studentId));
        setStudentName(getStudentName(found));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [studentId]);

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
      <div className="progression-detail__state">
        <EmptyBlock
          icon={TriangleAlert}
          role="alert"
          title="Falha ao carregar"
          description={translateError(error)}
          actionLabel="Tentar novamente"
          onAction={refetch}
        />
        <button type="button" className="btn btn--secondary" onClick={handleBack}>Voltar</button>
      </div>
    );
  }

  if (!exercise) {
    return null;
  }

  const hasTrendData = sessions.length >= 2;
  const earliestSession = sessions.length
    ? [...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
    : null;
  const anchorDate = earliestSession
    ? formatDayMonthShort(earliestSession.date)
    : formatDayMonthShort(responseWindow?.from);
  const peakLoadLabel = kpis.peakLoad !== null ? `${formatNumber(kpis.peakLoad)} kg` : '—';

  return (
    <div className="progression-detail">
      <button
        type="button"
        className="btn btn--ghost progression-detail__back"
        onClick={handleBack}
        aria-label="Voltar para o perfil do aluno"
      >
        <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
        {studentName ? `${studentName} · Progressão de carga` : 'Progressão de carga'}
      </button>

      <section className="section-card progression-hero" aria-label="Resumo da progressão">
        <div className="progression-hero__header">
          <div className="progression-hero__heading">
            {exercise.trainingName && (
              <span className="progression-hero__overline type-overline">{exercise.trainingName}</span>
            )}
            <h1 className="type-h1 progression-hero__title">{exercise.name}</h1>
          </div>
          <button
            type="button"
            className="btn btn--secondary progression-hero__period"
            aria-haspopup="dialog"
            aria-expanded={pickerOpen}
            aria-label={`Alterar período. Atual: ${periodLabel}`}
            onClick={() => setPickerOpen(true)}
          >
            {periodLabel}
            <CalendarDays size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <div className="progression-hero__kpis" role="group" aria-label="Indicadores da progressão">
          <Kpi label="Sessões no período" value={String(sessions.length)} />
          <Kpi label="Pico de carga" value={peakLoadLabel} />
          <Kpi label="Variação" value={formatDeltaPct(trend.deltaPct)} />
          <Kpi label="Total de reps" value={formatNumber(kpis.totalReps)} />
        </div>

        <EvolutionBox hasTrendData={hasTrendData} trend={trend} />

        {anchorDate && (
          <p className="progression-hero__caption type-caption">
            Comparado à 1ª sessão ({anchorDate})
          </p>
        )}
      </section>

      <div className="section-card progression-filter">
        <span id="include-abandoned-label" className="progression-filter__label type-body-strong">
          Incluir sessões abandonadas
        </span>
        <button
          type="button"
          role="switch"
          className="toggle"
          aria-checked={includeAbandoned}
          aria-labelledby="include-abandoned-label"
          onClick={() => setIncludeAbandoned((prev) => !prev)}
        />
      </div>

      {sessions.length === 0 ? (
        <EmptyBlock
          icon={CalendarX}
          title="Aluno ainda não treinou nesse período"
          description="Tente ampliar a janela de datas."
        />
      ) : (
        <ul className="progression-sessions">
          {sessions.map((session) => (
            <ProgressionSessionAccordion
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

export default ExerciseProgressionDetail;
