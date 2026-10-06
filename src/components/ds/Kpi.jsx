import PropTypes from 'prop-types';

/**
 * KPI (SKILL §4.11): OVERLINE label, H2 value (tabular-nums) and Caption support,
 * used inside a section card. `tone` recolors only the value.
 */
const Kpi = ({ label, value, support, tone }) => (
  <div className="kpi">
    <span className="kpi-label type-overline">{label}</span>
    <span className={`kpi-value type-h2${tone ? ` kpi-value--${tone}` : ''}`}>{value}</span>
    {support && <span className="kpi-support type-caption">{support}</span>}
  </div>
);

Kpi.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  support: PropTypes.string,
  tone: PropTypes.oneOf(['brand', 'success', 'warning', 'error', 'muted']),
};

export default Kpi;
