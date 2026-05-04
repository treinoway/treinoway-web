import PropTypes from 'prop-types';
import { Sparkles } from 'lucide-react';

/**
 * Floating "Perguntar ao iArnold" button anchored to the activity tab.
 *
 * Visual emphasis is conditional on completionRate per the refined design:
 * solid fill when below 50%, ghost outline otherwise. No pulsing animation.
 *
 * Layout: absolute on mobile (bottom of the scroll area, above the bottom nav);
 * docked on the right rail on desktop via CSS.
 */
const IArnoldFAB = ({ emphasized, label, onClick, disabled }) => {
  const className = `iarnold-fab${emphasized ? ' iarnold-fab--emphasized' : ''}`;
  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      <Sparkles size={18} strokeWidth={2} aria-hidden="true" />
      <span className="iarnold-fab-label">{label}</span>
    </button>
  );
};

IArnoldFAB.propTypes = {
  emphasized: PropTypes.bool,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default IArnoldFAB;
