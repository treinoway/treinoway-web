import PropTypes from 'prop-types';
import { Sparkles } from 'lucide-react';
import useAiAccess from '../hooks/useAiAccess';

/**
 * Floating "Perguntar ao iArnold" button anchored to the activity tab.
 *
 * Visual emphasis is conditional on completionRate per the refined design:
 * solid fill when below 50%, ghost outline otherwise. No pulsing animation.
 *
 * Layout: absolute on mobile (bottom of the scroll area, above the bottom nav);
 * docked on the right rail on desktop via CSS.
 *
 * The plan gate lives here (not at the call sites) so every mount point is
 * covered — plans without AI would otherwise get a 403 from the backend.
 */
const IArnoldFAB = ({ emphasized, label, onClick, disabled }) => {
  const canUseAi = useAiAccess();
  const className = `iarnold-fab${emphasized ? ' iarnold-fab--emphasized' : ''}`;

  if (!canUseAi) return null;

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
