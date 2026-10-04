import PropTypes from 'prop-types';

const EmptyBlock = ({ icon: Icon, title, description, actionLabel, onAction, role }) => (
  <div className="empty-block" role={role}>
    <span className="empty-block__icon" aria-hidden="true">
      <Icon size={32} strokeWidth={2} />
    </span>
    <h2 className="empty-block__title type-h4">{title}</h2>
    {description && <p className="empty-block__description type-body">{description}</p>}
    {actionLabel && (
      <button type="button" className="btn btn--primary" onClick={onAction}>
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
  onAction: PropTypes.func,
  role: PropTypes.string,
};

export default EmptyBlock;
