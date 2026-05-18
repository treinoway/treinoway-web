import PropTypes from 'prop-types';
import { ChevronDown, Plus } from 'lucide-react';
import StatDisplay from './StatDisplay';
import SubscriptionStrip from './SubscriptionStrip';
import PulseWaveform from './PulseWaveform';
import PulseHeatmap from './PulseHeatmap';
import InfoPopover from './InfoPopover';
import { formatPercent, formatDaysSinceLast } from '../utils/formatAdherence';

// summary.adherence is a 0–100 value with two decimals.
// formatPercent expects a 0–1 ratio, so we scale before formatting.
const toRatio = (value) => (value === null || value === undefined ? null : value / 100);

const MONTH_NAMES_PT = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

// Parses a "YYYY-MM-01" string as UTC and returns the lowercased pt-BR month name.
const formatMonthName = (monthStartIso) => {
  if (!monthStartIso) return null;
  const match = /^(\d{4})-(\d{2})-/.exec(monthStartIso);
  if (!match) return null;
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return MONTH_NAMES_PT[monthIndex];
};

// Capitalizes the first letter of a pt-BR month for use in the eyebrow ("Maio · mês atual").
const capitalize = (text) => (text ? text.charAt(0).toUpperCase() + text.slice(1) : text);

// Returns the plain-language delta line vs the previous month, or null when unavailable.
const formatAdherenceDelta = (current, previous, previousMonthIso) => {
  if (current == null || previous == null) return null;
  const previousMonthName = formatMonthName(previousMonthIso);
  if (!previousMonthName) return null;
  const diff = Math.round(current - previous);
  if (diff === 0) return `Sem mudança vs ${previousMonthName}`;
  if (diff > 0) return `↑ ${diff} pontos vs ${previousMonthName}`;
  return `↓ ${Math.abs(diff)} pontos vs ${previousMonthName}`;
};

const deltaDirectionFor = (current, previous) => {
  if (current == null || previous == null) return 'neutral';
  const diff = Math.round(current - previous);
  if (diff > 0) return 'up';
  if (diff < 0) return 'down';
  return 'neutral';
};

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

  const adherence = summary?.adherence ?? null;
  const adherenceCompleted = summary?.adherenceCompleted ?? null;
  const adherenceExpected = summary?.adherenceExpected ?? null;
  const adherenceMonth = summary?.adherenceMonth ?? null;
  // When summary carries the new contract, trust its previousAdherence (even if null).
  // Fall back to the legacy previousSummary only if the new field is undefined.
  const previousAdherence = summary && 'previousAdherence' in summary
    ? summary.previousAdherence
    : (previousSummary?.adherence ?? null);
  const previousAdherenceMonth = summary?.previousAdherenceMonth ?? null;
  const completionRate = summary?.completionRate ?? null;

  const adherenceLabel = formatPercent(toRatio(adherence));
  const completionRateLabel = formatPercent(completionRate);

  const hasAdherenceCounts = adherenceCompleted != null && adherenceExpected != null;
  const hasAdherence = adherence != null;

  const adherenceSubValue = hasAdherence
    ? (hasAdherenceCounts ? `${adherenceCompleted} de ${adherenceExpected} treinos` : null)
    : 'Sem rotina ativa';

  const adherenceEyebrow = hasAdherence
    ? (adherenceMonth ? `${capitalize(formatMonthName(adherenceMonth))} · mês atual` : 'Mês atual')
    : null;

  const deltaLabel = hasAdherence
    ? formatAdherenceDelta(adherence, previousAdherence, previousAdherenceMonth)
    : null;
  const deltaDirection = deltaDirectionFor(adherence, previousAdherence);

  const adherenceInfo = (
    <InfoPopover triggerAriaLabel="Sobre Aderência" title="Aderência">
      <p className="info-popover-text">
        A aderência mostra quantos treinos do mês a aluna fez, comparado ao
        que foi planejado.
      </p>
      <p className="info-popover-text">
        Sempre considera o <strong>mês corrente</strong>, independente do
        filtro de período acima.
      </p>
      {completionRateLabel ? (
        <div className="info-popover-metric">
          <p className="info-popover-metric-label">Taxa de conclusão</p>
          <p className="info-popover-metric-value">{completionRateLabel}</p>
          <p className="info-popover-metric-sub">
            % de sessões iniciadas que foram concluídas (vs. abandonadas).
          </p>
        </div>
      ) : null}
    </InfoPopover>
  );

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
          infoSlot={adherenceInfo}
          eyebrow={adherenceEyebrow}
          subValue={adherenceSubValue}
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
    adherence: PropTypes.number,
    adherenceCompleted: PropTypes.number,
    adherenceExpected: PropTypes.number,
    adherenceMonth: PropTypes.string,
    previousAdherence: PropTypes.number,
    previousAdherenceMonth: PropTypes.string,
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
    adherence: PropTypes.number,
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
