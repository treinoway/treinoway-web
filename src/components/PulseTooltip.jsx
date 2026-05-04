import PropTypes from 'prop-types';
import { CheckCircle, AlertCircle, XCircle, Circle } from 'lucide-react';
import { statusLabel } from '../constants/dashboardViz';

const MONTHS_PT_BR_SHORT = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

const formatTooltipDate = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  const date = new Date(year, month - 1, day);
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return `${weekdays[date.getDay()]}, ${day} de ${MONTHS_PT_BR_SHORT[month - 1]}`;
};

const StatusIcon = ({ status }) => {
  switch (status) {
    case 'completed': return <CheckCircle size={12} strokeWidth={2} aria-hidden="true" />;
    case 'partial':   return <AlertCircle size={12} strokeWidth={2} aria-hidden="true" />;
    case 'abandoned': return <XCircle size={12} strokeWidth={2} aria-hidden="true" />;
    default:          return <Circle size={12} strokeWidth={2} aria-hidden="true" />;
  }
};

StatusIcon.propTypes = { status: PropTypes.string.isRequired };

/**
 * Floating tooltip anchored to a waveform bar.
 * Collision detection handled by parent (PulseWaveform) via `anchorDir` prop.
 *
 * @param {object} props
 * @param {string} props.date         - YYYY-MM-DD
 * @param {string} props.status       - 'completed' | 'partial' | 'abandoned' | 'empty'
 * @param {string|null} props.trainingName
 * @param {number|null} props.volumeKg
 * @param {number} props.completedSets
 * @param {number} props.totalSets
 * @param {'center'|'left'|'right'} props.anchorDir - collision-detection result
 */
const PulseTooltip = ({
  date,
  status,
  trainingName,
  volumeKg,
  completedSets,
  totalSets,
  anchorDir,
}) => {
  const anchorClass = anchorDir === 'left'
    ? ' pulse-tooltip--left-anchored'
    : anchorDir === 'right'
      ? ' pulse-tooltip--right-anchored'
      : '';

  const statusClass = status !== 'completed' ? ` pulse-tooltip-status--${status}` : '';

  const volumeDisplay = volumeKg !== null && volumeKg !== undefined
    ? `${volumeKg.toLocaleString('pt-BR')} kg`
    : '—';

  const setsDisplay = completedSets > 0 || totalSets > 0
    ? `${completedSets}/${totalSets}`
    : '—';

  return (
    <div
      className={`pulse-tooltip${anchorClass}`}
      role="tooltip"
      aria-live="polite"
    >
      <p className="pulse-tooltip-date">{formatTooltipDate(date)}</p>
      <p className={`pulse-tooltip-status${statusClass}`}>
        <StatusIcon status={status} />
        {statusLabel(status)}
      </p>
      {trainingName && (
        <div className="pulse-tooltip-row">
          <span>Treino</span>
          <strong>{trainingName}</strong>
        </div>
      )}
      {status !== 'empty' && (
        <>
          <div className="pulse-tooltip-row">
            <span>Séries</span>
            <strong>{setsDisplay}</strong>
          </div>
          <div className="pulse-tooltip-row">
            <span>Volume</span>
            <strong>{volumeDisplay}</strong>
          </div>
        </>
      )}
    </div>
  );
};

PulseTooltip.propTypes = {
  date: PropTypes.string.isRequired,
  status: PropTypes.oneOf(['completed', 'partial', 'abandoned', 'empty']).isRequired,
  trainingName: PropTypes.string,
  volumeKg: PropTypes.number,
  completedSets: PropTypes.number,
  totalSets: PropTypes.number,
  anchorDir: PropTypes.oneOf(['center', 'left', 'right']),
};

PulseTooltip.defaultProps = {
  anchorDir: 'center',
  completedSets: 0,
  totalSets: 0,
};

export default PulseTooltip;
