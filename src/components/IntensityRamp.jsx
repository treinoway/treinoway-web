import { useRef } from 'react';
import PropTypes from 'prop-types';
import { Info, X } from 'lucide-react';
import {
  EXERCISE_INTENSITY_KEYS,
  getIntensityTier,
  getIntensityFallbackLabel,
} from '../constants/exerciseIntensity';

/**
 * ACSM cardio intensity selector rendered as an ordinal effort ramp (radiogroup).
 *
 * Keyboard contract (roving tabindex):
 *   - Exactly one step is in the tab order (the checked one, or the first when
 *     nothing is selected); every other step has tabindex={-1}.
 *   - ArrowLeft/ArrowUp → previous, ArrowRight/ArrowDown → next.
 *   - Home → first, End → last. No wrap.
 *   - Arrow/Home/End move focus AND select (radiogroup semantics).
 *
 * `value` is the intensity key (e.g. "moderate"); the label shown comes from
 * `options` (API categorical labels) and is never translated on the client.
 */
const IntensityRamp = ({
  idPrefix,
  value,
  options,
  onChange,
  onClear,
  disabled,
  error,
}) => {
  const stepRefs = useRef([]);

  const labelId = `${idPrefix}-intensity-label`;
  const selectedIndex = value
    ? EXERCISE_INTENSITY_KEYS.indexOf(value)
    : -1;

  // The single tabbable step: the selected one, or the first when none selected.
  const tabbableIndex = selectedIndex >= 0 ? selectedIndex : 0;

  const selectIndex = (index) => {
    const key = EXERCISE_INTENSITY_KEYS[index];
    if (!key) return;
    onChange(key);
    stepRefs.current[index]?.focus();
  };

  const handleKeyDown = (event, index) => {
    let nextIndex = null;
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = Math.max(0, index - 1);
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = Math.min(EXERCISE_INTENSITY_KEYS.length - 1, index + 1);
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = EXERCISE_INTENSITY_KEYS.length - 1;
        break;
      case ' ':
      case 'Enter':
        nextIndex = index;
        break;
      default:
        return;
    }
    event.preventDefault();
    selectIndex(nextIndex);
  };

  const selectedLabel = value
    ? options.find((opt) => opt.value === value)?.label
      || getIntensityFallbackLabel(value)
    : null;

  return (
    <div className="intensity-field">
      <div className="intensity-label-row">
        <span className="field-label type-caption-strong intensity-field-label" id={labelId}>
          Intensidade
        </span>
        <span className="intensity-acsm-tag type-caption">
          <Info size={16} strokeWidth={2} aria-hidden="true" /> Escala ACSM
        </span>
      </div>

      <div
        className="intensity-ramp"
        role="radiogroup"
        aria-labelledby={labelId}
        aria-disabled={disabled || undefined}
      >
        {EXERCISE_INTENSITY_KEYS.map((key, index) => {
          const option = options.find((opt) => opt.value === key);
          const label = option?.label || getIntensityFallbackLabel(key);
          const tier = getIntensityTier(key);
          const checked = value === key;
          return (
            <button
              key={key}
              type="button"
              ref={(el) => { stepRefs.current[index] = el; }}
              role="radio"
              aria-checked={checked}
              tabIndex={index === tabbableIndex ? 0 : -1}
              data-tier={tier}
              disabled={disabled}
              className={`intensity-step${checked ? ' intensity-step--active' : ''}${error && checked ? ' intensity-step--error' : ''}`}
              onClick={() => selectIndex(index)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              <span className="intensity-step-name type-body-strong">{label}</span>
            </button>
          );
        })}
      </div>

      {value && !disabled && (
        <button type="button" className="btn btn--ghost intensity-clear" onClick={onClear}>
          <X size={16} strokeWidth={2} aria-hidden="true" />
          Sem intensidade definida
        </button>
      )}

      <p className="field-hint type-caption" aria-live="polite">
        {selectedLabel ? (
          <>
            Selecionada: <strong>{selectedLabel}</strong> · opcional. Define o
            alvo de esforço que o aluno verá durante o cardio.
          </>
        ) : (
          'Opcional. Escolha o alvo de esforço que o aluno verá durante o cardio.'
        )}
      </p>
    </div>
  );
};

IntensityRamp.propTypes = {
  idPrefix: PropTypes.string.isRequired,
  value: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ).isRequired,
  onChange: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  error: PropTypes.bool,
};

IntensityRamp.defaultProps = {
  value: null,
  disabled: false,
  error: false,
};

export default IntensityRamp;
