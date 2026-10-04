import PropTypes from 'prop-types';
import {
  getIntensityTier,
  getIntensityFallbackLabel,
} from '../constants/exerciseIntensity';

const TONE_BY_TIER = { 1: 'success', 2: 'success', 3: 'brand', 4: 'warning', 5: 'error' };

/**
 * Read-only intensity badge (DS Tag badge). Renders nothing when there is no
 * intensity key. Tone follows the effort tier (feedback bg + text pairs).
 *
 * Prefer the API-provided `label` (`intensityLabel`); falls back to the
 * pt-BR static label only when the payload omits it.
 */
const IntensityBadge = ({ intensity, label }) => {
  if (!intensity) return null;
  const tier = getIntensityTier(intensity);
  if (!tier) return null;
  const text = label || getIntensityFallbackLabel(intensity);

  return (
    <span className={`badge badge--tag badge--${TONE_BY_TIER[tier] || 'neutral'} intensity-badge`} data-tier={tier}>
      {text}
    </span>
  );
};

IntensityBadge.propTypes = {
  intensity: PropTypes.string,
  label: PropTypes.string,
};

IntensityBadge.defaultProps = {
  intensity: null,
  label: null,
};

export default IntensityBadge;
