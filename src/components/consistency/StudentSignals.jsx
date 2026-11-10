import PropTypes from 'prop-types';
import { AlertTriangle, Pause, Zap } from 'lucide-react';
import Badge from '../ds/Badge';
import { formatWeekdayTime } from '../../utils/consistencyFormat';

const DEFAULT_RISK_LIMIT = 70;
const DEFAULT_TIME_ZONE = 'America/Sao_Paulo';
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;
const SIGNAL_QUICK_COMPLETION = 'quick_completion';
const SIGNAL_BATCH_LOGGING = 'batch_logging';

// 1-based season week of a "YYYY-MM-DD" Monday
const seasonWeekOf = (weekStart, seasonStart) => {
  const days = (Date.parse(weekStart) - Date.parse(seasonStart)) / MS_PER_DAY;
  return Math.round(days / DAYS_PER_WEEK) + 1;
};

// "Semana N pausada (motivo)", without the parentheses when no reason was given
const pauseLabel = (pause, season) => {
  const base = `Semana ${seasonWeekOf(pause.weekStart, season.startWeek)} pausada`;
  return pause.reason ? `${base} (${pause.reason})` : base;
};

// "N semanas abaixo de X%" in singular or plural
const riskLabel = (risk, riskLimit) => `${risk.weeks} ${risk.weeks === 1 ? 'semana' : 'semanas'} abaixo de ${riskLimit}%`;

// "2 treinos em menos de 10 min" of the quick completions; without the threshold in the payload, "2 conclusões rápidas"
const quickLabel = (quickSignals) => {
  const count = quickSignals.length;
  const minutes = quickSignals[0].thresholdMinutes;
  if (!minutes) return count === 1 ? 'Conclusão rápida' : `${count} conclusões rápidas`;
  return `${count} ${count === 1 ? 'treino' : 'treinos'} em menos de ${minutes} min`;
};

// "Registro em lote no domingo 20h48" from the last session of the batch; just "Registro em lote" without that time
const batchLabel = (signal, timeZone) =>
  signal.lastFinishedAt ? `Registro em lote no ${formatWeekdayTime(signal.lastFinishedAt, timeZone)}` : 'Registro em lote';

// Review-signal badges: one for the quick completions and one for batch logging
const signalLabels = (signals, timeZone) => {
  const quick = signals.filter((signal) => signal.type === SIGNAL_QUICK_COMPLETION);
  const batch = signals.find((signal) => signal.type === SIGNAL_BATCH_LOGGING);
  return [...(quick.length > 0 ? [quickLabel(quick)] : []), ...(batch ? [batchLabel(batch, timeZone)] : [])];
};

// Badges under a student's name: paused week (running or already closed) with reason, review signals, risk and entering progress
const StudentSignals = ({ row, season, riskLimit = DEFAULT_RISK_LIMIT, timeZone = DEFAULT_TIME_ZONE }) => {
  const labels = signalLabels(row.signals ?? [], timeZone);
  const pause = row.pause ?? row.closedPause;
  const hasBadges = pause || labels.length > 0 || row.risk || row.entering;
  if (!hasBadges) return null;
  return (
    <span className="student-signals">
      {pause && (
        <Badge tone="neutral">
          <Pause size={12} strokeWidth={2} aria-hidden="true" />
          {pauseLabel(pause, season)}
        </Badge>
      )}
      {labels.map((label) => (
        <Badge key={label} tone="warning">
          <Zap size={12} strokeWidth={2} aria-hidden="true" />
          {label}
        </Badge>
      ))}
      {row.risk && (
        <Badge tone="error">
          <AlertTriangle size={12} strokeWidth={2} aria-hidden="true" />
          {riskLabel(row.risk, riskLimit)}
        </Badge>
      )}
      {row.entering && <Badge tone="neutral">{`Entrando na temporada · ${row.entering.validWeeks} de ${row.entering.required} semanas`}</Badge>}
    </span>
  );
};

StudentSignals.propTypes = {
  row: PropTypes.shape({
    pause: PropTypes.shape({ weekStart: PropTypes.string, reason: PropTypes.string }),
    closedPause: PropTypes.shape({ weekStart: PropTypes.string, reason: PropTypes.string }),
    signals: PropTypes.arrayOf(PropTypes.shape({ type: PropTypes.string, thresholdMinutes: PropTypes.number, lastFinishedAt: PropTypes.string })),
    risk: PropTypes.shape({ weeks: PropTypes.number, scores: PropTypes.arrayOf(PropTypes.number) }),
    entering: PropTypes.shape({ validWeeks: PropTypes.number, required: PropTypes.number }),
  }).isRequired,
  season: PropTypes.shape({ startWeek: PropTypes.string }).isRequired,
  riskLimit: PropTypes.number,
  timeZone: PropTypes.string,
};

export default StudentSignals;
