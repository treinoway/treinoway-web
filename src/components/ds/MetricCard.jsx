import PropTypes from 'prop-types';

// Card with a label, a big value (optionally followed by a muted suffix such as "/ 17"), a pill under the value and a support line
const MetricCard = ({ label, value, valueSuffix, pill, support, tone = 'neutral', action }) => (
  <div className={`metric-card metric-card--${tone}`}>
    {action ? (
      <div className="metric-card-header">
        <span className="metric-card-label type-body-strong">{label}</span>
        {action}
      </div>
    ) : (
      <span className="metric-card-label type-body-strong">{label}</span>
    )}
    <span className="metric-card-line">
      <span className="metric-card-value type-h2">{value}</span>
      {valueSuffix && <span className="metric-card-suffix type-body">{valueSuffix}</span>}
    </span>
    {pill && <span className="metric-card-pill">{pill}</span>}
    {support && <span className="metric-card-support type-caption">{support}</span>}
  </div>
);

MetricCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  valueSuffix: PropTypes.string,
  pill: PropTypes.node,
  support: PropTypes.string,
  tone: PropTypes.oneOf(['neutral', 'brand', 'warning', 'error']),
  action: PropTypes.node,
};

export default MetricCard;
