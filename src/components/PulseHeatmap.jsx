import PropTypes from 'prop-types';
import { volumeToIntensityStep } from '../constants/dashboardViz';

/**
 * Computes the CSS cell modifier class for a heatmap day.
 * @param {{ status: string, volumeKg: number|null, inPeriod: boolean }} day
 * @param {number} maxVolumeKg
 * @returns {string}
 */
const cellModifier = (day, maxVolumeKg) => {
  if (!day.inPeriod) return '';
  switch (day.status) {
    case 'completed':
      return `pulse-heatmap-cell--${volumeToIntensityStep(day.volumeKg, maxVolumeKg)}`;
    case 'partial':
      return 'pulse-heatmap-cell--partial';
    case 'abandoned':
      return 'pulse-heatmap-cell--abandoned';
    default:
      return '';
  }
};

/**
 * Heatmap grid for periods ≥ 60 days.
 * Weeks run top-to-bottom (rows), days Mon–Sun run left-to-right (columns).
 * Today gets a ring + "HOJE" tag (flipped below if it lands on first row).
 *
 * @param {object}   props
 * @param {object[]} props.weeks      - From computeHeatmapWeeks()
 * @param {string[]} props.dowLabels  - 7-element array ['Seg','Ter',…,'Dom']
 * @param {number}   props.maxVolumeKg
 */
const PulseHeatmap = ({ weeks, dowLabels, maxVolumeKg }) => (
  <div className="pulse-heatmap" aria-label="Mapa de atividade">
    {/* Day-of-week axis */}
    <div className="pulse-heatmap-axis-top" aria-hidden="true">
      <span>{/* week-label column placeholder */}</span>
      {dowLabels.map((d) => (
        <span key={d}>{d}</span>
      ))}
    </div>

    {/* Grid: each week is a row of 8 cells (1 label + 7 days) */}
    <div className="pulse-heatmap-grid" role="grid" aria-label="Semanas de atividade">
      {weeks.map((week, wi) => (
        <div key={week.label ?? wi} role="row" style={{ display: 'contents' }}>
          {/* Week label */}
          <span
            className="pulse-heatmap-week-label"
            role="rowheader"
            aria-label={`Semana de ${week.label}`}
          >
            {week.label}
          </span>

          {/* Day cells */}
          {week.days.map((day) => {
            const modifier = cellModifier(day, maxVolumeKg);
            const todayClass = day.isToday
              ? ` pulse-heatmap-cell--today${day.isFirstRow ? ' pulse-heatmap-cell--today--first-row' : ''}`
              : '';
            const className = `pulse-heatmap-cell${modifier ? ` ${modifier}` : ''}${todayClass}`;
            const label = day.inPeriod
              ? `${day.date}: ${day.status}`
              : day.date;

            return (
              <div
                key={day.date}
                className={className}
                role="gridcell"
                aria-label={label}
                title={label}
              />
            );
          })}
        </div>
      ))}
    </div>

    {/* Inline legend */}
    <div className="pulse-heatmap-legend" aria-hidden="true">
      <span>Menos</span>
      <span className="pulse-heatmap-legend-scale">
        <span className="pulse-heatmap-legend-swatch pulse-heatmap-legend-swatch--empty" />
        <span className="pulse-heatmap-legend-swatch pulse-heatmap-cell--s1" />
        <span className="pulse-heatmap-legend-swatch pulse-heatmap-cell--s2" />
        <span className="pulse-heatmap-legend-swatch pulse-heatmap-cell--s3" />
        <span className="pulse-heatmap-legend-swatch pulse-heatmap-cell--s4" />
      </span>
      <span>Mais</span>
    </div>
  </div>
);

PulseHeatmap.propTypes = {
  weeks: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      days: PropTypes.arrayOf(
        PropTypes.shape({
          date: PropTypes.string.isRequired,
          status: PropTypes.string,
          volumeKg: PropTypes.number,
          isToday: PropTypes.bool,
          isFirstRow: PropTypes.bool,
          inPeriod: PropTypes.bool,
        }),
      ).isRequired,
    }),
  ).isRequired,
  dowLabels: PropTypes.arrayOf(PropTypes.string).isRequired,
  maxVolumeKg: PropTypes.number,
};

PulseHeatmap.defaultProps = {
  maxVolumeKg: 0,
};

export default PulseHeatmap;
