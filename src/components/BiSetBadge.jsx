import PropTypes from 'prop-types';
import { Layers } from 'lucide-react';
import { t } from '../i18n';

/**
 * Static "Bi-set" badge shown at the top-left of a grouped exercise
 * container. Purely informational — dissolving a group is done through the
 * trash button next to it.
 */
const BiSetBadge = ({ ariaLabel }) => {
  const label = t('exerciseGroup.biset') || 'Bi-set';

  return (
    <span className="badge badge--tag badge--brand biset-badge" aria-label={ariaLabel || label}>
      <Layers size={16} strokeWidth={2} aria-hidden="true" />
      {label}
    </span>
  );
};

BiSetBadge.propTypes = {
  ariaLabel: PropTypes.string,
};

export default BiSetBadge;
