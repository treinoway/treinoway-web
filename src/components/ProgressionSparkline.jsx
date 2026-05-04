import PropTypes from 'prop-types';

const SPARK_BARS = 6;

/**
 * Mini sparkline (6 bars) for the progression row desktop column.
 * Shows load history with the latest bar colour-coded by direction.
 *
 * Hidden via `.progression-spark--hidden` (CSS: `display: none !important`)
 * when the `hidden` prop is true or when rendered on mobile (CSS handles it).
 *
 * @param {object}        props
 * @param {number[]}      props.loadHistory   Most-recent-first list of maxLoad values
 * @param {number|null}   props.deltaPct      Latest period-vs-period delta %
 * @param {boolean}       props.hidden        If true, adds --hidden modifier
 */
const ProgressionSparkline = ({ loadHistory, deltaPct, hidden }) => {
  // Take last SPARK_BARS values; reverse so oldest is leftmost
  const valid = Array.isArray(loadHistory)
    ? loadHistory.filter((v) => v !== null && v !== undefined && Number.isFinite(v))
    : [];
  const slice = valid.slice(0, SPARK_BARS).reverse();

  const maxVal = slice.length > 0 ? Math.max(...slice) : 0;

  const latestModifier = deltaPct === null || deltaPct === undefined
    ? 'latest'
    : deltaPct > 0
      ? 'latest-up'
      : deltaPct < 0
        ? 'latest-down'
        : 'latest';

  const sparkClass = `progression-spark${hidden ? ' progression-spark--hidden' : ''}`;

  return (
    <div className={sparkClass} aria-hidden="true">
      {slice.map((val, i) => {
        const isLatest = i === slice.length - 1;
        const heightPct = maxVal > 0 ? Math.max(10, Math.round((val / maxVal) * 100)) : 10;
        const modifier = isLatest ? latestModifier : '';
        const barClass = `spark-bar${modifier ? ` spark-bar--${modifier}` : ''}`;
        return (
          <div
            key={i}
            className={barClass}
            style={{ height: `${heightPct}%` }}
          />
        );
      })}
    </div>
  );
};

ProgressionSparkline.propTypes = {
  loadHistory: PropTypes.arrayOf(PropTypes.number),
  deltaPct: PropTypes.number,
  hidden: PropTypes.bool,
};

ProgressionSparkline.defaultProps = {
  loadHistory: [],
  deltaPct: null,
  hidden: false,
};

export default ProgressionSparkline;
