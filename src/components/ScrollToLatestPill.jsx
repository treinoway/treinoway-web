import PropTypes from 'prop-types';
import { ArrowDown } from 'lucide-react';

const ScrollToLatestPill = ({ onClick, visible }) => (
  <div
    className={`scroll-pill${visible ? '' : ' scroll-pill--hidden'}`}
    aria-hidden={!visible}
  >
    <button
      type="button"
      className="scroll-pill__btn"
      onClick={onClick}
      aria-label="Ir para a resposta mais recente"
      tabIndex={visible ? 0 : -1}
    >
      <ArrowDown size={14} strokeWidth={2} aria-hidden="true" />
      <span className="scroll-pill__dot scroll-pill__dot--accent" aria-hidden="true" />
      <span className="scroll-pill__label">Ver nova resposta</span>
    </button>
  </div>
);

ScrollToLatestPill.propTypes = {
  onClick: PropTypes.func.isRequired,
  visible: PropTypes.bool.isRequired,
};

export default ScrollToLatestPill;
