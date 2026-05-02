import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Repeat, Timer } from 'lucide-react';

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];
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
}) => {
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
    const clamped = Math.min(numeric, MAX_DURATION_SECONDS);
    onChange({ duration: String(clamped) });
    onClearDurationError?.();
  };

  const handleDurationChipClick = (seconds) => {
    onChange({ duration: String(seconds) });
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
    ? DURATION_PRESETS.find((p) => p === durationValueNumber) ?? null
    : null;

  const setsId = `${idPrefix}-sets`;
  const durationId = `${idPrefix}-duration`;
  const repsMinId = `${idPrefix}-repetitions-min`;
  const repsMaxId = `${idPrefix}-repetitions-max`;

  return (
    <div className="prescription-field">
      {/* Inline mode toggle */}
      <div
        className="segmented-toggle segmented-toggle--mode-switch"
        role="tablist"
        aria-label="Tipo de prescrição"
      >
        <button
          type="button"
          role="tab"
          aria-selected={!isDurationMode}
          className={`segmented-toggle-btn${!isDurationMode ? ' segmented-toggle-btn--active' : ''}`}
          onClick={() => handleModeSwitch('reps')}
        >
          <Repeat size={16} strokeWidth={2} className="toggle-icon" aria-hidden="true" />
          Repetições
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={isDurationMode}
          className={`segmented-toggle-btn${isDurationMode ? ' segmented-toggle-btn--active' : ''}`}
          onClick={() => handleModeSwitch('duration')}
        >
          <Timer size={16} strokeWidth={2} className="toggle-icon" aria-hidden="true" />
          Tempo
        </button>
      </div>

      {/* 2-col grid: Séries + Reps|Duração */}
      <div className="prescription-row">
        <div>
          <label className="form-label" htmlFor={setsId}>Séries</label>
          <input
            id={setsId}
            type="number"
            min="1"
            value={formData.sets}
            onChange={(e) => handleSetsChange(e.target.value)}
            className="form-input"
          />
        </div>

        {isDurationMode ? (
          <div>
            <label className="form-label" htmlFor={durationId}>Duração</label>
            <div className="form-input-with-suffix">
              <input
                ref={durationInputRef}
                id={durationId}
                type="number"
                min="1"
                max={MAX_DURATION_SECONDS}
                value={formData.duration}
                onChange={(e) => handleDurationInputChange(e.target.value)}
                className={`form-input${durationError ? ' form-input--error' : ''}`}
                placeholder="ex: 45"
                aria-describedby={durationError ? `${durationId}-error` : undefined}
              />
              <span className="form-input-suffix" aria-hidden="true">s</span>
            </div>
            {durationError && (
              <span id={`${durationId}-error`} className="form-error" role="alert">
                {durationError}
              </span>
            )}
            {showLongDurationHint && !durationError && (
              <span className="form-hint">
                Mais de 10 minutos. Confirme se é o pretendido.
              </span>
            )}
          </div>
        ) : (
          <div>
            <span className="form-label">Repetições</span>
            <div className="prescription-reps-row">
              <input
                ref={repsMinInputRef}
                id={repsMinId}
                type="number"
                min="1"
                max={MAX_REPS}
                value={formData.repetitionsMin}
                onChange={(e) => handleRepsMinChange(e.target.value)}
                className={`form-input${repsError ? ' form-input--error' : ''}`}
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
                className={`form-input${repsError ? ' form-input--error' : ''}`}
                aria-label="Repetições máximas"
                placeholder="Máx"
              />
            </div>
            {repsError && (
              <span id={`${repsMinId}-error`} className="form-error" role="alert">
                {repsError}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Duration preset chips — only in duration mode */}
      {isDurationMode && (
        <div
          className="prescription-chips"
          role="group"
          aria-label="Atalhos de duração"
        >
          {DURATION_PRESETS.map((seconds) => {
            const isActive = activeChip === seconds;
            return (
              <button
                key={seconds}
                type="button"
                className={`prescription-chip${isActive ? ' prescription-chip--active' : ''}`}
                onClick={() => handleDurationChipClick(seconds)}
                aria-pressed={isActive}
              >
                {seconds}s
              </button>
            );
          })}
        </div>
      )}

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
};

export default PrescriptionField;
