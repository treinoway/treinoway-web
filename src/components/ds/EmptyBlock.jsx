import PropTypes from 'prop-types';

// Empty state of the design system: icon circle, title, description and an optional primary action
const EmptyBlock = ({ icon: Icon, title, description, actionLabel, actionIcon: ActionIcon, onAction, role }) => (
  <div className="empty-block" role={role}>
    <span className="empty-block__icon" aria-hidden="true">
      <Icon size={32} strokeWidth={2} />
    </span>
    <h2 className="empty-block__title type-h4">{title}</h2>
    {description && <p className="empty-block__description type-body">{description}</p>}
    {actionLabel && (
      <button type="button" className="btn btn--primary" onClick={onAction}>
        {ActionIcon && <ActionIcon size={16} strokeWidth={2} aria-hidden="true" />}
        {actionLabel}
      </button>
    )}
  </div>
);

EmptyBlock.propTypes = {
  icon: PropTypes.elementType.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  actionLabel: PropTypes.string,
  actionIcon: PropTypes.elementType,
  onAction: PropTypes.func,
  role: PropTypes.string,
};

export default EmptyBlock;
