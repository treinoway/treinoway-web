import PropTypes from 'prop-types';

const DEFAULT_PRESETS = [30, 45, 60, 90, 120, 180];

const formatChipLabel = (seconds) => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  if (remaining === 0) return `${minutes}min`;
  return `${minutes}min ${remaining}s`;
};

const RestQuickChips = ({ value, onChange, presets = DEFAULT_PRESETS, disabled = false }) => (
  <div className="rest-quick-chips" role="group" aria-label="Atalhos de descanso">
    {presets.map((seconds) => {
      const isActive = value === seconds;
      return (
        <button
          key={seconds}
          type="button"
          className={`rest-quick-chip${isActive ? ' rest-quick-chip--active' : ''}`}
          onClick={() => onChange(seconds)}
          disabled={disabled}
          aria-pressed={isActive}
        >
          {formatChipLabel(seconds)}
        </button>
      );
    })}
  </div>
);

RestQuickChips.propTypes = {
  value: PropTypes.number,
  onChange: PropTypes.func.isRequired,
  presets: PropTypes.arrayOf(PropTypes.number),
  disabled: PropTypes.bool,
};

export default RestQuickChips;
