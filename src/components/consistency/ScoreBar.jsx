import PropTypes from 'prop-types';
import { formatScore } from '../../utils/consistencyFormat';
import { WARNING_SCORE_THRESHOLD } from '../../constants/consistencyRanking';

// Whole-percent score with a bar that turns to the warning color below 70%; a neutral week has no bar
const ScoreBar = ({ score, label = 'Constância' }) => {
  const hasScore = score !== null && score !== undefined;
  const trackClass = `score-bar__track${score < WARNING_SCORE_THRESHOLD ? ' score-bar__track--warning' : ''}`;
  return (
    <span className="score-bar">
      <span className="score-bar__value type-h4">{formatScore(score)}</span>
      {hasScore && (
        <span className={trackClass} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(score)}>
          <span className="score-bar__fill" style={{ width: `${score}%` }} />
        </span>
      )}
    </span>
  );
};

ScoreBar.propTypes = {
  score: PropTypes.number,
  label: PropTypes.string,
};

export default ScoreBar;
