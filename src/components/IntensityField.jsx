import PropTypes from 'prop-types';
import { AlertTriangle, AlertCircle, Archive, HeartPulse, X } from 'lucide-react';
import IntensityRamp from './IntensityRamp';
import { getIntensityTier, getIntensityFallbackLabel } from '../constants/exerciseIntensity';

/**
 * Conditional intensity field for the exercise editors.
 *
 * Behaviour:
 *   - When the effective type is cardio: render the ramp.
 *   - When the type was flipped away from cardio while an intensity is still
 *     retained in local state: render the type-flip warning banner with the
 *     retained-but-inert ramp (value kept, stripped from payload, never zeroed).
 *   - When the type is non-cardio and no intensity is retained: render nothing.
 *   - When a defensive 400 (`exercise.intensityRequiresCardio`) slips through:
 *     render an inline role="alert" error with a "Remover intensidade" action.
 *
 * `onKeepCardio` re-selects cardio; `onClear` strips the intensity entirely.
 */
const IntensityField = ({
  idPrefix,
  type,
  intensity,
  options,
  errorMessage,
  onChange,
  onClear,
  onKeepCardio,
}) => {
  const isCardio = type === 'cardio';
  const hasRetainedIntensity = !isCardio && !!intensity;

  if (!isCardio && !hasRetainedIntensity && !errorMessage) {
    return null;
  }

  if (errorMessage) {
    return (
      <div className="intensity-field">
        <IntensityRamp
          idPrefix={idPrefix}
          value={intensity}
          options={options}
          onChange={onChange}
          onClear={onClear}
          error
        />
        <div className="form-error" role="alert">
          <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
          <div className="intensity-warning-body">
            <span>{errorMessage}</span>
            <div className="intensity-warning-actions">
              <button
                type="button"
                className="intensity-inline-action intensity-inline-action--ghost"
                onClick={onClear}
              >
                <X size={13} strokeWidth={2} aria-hidden="true" />
                Remover intensidade
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (hasRetainedIntensity) {
    const retainedLabel = options.find((opt) => opt.value === intensity)?.label
      || getIntensityFallbackLabel(intensity);
    const tier = getIntensityTier(intensity);
    return (
      <div className="intensity-field">
        <div className="intensity-warning" role="status">
          <AlertTriangle size={16} strokeWidth={2} aria-hidden="true" />
          <div className="intensity-warning-body">
            <div>
              Intensidade é exclusiva de cardio.{' '}
              <strong>&quot;{retainedLabel}&quot;</strong> ficará guardada e não
              será enviada enquanto o tipo não for Cardio. Volte para Cardio para
              reativá-la.
            </div>
            <div className="intensity-warning-actions">
              <button
                type="button"
                className="intensity-inline-action intensity-inline-action--primary"
                onClick={onKeepCardio}
              >
                <HeartPulse size={13} strokeWidth={2} aria-hidden="true" />
                Manter Cardio
              </button>
              <button
                type="button"
                className="intensity-inline-action intensity-inline-action--ghost"
                onClick={onClear}
              >
                <X size={13} strokeWidth={2} aria-hidden="true" />
                Remover intensidade
              </button>
            </div>
          </div>
        </div>

        <div className="intensity-field intensity-field--retained">
          <div className="intensity-label-row">
            <span className="form-label intensity-field-label" id={`${idPrefix}-retained-label`}>
              Intensidade (guardada)
            </span>
            <span className="intensity-acsm-tag">
              <Archive size={12} strokeWidth={2} aria-hidden="true" /> Não enviada
            </span>
          </div>
          <div
            className="intensity-ramp"
            role="radiogroup"
            aria-labelledby={`${idPrefix}-retained-label`}
            aria-disabled="true"
          >
            <div
              className="intensity-step intensity-step--active"
              role="radio"
              aria-checked="true"
              tabIndex={-1}
              data-tier={tier}
            >
              <span className="intensity-step-bar" aria-hidden="true" />
              <span className="intensity-step-name">{retainedLabel}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <IntensityRamp
      idPrefix={idPrefix}
      value={intensity}
      options={options}
      onChange={onChange}
      onClear={onClear}
    />
  );
};

IntensityField.propTypes = {
  idPrefix: PropTypes.string.isRequired,
  type: PropTypes.string,
  intensity: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ).isRequired,
  errorMessage: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  onKeepCardio: PropTypes.func.isRequired,
};

IntensityField.defaultProps = {
  type: '',
  intensity: null,
  errorMessage: null,
};

export default IntensityField;
