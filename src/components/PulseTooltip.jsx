import PropTypes from 'prop-types';
import { statusLabel } from '../constants/dashboardViz';
import { formatLongDate, formatSessionVolume, formatSets } from '../utils/volumeChart';
import { td } from '../utils/studentCockpit';

const ANCHOR_CLASS = {
  left: ' chart-tooltip--left',
  right: ' chart-tooltip--right',
  center: '',
};

const TooltipRow = ({ label, value }) => (
  <div className="chart-tooltip__row type-caption">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

TooltipRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

/**
 * Floating tooltip for one session day of the volume chart. The parent decides
 * `anchorDir` so days near an edge open the tooltip inward. Values lead; the
 * status is plain text (no colour swatch: a brand mark on the inverse surface
 * would be low-contrast ink).
 */
const PulseTooltip = ({ id, date, session, anchorDir = 'center' }) => (
  <div id={id} className={`chart-tooltip${ANCHOR_CLASS[anchorDir] ?? ''}`} role="tooltip">
    <p className="chart-tooltip__date type-overline">{formatLongDate(date)}</p>
    <p className="chart-tooltip__status type-caption-strong">{statusLabel(session.status)}</p>
    {session.trainingName && <TooltipRow label={td('volume.tooltip.training')} value={session.trainingName} />}
    {session.sessionCount > 1 && <TooltipRow label={td('volume.tooltip.sessions')} value={session.sessionCount} />}
    <TooltipRow label={td('volume.tooltip.sets')} value={formatSets(session.completedSets, session.totalSets)} />
    <TooltipRow label={td('volume.tooltip.volume')} value={formatSessionVolume(session)} />
  </div>
);

PulseTooltip.propTypes = {
  id: PropTypes.string,
  date: PropTypes.string.isRequired,
  session: PropTypes.shape({
    status: PropTypes.oneOf(['completed', 'partial', 'abandoned']).isRequired,
    volumeKg: PropTypes.number,
    hasLoad: PropTypes.bool.isRequired,
    sessionCount: PropTypes.number,
    trainingName: PropTypes.string,
    completedSets: PropTypes.number,
    totalSets: PropTypes.number,
  }).isRequired,
  anchorDir: PropTypes.oneOf(['center', 'left', 'right']),
};

export default PulseTooltip;
