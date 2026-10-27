import { useRef } from 'react';
import PropTypes from 'prop-types';

const OPTIONS = [
  { value: 'sunday', label: 'Dom' },
  { value: 'monday', label: 'Seg' },
  { value: 'tuesday', label: 'Ter' },
  { value: 'wednesday', label: 'Qua' },
  { value: 'thursday', label: 'Qui' },
  { value: 'friday', label: 'Sex' },
  { value: 'saturday', label: 'Sáb' },
  { value: '', label: 'Sem dia' },
];

const ARROW_STEP = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 };

// "1 treino" / "2 treinos" for the day counter.
const formatTrainingCount = (count) => `${count} ${count === 1 ? 'treino' : 'treinos'}`;

// One selectable day pill with an informational count of the trainings already on that day.
const DayPill = ({ option, checked, count, tabbable, buttonRef, onSelect, onKeyDown }) => (
  <button
    ref={buttonRef}
    type="button"
    role="radio"
    aria-checked={checked}
    tabIndex={tabbable ? 0 : -1}
    className={`weekday-picker__pill${checked ? ' weekday-picker__pill--active' : ''}`}
    onClick={() => onSelect(option.value)}
    onKeyDown={onKeyDown}
  >
    {option.label}
    {count > 0 && (
      <>
        <span className="weekday-picker__count" aria-hidden="true">{count}</span>
        <span className="visually-hidden">{`, ${formatTrainingCount(count)}`}</span>
      </>
    )}
  </button>
);

DayPill.propTypes = {
  option: PropTypes.shape({ value: PropTypes.string, label: PropTypes.string }).isRequired,
  checked: PropTypes.bool.isRequired,
  count: PropTypes.number.isRequired,
  tabbable: PropTypes.bool.isRequired,
  buttonRef: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
  onKeyDown: PropTypes.func.isRequired,
};

// Optional single-choice weekday radiogroup (roving tabindex + arrow keys) with per-day training counts.
const WeekDayPicker = ({ value, counts = {}, onChange }) => {
  const pillRefs = useRef([]);

  const handleKeyDown = (event, index) => {
    const step = ARROW_STEP[event.key];
    if (!step) return;
    event.preventDefault();
    const nextIndex = (index + step + OPTIONS.length) % OPTIONS.length;
    onChange(OPTIONS[nextIndex].value);
    pillRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="field">
      <span className="field-label type-caption-strong" id="weekday-picker-label">Dia do treino (opcional)</span>
      <div className="weekday-picker" role="radiogroup" aria-labelledby="weekday-picker-label">
        {OPTIONS.map((option, index) => (
          <DayPill
            key={option.value || 'none'}
            option={option}
            checked={value === option.value}
            count={counts[option.value] ?? 0}
            tabbable={value === option.value}
            buttonRef={(node) => { pillRefs.current[index] = node; }}
            onSelect={onChange}
            onKeyDown={(event) => handleKeyDown(event, index)}
          />
        ))}
      </div>
    </div>
  );
};

WeekDayPicker.propTypes = {
  value: PropTypes.string.isRequired,
  counts: PropTypes.objectOf(PropTypes.number),
  onChange: PropTypes.func.isRequired,
};

export default WeekDayPicker;
