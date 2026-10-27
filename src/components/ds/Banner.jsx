import PropTypes from 'prop-types';
import { CircleAlert, Info, TriangleAlert } from 'lucide-react';

const TONE_ICON = { info: Info, warning: TriangleAlert, error: CircleAlert };
const TONE_ROLE = { info: 'note', warning: 'note', error: 'alert' };

/**
 * Inline explanatory banner (`.ds-banner`, feedback bg + text pair). Used inside
 * forms and sheets to explain a rule where it applies; not dismissible. The `error`
 * tone is announced as an alert and may carry one `action` (e.g. a retry button).
 */
const Banner = ({ tone = 'info', children, action }) => {
  const Icon = TONE_ICON[tone];
  const toneClass = tone === 'info' ? '' : ` ds-banner--${tone}`;
  return (
    <div className={`ds-banner ds-banner--inline${toneClass}`} role={TONE_ROLE[tone]}>
      <span className="ds-banner__icon" aria-hidden="true">
        <Icon size={20} strokeWidth={2} />
      </span>
      <p className="ds-banner__text type-body">{children}</p>
      {action}
    </div>
  );
};

Banner.propTypes = {
  tone: PropTypes.oneOf(['info', 'warning', 'error']),
  children: PropTypes.node.isRequired,
  action: PropTypes.node,
};

export default Banner;
