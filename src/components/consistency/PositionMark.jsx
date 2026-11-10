import PropTypes from 'prop-types';

const MEDAL_TONES = { 1: 'gold', 2: 'silver', 3: 'bronze' };
const ENTERING_PLACEHOLDER = '—';

// Podium medal for 1st to 3rd, plain ordinal beyond, a dash while entering; tied students share the same number
const PositionMark = ({ position }) => {
  if (position === null || position === undefined) {
    return <span className="consistency-position consistency-position--empty">{ENTERING_PLACEHOLDER}</span>;
  }
  const tone = MEDAL_TONES[position];
  if (tone) {
    return <span className={`consistency-medal consistency-medal--${tone}`}>{`${position}º`}</span>;
  }
  return <span className="consistency-position">{`${position}º`}</span>;
};

PositionMark.propTypes = {
  position: PropTypes.number,
};

export default PositionMark;
