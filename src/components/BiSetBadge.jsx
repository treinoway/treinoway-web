import PropTypes from 'prop-types';
import { Layers } from 'lucide-react';
import { t } from '../i18n';

/**
 * Tappable "Bi-set" badge shown at the top-left of a grouped exercise
 * container. Exposes role="button" semantics so it can open the bi-set
 * actions sheet (dissolve, edit order, etc.). When `onClick` is omitted
 * the badge renders as a static label.
 */
const BiSetBadge = ({ onClick, ariaLabel }) => {
  const label = t('exerciseGroup.biset') || 'Bi-set';
  const isInteractive = typeof onClick === 'function';
  const className = `badge badge--tag badge--brand biset-badge${isInteractive ? '' : ' biset-badge--static'}`;

  if (!isInteractive) {
    return (
      <span className={className} aria-label={ariaLabel || label}>
        <Layers size={16} strokeWidth={2} aria-hidden="true" />
        {label}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      aria-label={ariaLabel || label}
    >
      <Layers size={16} strokeWidth={2} aria-hidden="true" />
      {label}
    </button>
  );
};

BiSetBadge.propTypes = {
  onClick: PropTypes.func,
  ariaLabel: PropTypes.string,
};

export default BiSetBadge;
