import PropTypes from 'prop-types';
import { Sparkles } from 'lucide-react';
import useAiAccess from '../hooks/useAiAccess';

/**
 * Floating "Perguntar ao iArnold" button anchored to the activity tab.
 *
 * Visual emphasis is conditional on completionRate: primary button when below 50%,
 * secondary otherwise. Sticks to the bottom-right, above the bottom nav on mobile.
 *
 * The plan gate lives here (not at the call sites) so every mount point is
 * covered — plans without AI would otherwise get a 403 from the backend.
 */
const IArnoldFAB = ({ emphasized, label, onClick, disabled }) => {
  const canUseAi = useAiAccess();
  const className = `btn ${emphasized ? 'btn--primary' : 'btn--secondary'} iarnold-fab`;

  if (!canUseAi) return null;

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      disabled={disabled}
    >
      <Sparkles size={16} strokeWidth={2} aria-hidden="true" />
      {label}
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
