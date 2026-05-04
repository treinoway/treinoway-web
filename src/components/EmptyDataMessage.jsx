import PropTypes from 'prop-types';

/**
 * Typed empty state for the activity dashboard. Each variant is a documented
 * conversation in the refined design — wrapping them here keeps copy + a11y
 * structure consistent across blocks.
 */
const EmptyDataMessage = ({ title, description, action }) => (
  <div className="empty-data" role="status">
    <p className="empty-data-title">{title}</p>
    {description && <p className="empty-data-description text-sm text-muted">{description}</p>}
    {action && <div className="empty-data-action">{action}</div>}
  </div>
);

EmptyDataMessage.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  action: PropTypes.node,
};

export default EmptyDataMessage;
