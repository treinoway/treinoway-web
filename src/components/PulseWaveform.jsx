import { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import PulseTooltip from './PulseTooltip';
import { statusToFillModifier } from '../constants/dashboardViz';

const TOTAL_BARS = 30;
// Bars at index < LEFT_THRESHOLD get left-anchored tooltip (tooltip grows right)
const LEFT_THRESHOLD = 4;
// Bars at index >= RIGHT_THRESHOLD get right-anchored tooltip (tooltip grows left)
const RIGHT_THRESHOLD = 26;

const computeAnchorDir = (barIndex) => {
  if (barIndex < LEFT_THRESHOLD) return 'left';
  if (barIndex >= RIGHT_THRESHOLD) return 'right';
  return 'center';
};

const formatAxisDate = (dateStr) => {
  if (!dateStr) return '';
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const [, month, day] = dateStr.split('-').map(Number);
  if (!month || !day) return '';
  return `${day} ${months[month - 1]}`;
};

/**
 * 30-bar pulse waveform. Bar height encodes effort (volume); bar colour + cap glyph
 * encodes session status. Today marker = vertical hairline + "HOJE" tag.
 * Tooltip on hover/focus with keyboard navigation.
 *
 * @param {object}   props
 * @param {object[]} props.bars         - From computeWaveformBars()
 * @param {boolean}  props.loading      - Show skeleton shimmer
 */
const PulseWaveform = ({ bars, loading }) => {
  const [focusedIndex, setFocusedIndex] = useState(null);

  // Close tooltip when Escape is pressed
  useEffect(() => {
    if (focusedIndex === null) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setFocusedIndex(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex]);

  const handleBarKeyDown = useCallback((e, index) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setFocusedIndex(index);
    }
  }, []);

  // Render ghost bars when loading or no data
  const displayBars = bars && bars.length > 0 ? bars : Array.from({ length: TOTAL_BARS }, () => ({
    date: null,
    status: 'empty',
    volumeKg: null,
    pct: 0,
    trainingName: null,
    completedSets: 0,
    totalSets: 0,
    isToday: false,
    _ghost: true,
  }));

  const firstBar = displayBars[0];
  const lastBar = displayBars[displayBars.length - 1];

  return (
    <div className={`pulse-wave${loading ? '' : ''}`}>
      <div className="pulse-wave-axis" aria-hidden="true">
        <span>{formatAxisDate(firstBar?.date)}</span>
        <span>{formatAxisDate(lastBar?.date)}</span>
      </div>

      <div
        className={`pulse-wave-bars${loading ? '' : ''}`}
        role="group"
        aria-label="Atividade dos últimos 30 dias"
      >
        {displayBars.map((bar, index) => {
          const fillModifier = bar._ghost ? 'ghost' : statusToFillModifier(bar.status);
          const isToday = bar.isToday;
          const isFocused = focusedIndex === index;
          const anchorDir = computeAnchorDir(index);
          const isEmpty = bar.status === 'empty' || bar._ghost;

          const barClassNames = [
            'pulse-bar',
            isToday ? 'pulse-bar--today' : '',
            isFocused ? 'pulse-bar--focus' : '',
          ].filter(Boolean).join(' ');

          const fillClassNames = [
            'pulse-bar-fill',
            `pulse-bar-fill--${fillModifier}`,
          ].join(' ');

          const heightStyle = isEmpty
            ? undefined
            : { height: `${bar.pct}%` };

          return (
            <div
              key={bar.date ?? index}
              className={barClassNames}
              tabIndex={isEmpty ? -1 : 0}
              role={isEmpty ? undefined : 'button'}
              aria-label={
                isEmpty
                  ? undefined
                  : `${bar.date}: ${bar.status}${bar.trainingName ? `, ${bar.trainingName}` : ''}`
              }
              aria-expanded={isFocused || undefined}
              onMouseEnter={() => !isEmpty && setFocusedIndex(index)}
              onMouseLeave={() => setFocusedIndex(null)}
              onFocus={() => !isEmpty && setFocusedIndex(index)}
              onBlur={() => setFocusedIndex(null)}
              onKeyDown={(e) => !isEmpty && handleBarKeyDown(e, index)}
            >
              <div
                className={fillClassNames}
                style={heightStyle}
              />
              {isFocused && bar.date && (
                <PulseTooltip
                  date={bar.date}
                  status={bar.status}
                  trainingName={bar.trainingName}
                  volumeKg={bar.volumeKg}
                  completedSets={bar.completedSets}
                  totalSets={bar.totalSets}
                  anchorDir={anchorDir}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="pulse-wave-key" aria-hidden="true">
        <span className="pulse-wave-key-item">
          <span className="pulse-wave-key-swatch pulse-wave-key-swatch--success" />
          Concluído
        </span>
        <span className="pulse-wave-key-item">
          <span className="pulse-wave-key-swatch pulse-wave-key-swatch--partial" />
          Parcial
        </span>
        <span className="pulse-wave-key-item">
          <span className="pulse-wave-key-swatch pulse-wave-key-swatch--danger" />
          Abandonado
        </span>
        <span className="pulse-wave-key-meta">altura = volume</span>
      </div>
    </div>
  );
};

PulseWaveform.propTypes = {
  bars: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.string,
      status: PropTypes.oneOf(['completed', 'partial', 'abandoned', 'empty']),
      volumeKg: PropTypes.number,
      pct: PropTypes.number,
      trainingName: PropTypes.string,
      completedSets: PropTypes.number,
      totalSets: PropTypes.number,
      isToday: PropTypes.bool,
    }),
  ),
  loading: PropTypes.bool,
};

PulseWaveform.defaultProps = {
  bars: [],
  loading: false,
};

export default PulseWaveform;
