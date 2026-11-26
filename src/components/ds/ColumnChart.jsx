import PropTypes from 'prop-types';

// Height of a bar as a percentage of the largest value of the chart (0% when every value is zero).
const barHeight = (value, max) => (max > 0 ? `${Math.round((value / max) * 1000) / 10}%` : '0%');

// Largest value across every column and series.
const largestValue = (columns) =>
  columns.reduce((max, column) => Math.max(max, ...column.values.map((value) => value || 0)), 0);

// Screen-reader text of one column: its label followed by the value of every series.
const columnSummary = (column, series) =>
  `${column.label}: ${series.map((serie, index) => `${serie.label} ${(column.values[index] || 0).toLocaleString('pt-BR')}`).join(', ')}`;

// Grouped column chart (one bar per series per column, `--chart-*` colors by series position) announced as one image plus a screen-reader list of the values.
const ColumnChart = ({ ariaLabel, series, columns }) => {
  const max = largestValue(columns);
  return (
    <>
      <div className="column-chart" role="img" aria-label={ariaLabel}>
        <div className="column-chart__plot">
          {columns.map((column) => (
            <div key={column.label} className="column-chart__column">
              <div className="column-chart__group">
                {series.map((serie, index) => (
                  <span
                    key={serie.id}
                    className={`column-chart__bar column-chart__bar--series-${index + 1}`}
                    style={{ height: barHeight(column.values[index] || 0, max) }}
                  />
                ))}
              </div>
              <span className="column-chart__label type-caption">{column.label}</span>
            </div>
          ))}
        </div>
        <ul className="column-chart__legend type-caption">
          {series.map((serie, index) => (
            <li key={serie.id} className="column-chart__legend-item">
              <span className={`column-chart__swatch column-chart__bar--series-${index + 1}`} />
              {serie.label}
            </li>
          ))}
        </ul>
      </div>
      <ul className="visually-hidden">
        {columns.map((column) => (
          <li key={column.label}>{columnSummary(column, series)}</li>
        ))}
      </ul>
    </>
  );
};

ColumnChart.propTypes = {
  ariaLabel: PropTypes.string.isRequired,
  series: PropTypes.arrayOf(
    PropTypes.shape({ id: PropTypes.string.isRequired, label: PropTypes.string.isRequired })
  ).isRequired,
  columns: PropTypes.arrayOf(
    PropTypes.shape({ label: PropTypes.string.isRequired, values: PropTypes.arrayOf(PropTypes.number).isRequired })
  ).isRequired,
};

export default ColumnChart;
