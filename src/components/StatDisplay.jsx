const resolveTrendDirection = (trend, trendDirection) => {
  if (trendDirection) return trendDirection;
  if (!trend) return 'neutral';
  if (trend.startsWith('+')) return 'up';
  if (trend.startsWith('-')) return 'down';
  return 'neutral';
};

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

export default StatDisplay;
