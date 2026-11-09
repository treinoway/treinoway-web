import PropTypes from 'prop-types';
import Badge from './Badge';
import { formatByUnit, formatSigned } from '../../utils/nutritionFormat';

const PERCENT = 100;
const STATUS_TONE = { ok: 'brand', low: 'warning', high: 'warning' };
const STATUS_WORD = { low: 'ABAIXO', high: 'ACIMA' };

// Progress of the value against the goal as a 0-100 integer.
const toProgress = (value, goal) => {
  if (!goal || goal <= 0) return 0;
  return Math.min(PERCENT, Math.max(0, Math.round((value / goal) * PERCENT)));
};

// Badge text: "NA META" or "ABAIXO −73 kcal" / "ACIMA +100 kcal".
const statusText = (status, diff, unit) =>
  (status === 'ok' ? 'NA META' : `${STATUS_WORD[status]} ${formatSigned(diff, unit)} ${unit}`);

/** Value against a goal with a progress bar, an on/below/above target Badge and an optional extra line. */
const NutrientGoalTile = ({ label, value, goal, unit, status: reportedStatus, isMinimum = false, extra }) => {
  const status = isMinimum && reportedStatus === 'high' ? 'ok' : reportedStatus;
  const progress = toProgress(value, goal);
  const fillClass = `nutrient-goal-tile__fill${status === 'ok' ? '' : ' nutrient-goal-tile__fill--off'}`;

  return (
    <div className="nutrient-goal-tile">
      <span className="nutrient-goal-tile__label type-overline">{label}</span>
      <div className="nutrient-goal-tile__figures">
        <span className="nutrient-goal-tile__value type-h2">{formatByUnit(value, unit)}</span>
        <span className="nutrient-goal-tile__goal type-caption">/ {formatByUnit(goal, unit)} {unit}</span>
      </div>
      <div
        className="nutrient-goal-tile__track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={PERCENT}
        aria-valuenow={progress}
      >
        <span className={fillClass} style={{ width: `${progress}%` }} />
      </div>
      <div className="nutrient-goal-tile__footer">
        <Badge tone={STATUS_TONE[status]}>{statusText(status, value - goal, unit)}</Badge>
        {extra && <span className="nutrient-goal-tile__extra type-caption">{extra}</span>}
      </div>
    </div>
  );
};

NutrientGoalTile.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  goal: PropTypes.number.isRequired,
  unit: PropTypes.string.isRequired,
  status: PropTypes.oneOf(['ok', 'low', 'high']).isRequired,
  isMinimum: PropTypes.bool,
  extra: PropTypes.string,
};

export default NutrientGoalTile;
