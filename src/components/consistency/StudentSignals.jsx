import PropTypes from 'prop-types';
import { AlertTriangle, Pause, Zap } from 'lucide-react';
import Badge from '../ds/Badge';

const DEFAULT_RISK_LIMIT = 70;
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

// Label of the quick-completion signals of a student, counted in one badge
const quickLabel = (count) => (count === 1 ? 'Conclusão rápida' : `${count} conclusões rápidas`);

// Review-signal badges: one for the quick completions and one for batch logging
const signalLabels = (signals) => {
  const quickCount = signals.filter((signal) => signal.type === SIGNAL_QUICK_COMPLETION).length;
  const hasBatch = signals.some((signal) => signal.type === SIGNAL_BATCH_LOGGING);
  return [...(quickCount > 0 ? [quickLabel(quickCount)] : []), ...(hasBatch ? ['Registro em lote'] : [])];
};

// Badges under a student's name: paused week with reason, review signals, risk and entering progress
const StudentSignals = ({ row, season, riskLimit = DEFAULT_RISK_LIMIT }) => {
  const labels = signalLabels(row.signals ?? []);
  const hasBadges = row.pause || labels.length > 0 || row.risk || row.entering;
  if (!hasBadges) return null;
  return (
    <span className="student-signals">
      {row.pause && (
        <Badge tone="neutral">
          <Pause size={12} strokeWidth={2} aria-hidden="true" />
          {pauseLabel(row.pause, season)}
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
    signals: PropTypes.arrayOf(PropTypes.shape({ type: PropTypes.string })),
    risk: PropTypes.shape({ weeks: PropTypes.number, scores: PropTypes.arrayOf(PropTypes.number) }),
    entering: PropTypes.shape({ validWeeks: PropTypes.number, required: PropTypes.number }),
  }).isRequired,
  season: PropTypes.shape({ startWeek: PropTypes.string }).isRequired,
  riskLimit: PropTypes.number,
};

export default StudentSignals;
