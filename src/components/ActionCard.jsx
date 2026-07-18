import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

/**
 * Reusable Home/Dashboard action tile — extracted from the previously
 * copy-pasted .quick-action-card markup. Renders as a <Link> when `to` is
 * given, otherwise as a <button> driving `onClick`.
 */
const ActionCard = ({
  icon: Icon,
  title,
  description,
  to = null,
  onClick = null,
  variant = 'default',
  loading = false,
  disabled = false,
}) => {
  const cardClass = [
    'quick-action-card',
    variant === 'primary' ? 'quick-action-card--highlight' : '',
    variant === 'ai' ? 'quick-action-card--ai' : '',
  ].filter(Boolean).join(' ');

  const content = (
    <>
      <div className="quick-action-icon">
        <Icon size={20} strokeWidth={2} />
      </div>
      <span className="quick-action-label">{loading ? 'Carregando...' : title}</span>
      <p className="quick-action-desc">{description}</p>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={cardClass}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled || loading} className={cardClass}>
      {content}
    </button>
  );
};

ActionCard.propTypes = {
  icon: PropTypes.elementType.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  to: PropTypes.string,
  onClick: PropTypes.func,
  variant: PropTypes.oneOf(['default', 'primary', 'ai']),
  loading: PropTypes.bool,
  disabled: PropTypes.bool,
};

export default ActionCard;
