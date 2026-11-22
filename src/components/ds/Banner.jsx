import PropTypes from 'prop-types';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { t } from '../../i18n';

const TONE_ICON = { info: Info, warning: TriangleAlert, error: CircleAlert, success: CircleCheck };
const TONE_ROLE = { info: 'note', warning: 'note', error: 'alert', success: 'status' };

/**
 * Inline explanatory banner (`.ds-banner`, feedback bg + text pair). Explains a rule where it
 * applies; the `error` tone is announced as an alert, `success` as a status. May carry one
 * `action` (e.g. a retry button) and, with `onDismiss`, a "Fechar aviso" icon button.
 */
const Banner = ({ tone = 'info', children, action, onDismiss }) => {
  const Icon = TONE_ICON[tone];
  const toneClass = tone === 'info' ? '' : ` ds-banner--${tone}`;
  const dismissClass = onDismiss ? ' ds-banner--dismissible' : '';
  const dismissLabel = t('banner.dismiss');
  return (
    <div className={`ds-banner ds-banner--inline${toneClass}${dismissClass}`} role={TONE_ROLE[tone]}>
      <span className="ds-banner__icon" aria-hidden="true">
        <Icon size={20} strokeWidth={2} />
      </span>
      <p className="ds-banner__text type-body">{children}</p>
      {action}
      {onDismiss && (
        <button
          type="button"
          className="icon-button ds-banner__dismiss"
          aria-label={dismissLabel}
          title={dismissLabel}
          onClick={onDismiss}
        >
          <X size={20} strokeWidth={2} aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

Banner.propTypes = {
  tone: PropTypes.oneOf(['info', 'warning', 'error', 'success']),
  children: PropTypes.node.isRequired,
  action: PropTypes.node,
  onDismiss: PropTypes.func,
};

export default Banner;
