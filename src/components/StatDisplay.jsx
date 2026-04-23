const resolveTrendDirection = (trend, trendDirection) => {
  if (trendDirection) return trendDirection;
  if (!trend) return 'neutral';
  if (trend.startsWith('+')) return 'up';
  if (trend.startsWith('-')) return 'down';
  return 'neutral';
};

import PropTypes from 'prop-types';

const StatDisplay = ({ value, unit, label, trend, trendDirection, variant = 'default', className }) => {
  const resolvedDirection = resolveTrendDirection(trend, trendDirection);

  const containerClass = [
    'stat-display',
    variant !== 'default' ? `stat-display--${variant}` : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClass}>
      <span className="stat-display-value">
        {value}
        {unit && <span className="stat-display-unit">{unit}</span>}
      </span>
      <div className="stat-display-footer">
        <span className="stat-display-label">{label}</span>
        {trend && (
          <span className={`stat-display-trend stat-display-trend--${resolvedDirection}`}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
};

StatDisplay.propTypes = {
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  unit: PropTypes.string,
  label: PropTypes.string,
  trend: PropTypes.string,
  trendDirection: PropTypes.oneOf(['up', 'down', 'neutral']),
  variant: PropTypes.string,
  className: PropTypes.string,
};

export default StatDisplay;
