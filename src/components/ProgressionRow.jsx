import PropTypes from 'prop-types';
import { ChevronRight } from 'lucide-react';
import TrendChip from './TrendChip';
import ProgressionSparkline from './ProgressionSparkline';
import shouldShowSparkline from '../utils/shouldShowSparkline';

/**
 * Single exercise progression row inside a training group.
 *
 * Uses the new `.progression-row` grid (Phase 4).
 * On desktop (≥1024px), a 6-bar sparkline column appears between
 * the name/trail block and the TrendChip — only when `shouldShowSparkline`
 * returns true for the given load history.
 *
 * @param {object}      props
 * @param {object}      props.entry          Progression entry from API
 * @param {function}    props.onOpen         Called on click / Enter / Space
 */
const ProgressionRow = ({ entry, onOpen }) => {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen();
    }
  };

  const isSingleSession = entry.sessionCount === 1;
  const trendValue = isSingleSession ? null : (entry.trend?.maxLoadDeltaPct ?? null);

  const loadHistory = Array.isArray(entry.loadHistory) ? entry.loadHistory : [];
  const showSpark = shouldShowSparkline(loadHistory, trendValue);

  if (!entry.hasLoad) {
    return (
      <li
        className="progression-row"
        role="link"
        tabIndex={0}
        aria-label={`${entry.exerciseName ?? '—'}: sem carga registrada`}
        onClick={onOpen}
        onKeyDown={handleKeyDown}
      >
        <div className="progression-row-main">
          <span className="progression-row-name">{entry.exerciseName ?? '—'}</span>
          <span className="progression-row-trail">Sem carga registrada</span>
        </div>
        <ProgressionSparkline hidden />
        <TrendChip deltaPct={null} />
        <span className="progression-row-side">
          <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
        </span>
      </li>
    );
  }

  const startLoad =
    entry.latest?.maxLoad !== undefined &&
    entry.trend?.maxLoadDelta !== undefined &&
    entry.trend?.maxLoadDelta !== null
      ? Number((entry.latest.maxLoad - entry.trend.maxLoadDelta).toFixed(2))
      : null;
  const latestLoad = entry.latest?.maxLoad ?? null;

  const trailText =
    startLoad !== null && latestLoad !== null
      ? `${startLoad} → ${latestLoad} kg`
      : latestLoad !== null
        ? `${latestLoad} kg`
        : '—';

  const ariaLabel = `${entry.exerciseName ?? '—'}: ${trailText}${trendValue !== null ? `, variação ${trendValue}%` : ''}`;

  return (
    <li
      className="progression-row"
      role="link"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
    >
      <div className="progression-row-main">
        <span className="progression-row-name">{entry.exerciseName ?? '—'}</span>
        <span className="progression-row-trail">
          {startLoad !== null && (
            <span className="progression-row-trail-arrow">
              {startLoad}
              <span className="progression-row-trail-arrow"> → </span>
            </span>
          )}
          <span className="progression-row-trail-end">{latestLoad !== null ? `${latestLoad} kg` : '—'}</span>
        </span>
      </div>

      <ProgressionSparkline
        loadHistory={loadHistory}
        deltaPct={trendValue}
        hidden={!showSpark}
      />

      <TrendChip
        deltaPct={trendValue}
        ariaLabel={trendValue !== null ? `Variação ${trendValue}%` : 'Sem comparativo'}
      />

      <span className="progression-row-side">
        <ChevronRight size={14} strokeWidth={2} aria-hidden="true" />
      </span>
    </li>
  );
};

ProgressionRow.propTypes = {
  entry: PropTypes.shape({
    exerciseId: PropTypes.string,
    exerciseName: PropTypes.string,
    hasLoad: PropTypes.bool,
    sessionCount: PropTypes.number,
    loadHistory: PropTypes.arrayOf(PropTypes.number),
    latest: PropTypes.shape({ maxLoad: PropTypes.number }),
    trend: PropTypes.shape({
      maxLoadDelta: PropTypes.number,
      maxLoadDeltaPct: PropTypes.number,
    }),
    trainingId: PropTypes.string,
  }).isRequired,
  onOpen: PropTypes.func.isRequired,
};

export default ProgressionRow;
