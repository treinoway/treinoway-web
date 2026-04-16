import { useId, useState } from 'react';
import PropTypes from 'prop-types';
import { Minus, Plus } from 'lucide-react';

const clamp = (value, min, max) => {
  if (min != null && value < min) return min;
  if (max != null && value > max) return max;
  return value;
};

/**
 * Numeric stepper with minus / plus buttons and a manual numeric input.
 * Controlled by `value`; `onChange` receives a clamped number or null.
 * The component tracks a transient draft only while the input is focused
 * so that typing an intermediate value (e.g. empty or "-") does not fight
 * with the external value.
 */
const NumberStepper = ({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  unit,
  disabled = false,
  inputId,
  ariaLabel,
}) => {
  const generatedId = useId();
  const id = inputId || generatedId;
  const [draft, setDraft] = useState(null);

  const current = value == null ? null : Number(value);

  const displayValue = draft != null
    ? draft
    : current != null
      ? String(current)
      : '';

  const commit = (next) => {
    if (next == null || Number.isNaN(next)) {
      onChange(null);
      return;
    }
    const clamped = clamp(next, min, max);
    onChange(clamped);
  };

  const handleDecrement = () => {
    if (disabled) return;
    setDraft(null);
    const base = current == null ? min ?? 0 : current;
    commit(base - step);
  };

  const handleIncrement = () => {
    if (disabled) return;
    setDraft(null);
    const base = current == null ? min ?? 0 : current;
    commit(base + step);
  };

  const handleInputChange = (event) => {
    const next = event.target.value;
    setDraft(next);
    if (next === '') {
      onChange(null);
      return;
    }
    const parsed = Number(next);
    if (!Number.isNaN(parsed)) {
      onChange(clamp(parsed, min, max));
    }
  };

  const handleFocus = () => {
    setDraft(current != null ? String(current) : '');
  };

  const handleBlur = () => {
    const activeDraft = draft;
    setDraft(null);
    if (activeDraft == null || activeDraft === '') return;
    const parsed = Number(activeDraft);
    if (Number.isNaN(parsed)) return;
    commit(parsed);
  };

  const minusDisabled = disabled || (current != null && min != null && current <= min);
  const plusDisabled = disabled || (current != null && max != null && current >= max);

  return (
    <div className="stepper-row">
      {label && (
        <label className="stepper-label" htmlFor={id}>
          {label}
        </label>
      )}
      <div className="stepper-control">
        <button
          type="button"
          className="stepper-btn"
          onClick={handleDecrement}
          disabled={minusDisabled}
          aria-label={`Diminuir ${label || ariaLabel || 'valor'}`}
        >
          <Minus size={16} strokeWidth={2} />
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          className="stepper-input"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          aria-label={ariaLabel || label}
        />
        {unit && <span className="stepper-unit">{unit}</span>}
        <button
          type="button"
          className="stepper-btn"
          onClick={handleIncrement}
          disabled={plusDisabled}
          aria-label={`Aumentar ${label || ariaLabel || 'valor'}`}
        >
          <Plus size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
};

NumberStepper.propTypes = {
  label: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.oneOf([null])]),
  onChange: PropTypes.func.isRequired,
  min: PropTypes.number,
  max: PropTypes.number,
  step: PropTypes.number,
  unit: PropTypes.string,
  disabled: PropTypes.bool,
  inputId: PropTypes.string,
  ariaLabel: PropTypes.string,
};

export default NumberStepper;
