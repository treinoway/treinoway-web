import PropTypes from 'prop-types';
import { Info, TriangleAlert } from 'lucide-react';

const TONE_ICON = { info: Info, warning: TriangleAlert };

/**
 * Inline explanatory banner (`.ds-banner`, feedback bg + text pair). Used inside
 * forms and sheets to explain a rule where it applies; not dismissible.
 */
const Banner = ({ tone = 'info', children }) => {
  const Icon = TONE_ICON[tone];
  return (
    <div className={`ds-banner ds-banner--inline${tone === 'warning' ? ' ds-banner--warning' : ''}`} role="note">
      <span className="ds-banner__icon" aria-hidden="true">
        <Icon size={20} strokeWidth={2} />
      </span>
      <p className="ds-banner__text type-body">{children}</p>
    </div>
  );
};

Banner.propTypes = {
  tone: PropTypes.oneOf(['info', 'warning']),
  children: PropTypes.node.isRequired,
};

export default Banner;
