import { useRef } from 'react';
import PropTypes from 'prop-types';

const UNITS = ['seg', 'min'];
const ARROW_STEP = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 };

// Small "seg | min" radio group (WAI-ARIA: roving tabindex + arrow keys) choosing the duration unit.
const DurationUnitToggle = ({ value, onChange }) => {
  const radioRefs = useRef([]);

  const handleKeyDown = (event, index) => {
    const step = ARROW_STEP[event.key];
    if (!step) return;
    event.preventDefault();
    const nextIndex = (index + step + UNITS.length) % UNITS.length;
    onChange(UNITS[nextIndex]);
    radioRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="unit-toggle" role="radiogroup" aria-label="Unidade da duração">
      {UNITS.map((unit, index) => (
        <button
          key={unit}
          ref={(node) => { radioRefs.current[index] = node; }}
          type="button"
          role="radio"
          aria-checked={value === unit}
          tabIndex={value === unit ? 0 : -1}
          className={`unit-toggle__option${value === unit ? ' unit-toggle__option--active' : ''}`}
          onClick={() => onChange(unit)}
          onKeyDown={(event) => handleKeyDown(event, index)}
        >
          {unit}
        </button>
      ))}
    </div>
  );
};

DurationUnitToggle.propTypes = {
  value: PropTypes.oneOf(['seg', 'min']).isRequired,
  onChange: PropTypes.func.isRequired,
};

export default DurationUnitToggle;
