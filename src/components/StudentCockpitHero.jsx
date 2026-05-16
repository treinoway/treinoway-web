import PropTypes from 'prop-types';
import { ChevronDown, Plus } from 'lucide-react';
import StatDisplay from './StatDisplay';
import SubscriptionStrip from './SubscriptionStrip';
import PulseWaveform from './PulseWaveform';
import PulseHeatmap from './PulseHeatmap';
import { formatPercent, formatDelta, formatDaysSinceLast } from '../utils/formatAdherence';

const getAvatarInitial = (student) => {
  if (student?.firstName) return student.firstName.charAt(0).toUpperCase();
  if (student?.email) return student.email.charAt(0).toUpperCase();
  return '?';
};

const getStudentName = (student) => {
  if (!student) return null;
  if (student.firstName || student.lastName) {
    return [student.firstName, student.lastName].filter(Boolean).join(' ');
  }
  return null;
};

const formatJoinedAt = (createdAt) => {
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (isNaN(date.getTime())) return null;
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[date.getMonth()]}/${date.getFullYear()}`;
};

const renderViz = (vizData, summaryLoading) => {
  if (!vizData || (vizData.type === 'waveform' && (!vizData.bars || vizData.bars.length === 0))) {
    return <PulseWaveform bars={[]} loading={summaryLoading} />;
  }
  if (vizData.type === 'heatmap') {
    return (
      <PulseHeatmap
        weeks={vizData.weeks ?? []}
        dowLabels={vizData.dowLabels ?? ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']}
        maxVolumeKg={vizData.maxVolumeKg ?? 0}
      />
    );
  }
  return <PulseWaveform bars={vizData.bars ?? []} loading={summaryLoading} />;
};

const StudentCockpitHero = ({
  student,
  summary,
  previousSummary,
  summaryLoading,
  periodLabel,
  vizData,
  onPeriodClick,
  onCreateProtocol,
  onLinkAnamnesis,
}) => {
  const studentName = getStudentName(student) ?? student?.email ?? '—';
  const avatarInitial = getAvatarInitial(student);
  const joinedAt = formatJoinedAt(student?.createdAt);

  const completionRate = summary?.completionRate ?? null;
  const previousRate = previousSummary?.completionRate ?? null;
  const adherenceLabel = formatPercent(completionRate);
  const deltaLabel = formatDelta(completionRate, previousRate);
  const deltaIsUp = deltaLabel && deltaLabel.startsWith('+');
  const deltaDirection = deltaLabel
    ? (deltaLabel === '0%' ? 'neutral' : deltaIsUp ? 'up' : 'down')
    : 'neutral';

  const daysSinceLast = summary?.daysSinceLast ?? null;
  const sessionsPerWeek = summary?.sessionsPerWeek ?? null;
  const maxStreak = summary?.maxStreak ?? null;

  const protocol = summary?.currentProtocol ?? null;

  return (
    <section className="theme-stadium student-cockpit-hero" aria-label="Painel do aluno">
      <div className="student-cockpit-hero-identity">
        <div className="student-cockpit-hero-avatar" aria-hidden="true">
          {avatarInitial}
        </div>
        <div className="student-cockpit-hero-identity-text">
          <h1 className="student-cockpit-hero-name">{studentName}</h1>
          <div className="student-cockpit-hero-meta">
            {student?.email && <span>{student.email}</span>}
            {student?.email && joinedAt && (
              <span className="student-cockpit-hero-meta-sep" aria-hidden="true">·</span>
            )}
            {joinedAt && <span>desde {joinedAt}</span>}
          </div>
        </div>
      </div>

      <SubscriptionStrip />

      <div className="student-cockpit-hero-eyebrow">
        <div className="student-cockpit-hero-protocol">
          <span className="student-cockpit-hero-protocol-dot" aria-hidden="true" />
          <span>Rotina ativa</span>
          {protocol ? (
            <>
              <span className="student-cockpit-hero-protocol-sep" aria-hidden="true">·</span>
              <span className="student-cockpit-hero-protocol-name">{protocol.name}</span>
              {protocol.weekNumber && protocol.totalWeeks && (
                <>
                  <span className="student-cockpit-hero-protocol-sep" aria-hidden="true">·</span>
                  <span className="student-cockpit-hero-protocol-week">
                    Semana {protocol.weekNumber}/{protocol.totalWeeks}
                  </span>
                </>
              )}
            </>
          ) : (
            <>
              <span className="student-cockpit-hero-protocol-sep" aria-hidden="true">·</span>
              <span className="student-cockpit-hero-protocol-name">Nenhuma rotina ativa</span>
            </>
          )}
        </div>

        <button
          type="button"
          className="cockpit-period-btn"
          onClick={onPeriodClick}
          aria-haspopup="dialog"
          aria-label={`Alterar período. Atual: ${periodLabel ?? ''}`}
        >
          <span>{periodLabel ?? '—'}</span>
          <ChevronDown size={12} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      <div className="student-cockpit-hero-stats" aria-label="Métricas do período">
        <StatDisplay
          value={adherenceLabel ?? '—'}
          label="Aderência"
          trend={deltaLabel}
          trendDirection={deltaDirection}
        />
        <StatDisplay
          value={formatDaysSinceLast(daysSinceLast)}
          label="Últ. sessão"
        />
        <StatDisplay
          value={sessionsPerWeek != null ? Number(sessionsPerWeek).toFixed(1) : '—'}
          unit="/sem"
          label="Sessões"
        />
        <StatDisplay
          value={maxStreak != null ? String(maxStreak) : '—'}
          unit={maxStreak != null ? 'd' : undefined}
          label="Streak"
        />
      </div>

      <div className="student-cockpit-hero-viz">
        {renderViz(vizData, summaryLoading)}
      </div>

      <div className="student-cockpit-hero-actions">
        <button
          type="button"
          className="btn-stadium"
          onClick={onCreateProtocol}
        >
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
          Nova rotina
        </button>
        <button
          type="button"
          className="btn-stadium btn-stadium--ghost"
          onClick={onLinkAnamnesis}
        >
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
          Vincular anamnese
        </button>
      </div>
    </section>
  );
};

StudentCockpitHero.propTypes = {
  student: PropTypes.shape({
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    email: PropTypes.string,
    createdAt: PropTypes.string,
  }),
  summary: PropTypes.shape({
    completionRate: PropTypes.number,
    daysSinceLast: PropTypes.number,
    sessionsPerWeek: PropTypes.number,
    maxStreak: PropTypes.number,
    currentProtocol: PropTypes.shape({
      name: PropTypes.string,
      weekNumber: PropTypes.number,
      totalWeeks: PropTypes.number,
    }),
  }),
  previousSummary: PropTypes.shape({
    completionRate: PropTypes.number,
  }),
  summaryLoading: PropTypes.bool,
  periodLabel: PropTypes.string,
  vizData: PropTypes.shape({
    type: PropTypes.oneOf(['waveform', 'heatmap']),
    bars: PropTypes.array,
    weeks: PropTypes.array,
    dowLabels: PropTypes.arrayOf(PropTypes.string),
    maxVolumeKg: PropTypes.number,
  }),
  onPeriodClick: PropTypes.func.isRequired,
  onCreateProtocol: PropTypes.func.isRequired,
  onLinkAnamnesis: PropTypes.func.isRequired,
};

export default StudentCockpitHero;
