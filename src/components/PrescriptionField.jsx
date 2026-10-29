import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Repeat, Timer } from 'lucide-react';
import { t } from '../i18n';
import Segmented from './ds/Segmented';
import DurationUnitToggle from './DurationUnitToggle';

const DURATION_PRESETS = [15, 30, 60, 90, 120];
const DURATION_PRESETS_MINUTES = [10, 15, 20, 30, 45];
const SECONDS_PER_MINUTE = 60;

// Default duration unit: minutes for cardio (new, or an existing duration in whole minutes), seconds otherwise.
const getDefaultUnit = (type, initialDuration) => {
  if (type !== 'cardio') return 'seg';
  const seconds = Number(initialDuration);
  return !seconds || seconds % SECONDS_PER_MINUTE === 0 ? 'min' : 'seg';
};
const LONG_DURATION_THRESHOLD_SECONDS = 600;
const MAX_DURATION_SECONDS = 9999;
const MAX_REPS = 999;

/**
 * Prescription section: inline mode toggle (segmented), 2-col grid (Séries + Reps|Duração),
 * optional duration chips.
 *
 * No internal section header — the parent wraps this in a .form-section with the title.
 */
const PrescriptionField = ({
  idPrefix,
  formData,
  onChange,
  durationError,
  onClearDurationError,
  repsError,
  onClearRepsError,
  exerciseType = '',
  trailing = null,
}) => {
  const [initialDuration] = useState(formData.duration);
  const [chosenUnit, setChosenUnit] = useState(null);
  const durationUnit = chosenUnit ?? getDefaultUnit(exerciseType, initialDuration);
  const isMinutes = durationUnit === 'min';
  const unitFactor = isMinutes ? SECONDS_PER_MINUTE : 1;
  const durationPresets = isMinutes ? DURATION_PRESETS_MINUTES : DURATION_PRESETS;
  const durationInputRef = useRef(null);
  const repsMinInputRef = useRef(null);
  const focusAfterSwitchRef = useRef(false);

  // Auto-focus the new mode's primary input after a mode switch.
  useEffect(() => {
    if (!focusAfterSwitchRef.current) return;
    focusAfterSwitchRef.current = false;
    if (formData.prescriptionMode === 'duration') {
      durationInputRef.current?.focus();
    } else {
      repsMinInputRef.current?.focus();
    }
  }, [formData.prescriptionMode]);

  const handleModeSwitch = (newMode) => {
    if (newMode === formData.prescriptionMode) return;
    focusAfterSwitchRef.current = true;
    onChange({
      prescriptionMode: newMode,
      duration: '',
      repetitionsMin: '',
      repetitionsMax: '',
    });
    onClearDurationError?.();
    onClearRepsError?.();
  };

  const handleSetsChange = (value) => {
    onChange({ sets: value });
  };

  const handleDurationInputChange = (rawValue) => {
    if (rawValue === '') {
      onChange({ duration: '' });
      onClearDurationError?.();
      return;
    }
    const numeric = Number(rawValue);
    if (!Number.isFinite(numeric)) return;
    const clamped = Math.min(Math.round(numeric * unitFactor), MAX_DURATION_SECONDS);
    onChange({ duration: String(clamped) });
    onClearDurationError?.();
  };

  const handleDurationChipClick = (amount) => {
    onChange({ duration: String(amount * unitFactor) });
    onClearDurationError?.();
    durationInputRef.current?.blur();
  };

  const handleRepsMinChange = (rawValue) => {
    if (rawValue === '') {
      onChange({ repetitionsMin: '' });
      onClearRepsError?.();
      return;
    }
    const numeric = Number(rawValue);
    if (!Number.isFinite(numeric)) return;
    const clamped = Math.min(Math.max(numeric, 0), MAX_REPS);
    onChange({ repetitionsMin: String(clamped) });
    onClearRepsError?.();
  };

  const handleRepsMaxChange = (rawValue) => {
    if (rawValue === '') {
      onChange({ repetitionsMax: '' });
      onClearRepsError?.();
      return;
    }
    const numeric = Number(rawValue);
    if (!Number.isFinite(numeric)) return;
    const clamped = Math.min(Math.max(numeric, 0), MAX_REPS);
    onChange({ repetitionsMax: String(clamped) });
    onClearRepsError?.();
  };

  const isDurationMode = formData.prescriptionMode === 'duration';
  const durationValueNumber = formData.duration === '' ? null : Number(formData.duration);
  const showLongDurationHint =
    isDurationMode &&
    durationValueNumber != null &&
    durationValueNumber >= LONG_DURATION_THRESHOLD_SECONDS;
  const activeChip = isDurationMode
    ? durationPresets.find((p) => p * unitFactor === durationValueNumber) ?? null
    : null;
  const durationDisplayValue = formData.duration === '' ? '' : String(durationValueNumber / unitFactor);

  const renderDurationChips = () => (
    <div className="chip-group" role="group" aria-label="Atalhos de duração">
      {durationPresets.map((amount) => {
        const isActive = activeChip === amount;
        return (
          <button
            key={amount}
            type="button"
            className={`chip${isActive ? ' chip--active' : ''}`}
            onClick={() => handleDurationChipClick(amount)}
            aria-pressed={isActive}
          >
            {amount}{isMinutes ? 'min' : 's'}
          </button>
        );
      })}
    </div>
  );

  const setsId = `${idPrefix}-sets`;
  const durationId = `${idPrefix}-duration`;
  const repsMinId = `${idPrefix}-repetitions-min`;
  const repsMaxId = `${idPrefix}-repetitions-max`;

  return (
    <div className="prescription-field">
      {/* Mode toggle with label */}
      <div className="field">
        <span className="field-label type-caption-strong">{t('exercise.prescriptionMode.label')}</span>
        <Segmented
          ariaLabel="Modo de prescrição"
          items={[
            { id: 'reps', label: 'Repetições', icon: Repeat },
            { id: 'duration', label: 'Tempo', icon: Timer },
          ]}
          value={isDurationMode ? 'duration' : 'reps'}
          onChange={handleModeSwitch}
        />
      </div>

      {/* 2-col grid: Séries + Reps|Duração */}
      <div className="prescription-row">
        <div>
          <label className="field-label type-caption-strong" htmlFor={setsId}>Séries</label>
          <input
            id={setsId}
            type="number"
            min="1"
            value={formData.sets}
            onChange={(e) => handleSetsChange(e.target.value)}
            className="input"
          />
        </div>

        {isDurationMode ? (
          <div>
            <div className="field-label-row">
              <label className="field-label type-caption-strong" htmlFor={durationId}>Duração</label>
              <DurationUnitToggle value={durationUnit} onChange={setChosenUnit} />
            </div>
            <div className="form-input-with-suffix">
              <input
                ref={durationInputRef}
                id={durationId}
                type="number"
                min="1"
                max={MAX_DURATION_SECONDS / unitFactor}
                step={isMinutes ? 'any' : undefined}
                value={durationDisplayValue}
                onChange={(e) => handleDurationInputChange(e.target.value)}
                className={`input${durationError ? ' input--error' : ''}`}
                placeholder="ex: 45"
                aria-describedby={durationError ? `${durationId}-error` : undefined}
              />
              <span className="form-input-suffix" aria-hidden="true">{durationUnit}</span>
            </div>
            {renderDurationChips()}
            {durationError && (
              <span id={`${durationId}-error`} className="field-error type-caption" role="alert">
                {durationError}
              </span>
            )}
            {showLongDurationHint && !durationError && (
              <span className="field-hint type-caption">
                Mais de 10 minutos. Confirme se é o pretendido.
              </span>
            )}
          </div>
        ) : (
          <div>
            <span className="field-label type-caption-strong">Repetições</span>
            <div className="prescription-reps-row">
              <input
                ref={repsMinInputRef}
                id={repsMinId}
                type="number"
                min="1"
                max={MAX_REPS}
                value={formData.repetitionsMin}
                onChange={(e) => handleRepsMinChange(e.target.value)}
                className={`input${repsError ? ' input--error' : ''}`}
                aria-label="Repetições mínimas"
                placeholder="Mín"
                aria-describedby={repsError ? `${repsMinId}-error` : undefined}
              />
              <input
                id={repsMaxId}
                type="number"
                min="1"
                max={MAX_REPS}
                value={formData.repetitionsMax}
                onChange={(e) => handleRepsMaxChange(e.target.value)}
                className={`input${repsError ? ' input--error' : ''}`}
                aria-label="Repetições máximas"
                placeholder="Máx"
              />
            </div>
            {repsError && (
              <span id={`${repsMinId}-error`} className="field-error type-caption" role="alert">
                {repsError}
              </span>
            )}
          </div>
        )}
        {trailing}
      </div>
    </div>
  );
};

PrescriptionField.propTypes = {
  idPrefix: PropTypes.string.isRequired,
  formData: PropTypes.shape({
    prescriptionMode: PropTypes.oneOf(['reps', 'duration']).isRequired,
    sets: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    repetitionsMin: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    repetitionsMax: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    duration: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
  onChange: PropTypes.func.isRequired,
  durationError: PropTypes.string,
  onClearDurationError: PropTypes.func,
  repsError: PropTypes.string,
  onClearRepsError: PropTypes.func,
  /** Drives the default duration unit (cardio defaults to minutes); the stored value is always seconds. */
  exerciseType: PropTypes.string,
  /** Extra grid cell rendered after the reps/duration field (e.g. the rest interval). */
  trailing: PropTypes.node,
};

export default PrescriptionField;
