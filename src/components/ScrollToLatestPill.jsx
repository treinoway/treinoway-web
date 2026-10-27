import PropTypes from 'prop-types';
import { ArrowDown } from 'lucide-react';
import { t } from '../i18n';

// Pill above the composer that jumps to the newest reply; removed from the accessibility tree while hidden.
const ScrollToLatestPill = ({ onClick, visible }) => (
  <div className={`scroll-pill${visible ? '' : ' scroll-pill--hidden'}`} aria-hidden={!visible}>
    <button
      type="button"
      className="btn btn--secondary scroll-pill__btn"
      onClick={onClick}
      aria-label={t('iArnold.scrollPill.aria')}
      tabIndex={visible ? 0 : -1}
    >
      <ArrowDown size={16} strokeWidth={2} aria-hidden="true" />
      {t('iArnold.scrollPill.new')}
    </button>
  </div>
);

ScrollToLatestPill.propTypes = {
  onClick: PropTypes.func.isRequired,
  visible: PropTypes.bool.isRequired,
};

export default ScrollToLatestPill;
