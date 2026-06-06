import PropTypes from 'prop-types';
import {
  getIntensityTier,
  getIntensityFallbackLabel,
} from '../constants/exerciseIntensity';

/**
 * Read-only intensity badge built on the canonical `.badge` primitive.
 * Renders nothing when there is no intensity key. Color comes from the
 * governed `--effort-tier-*` scale via `data-tier`.
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
    <span className="badge intensity-badge" data-tier={tier}>
      <span className="badge-dot" aria-hidden="true" />
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
