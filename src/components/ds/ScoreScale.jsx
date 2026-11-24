import PropTypes from 'prop-types';

// Whole numbers from `min` to `max`, both included
const valuesBetween = (min, max) => Array.from({ length: max - min + 1 }, (_, index) => min + index);

/** Read-only numeric scale (`.score-scale`): one cell per value and, when given, what each end means. Presentation only. */
const ScoreScale = ({ min = 0, max = 10, minLabel, maxLabel }) => (
  <div className="score-scale">
    <ol className="score-scale__cells">
      {valuesBetween(min, max).map((value) => (
        <li key={value} className="score-scale__cell type-caption-strong">{value}</li>
      ))}
    </ol>
    {(minLabel || maxLabel) && (
      <div className="score-scale__ends type-caption">
        <span>{minLabel}</span>
        <span className="score-scale__end-max">{maxLabel}</span>
      </div>
    )}
  </div>
);

ScoreScale.propTypes = {
  min: PropTypes.number,
  max: PropTypes.number,
  minLabel: PropTypes.string,
  maxLabel: PropTypes.string,
};

export default ScoreScale;
