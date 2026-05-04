import PropTypes from 'prop-types';
import { Check, AlertTriangle, X } from 'lucide-react';

/**
 * Renders a small ✓/⚠/✕ icon next to a KPI so adherence is conveyed without relying
 * on color alone. Status thresholds are caller-controlled so the same component can
 * back completion rate, attendance, etc.
 *
 * @param {'success'|'warning'|'danger'} status
 */
const SemanticStatusIcon = ({ status, size = 16, label }) => {
  const Icon = status === 'success' ? Check : status === 'danger' ? X : AlertTriangle;
  const wrapperClass = `semantic-status-icon semantic-status-icon--${status}`;
  return (
    <span className={wrapperClass} role="img" aria-label={label}>
      <Icon size={size} strokeWidth={2} aria-hidden="true" />
    </span>
  );
};

SemanticStatusIcon.propTypes = {
  status: PropTypes.oneOf(['success', 'warning', 'danger']).isRequired,
  size: PropTypes.number,
  label: PropTypes.string.isRequired,
};

export default SemanticStatusIcon;
