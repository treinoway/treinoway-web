import PropTypes from 'prop-types';

const MetricCard = ({ label, value, support, tone = 'neutral', action }) => (
  <div className={`metric-card metric-card--${tone}`}>
    {action ? (
      <div className="metric-card-header">
        <span className="metric-card-label type-body-strong">{label}</span>
        {action}
      </div>
    ) : (
      <span className="metric-card-label type-body-strong">{label}</span>
    )}
    <span className="metric-card-value type-h2">{value}</span>
    {support && <span className="metric-card-support type-caption">{support}</span>}
  </div>
);

MetricCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  support: PropTypes.string,
  tone: PropTypes.oneOf(['neutral', 'brand', 'warning', 'error']),
  action: PropTypes.node,
};

export default MetricCard;
