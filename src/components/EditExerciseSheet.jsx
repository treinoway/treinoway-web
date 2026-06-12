import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { AlertTriangle, X } from 'lucide-react';
import NumberStepper from './NumberStepper';
import RestQuickChips from './RestQuickChips';
import OneTimeBanner from './OneTimeBanner';
import IntensityField from './IntensityField';
import { formatSnapshotSummaryTokens } from '../utils/exerciseMeta';
import { EXERCISE_INTENSITY_OPTIONS } from '../constants/exerciseIntensity';

const HEAVY_DIRTY_FIELD_COUNT = 3;
const HEAVY_DIRTY_TIME_MS = 20000;

const ONE_TIME_BANNER_KEY = 'treinoway.editExerciseSheet.educationalBanner';

const LIMITS = {
  sets: { min: 1, max: 10 },
  repetitions: { min: 1, max: 50 },
  duration: { min: 1, max: 3600 },
  restInterval: { min: 0, max: 600 },
  suggestedLoad: { min: 0, max: 500 },
};

const MODE_REPS = 'reps';
const MODE_DURATION = 'duration';

const CARDIO_TYPE = 'cardio';

const noop = () => {};

const buildInitialState = (snapshot) => {
  const hasReps = snapshot?.repetitions?.min != null && snapshot?.repetitions?.max != null;
  const hasDuration = snapshot?.duration != null;
  const mode = !hasReps && hasDuration ? MODE_DURATION : MODE_REPS;
  return {
    sets: snapshot?.sets ?? null,
    repetitionsMin: snapshot?.repetitions?.min ?? null,
    repetitionsMax: snapshot?.repetitions?.max ?? null,
    duration: snapshot?.duration ?? null,
    restInterval: snapshot?.restInterval ?? null,
    hasLoad: !!snapshot?.hasLoad,
    suggestedLoad: snapshot?.suggestedLoad ?? null,
    notes: snapshot?.notes ?? '',
    intensity: snapshot?.intensity ?? null,
    mode,
  };
};

const shallowEqualField = (a, b) => {
  if (a == null && b == null) return true;
  return a === b;
};

const countDirtyFields = (initial, current) => {
  let count = 0;
  if (!shallowEqualField(initial.sets, current.sets)) count += 1;
  if (!shallowEqualField(initial.repetitionsMin, current.repetitionsMin)) count += 1;
  if (!shallowEqualField(initial.repetitionsMax, current.repetitionsMax)) count += 1;
  if (!shallowEqualField(initial.duration, current.duration)) count += 1;
  if (!shallowEqualField(initial.restInterval, current.restInterval)) count += 1;
  if (initial.hasLoad !== current.hasLoad) count += 1;
  if (!shallowEqualField(initial.suggestedLoad, current.suggestedLoad)) count += 1;
  if ((initial.notes || '') !== (current.notes || '')) count += 1;
  if (!shallowEqualField(initial.intensity, current.intensity)) count += 1;
  if (initial.mode !== current.mode) count += 1;
  return count;
};

const buildPayload = (state, exerciseType) => {
  const payload = {};
  if (state.sets != null) payload.sets = state.sets;
  payload.prescriptionMode = state.mode === MODE_DURATION ? 'duration' : 'reps';
  if (state.mode === MODE_REPS) {
    if (state.repetitionsMin != null && state.repetitionsMax != null) {
      payload.repetitions = {
        min: state.repetitionsMin,
        max: state.repetitionsMax,
      };
    } else {
      payload.repetitions = null;
    }
    payload.duration = null;
  } else {
    payload.duration = state.duration;
    payload.repetitions = null;
  }
  payload.restInterval = state.restInterval;
  payload.hasLoad = state.hasLoad;
  payload.suggestedLoad = state.hasLoad ? state.suggestedLoad : null;
  payload.notes = state.notes?.trim() ? state.notes.trim() : null;
  payload.intensity = exerciseType === CARDIO_TYPE ? (state.intensity ?? null) : null;
  return payload;
};

const validate = (state) => {
  const errors = {};
  if (state.sets == null) {
    errors.sets = 'Informe o número de séries.';
  }
  if (state.mode === MODE_REPS) {
    if (state.repetitionsMin == null || state.repetitionsMax == null) {
      errors.repetitions = 'Informe repetições ou duração.';
    } else if (state.repetitionsMin > state.repetitionsMax) {
      errors.repetitions = 'Rep. mínima não pode ser maior que a máxima.';
    }
  } else if (state.duration == null) {
    errors.repetitions = 'Informe repetições ou duração.';
  }
  if (state.restInterval != null && state.restInterval < 0) {
    errors.restInterval = 'Descanso não pode ser negativo.';
  }
  if (state.hasLoad && state.suggestedLoad != null && state.suggestedLoad < 0) {
    errors.suggestedLoad = 'Carga não pode ser negativa.';
  }
  return errors;
};

/**
 * Bottom sheet for editing the snapshot of an exercise within a training template.
 * Sheet stays open until save succeeds. Dismissal while dirty triggers either an
 * undo toast (light) or a confirm dialog (heavy) based on amount of changes and
 * time spent in the sheet.
 */
const EditExerciseSheet = ({
  snapshot,
  exerciseName,
  sourceDeleted = false,
  onSubmit,
  onClose,
  onLightDiscard,
}) => {
  const exerciseType = snapshot?.type;
  const isCardio = exerciseType === CARDIO_TYPE;
  const initialState = useMemo(() => buildInitialState(snapshot), [snapshot]);
  const [state, setState] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const openedAtRef = useRef(Date.now());

  useEffect(() => {
    openedAtRef.current = Date.now();
  }, []);

  const updateState = useCallback((patch) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleNumericChange = (key) => (nextValue) => {
    updateState({ [key]: nextValue });
  };

  const handleRepMinChange = (nextValue) => {
    updateState({ repetitionsMin: nextValue });
  };

  const handleRepMaxChange = (nextValue) => {
    updateState({ repetitionsMax: nextValue });
  };

  const handleModeChange = (nextMode) => {
    if (nextMode === state.mode) return;
    updateState({ mode: nextMode });
  };

  const handleHasLoadChange = (event) => {
    updateState({ hasLoad: event.target.checked });
  };

  const handleIntensityChange = (value) => {
    updateState({ intensity: value });
  };

  const handleIntensityClear = () => {
    updateState({ intensity: null });
  };

  const dirtyCount = countDirtyFields(initialState, state);
  const isDirty = dirtyCount > 0;

  const requestClose = useCallback(() => {
    if (saving) return;
    if (!isDirty) {
      onClose();
      return;
    }
    const elapsed = Date.now() - openedAtRef.current;
    if (dirtyCount >= HEAVY_DIRTY_FIELD_COUNT || elapsed >= HEAVY_DIRTY_TIME_MS) {
      setConfirmDiscard(true);
      return;
    }
    if (onLightDiscard) {
      onLightDiscard(initialState);
    }
    onClose();
  }, [dirtyCount, initialState, isDirty, onClose, onLightDiscard, saving]);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        requestClose();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [requestClose]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate(state);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSaving(true);
    try {
      const payload = buildPayload(state, exerciseType);
      await onSubmit(payload);
    } finally {
      setSaving(false);
    }
  };

  const summaryTokens = formatSnapshotSummaryTokens({
    sets: state.sets,
    repetitions: state.mode === MODE_REPS && state.repetitionsMin != null && state.repetitionsMax != null
      ? { min: state.repetitionsMin, max: state.repetitionsMax }
      : null,
    duration: state.mode === MODE_DURATION ? state.duration : null,
    restInterval: state.restInterval,
    hasLoad: state.hasLoad,
    suggestedLoad: state.suggestedLoad,
  });

  const confirmDiscardDialog = confirmDiscard ? (
    <div className="overlay" onClick={() => setConfirmDiscard(false)}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <p className="confirm-dialog-message">Descartar alterações?</p>
        <div className="btn-group">
          <button
            type="button"
            className="btn-danger"
            style={{ flex: 1 }}
            onClick={() => {
              setConfirmDiscard(false);
              onClose();
            }}
          >
            Descartar
          </button>
          <button
            type="button"
            className="btn-secondary"
            style={{ flex: 1 }}
            onClick={() => setConfirmDiscard(false)}
          >
            Continuar editando
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="overlay" onClick={requestClose}>
        <div
          className="bottom-sheet edit-exercise-sheet"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={`Editar ${exerciseName}`}
        >
          <div className="bottom-sheet-header edit-exercise-sheet__header">
            <div>
              <h3 className="bottom-sheet-title">{exerciseName}</h3>
              {summaryTokens && (
                <span className="edit-exercise-sheet__summary" aria-live="polite">
                  {summaryTokens.map((token, index) => (
                    <span key={index}>
                      {index > 0 && (
                        <span className="edit-exercise-sheet__summary-dot" aria-hidden="true">·</span>
                      )}
                      <span className="edit-exercise-sheet__summary-number">{token.value}</span>
                      <span className="edit-exercise-sheet__summary-unit">{token.unit}</span>
                    </span>
                  ))}
                </span>
              )}
            </div>
            <button
              type="button"
              className="bottom-sheet-close"
              onClick={requestClose}
              aria-label="Fechar"
              disabled={saving}
            >
              <X size={20} strokeWidth={2} />
            </button>
          </div>

          <div className="bottom-sheet-body">
            <OneTimeBanner
              storageKey={ONE_TIME_BANNER_KEY}
              text="Mudanças aqui só valem para este template."
            />

            {sourceDeleted && (
              <div className="edit-exercise-sheet__warning" role="note">
                <AlertTriangle size={16} strokeWidth={2} />
                <span>
                  Exercício original removido — as alterações ficam salvas neste template.
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="edit-exercise-sheet__form">
              <div className="edit-exercise-sheet__section">
                <NumberStepper
                  label="Séries"
                  value={state.sets}
                  onChange={handleNumericChange('sets')}
                  min={LIMITS.sets.min}
                  max={LIMITS.sets.max}
                  disabled={saving}
                />
                {errors.sets && (
                  <span className="form-error" role="alert">{errors.sets}</span>
                )}

                <div
                  className="segmented-toggle"
                  role="tablist"
                  aria-label="Tipo de medida"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={state.mode === MODE_REPS}
                    className={`segmented-toggle-btn${state.mode === MODE_REPS ? ' segmented-toggle-btn--active' : ''}`}
                    onClick={() => handleModeChange(MODE_REPS)}
                    disabled={saving}
                  >
                    Repetições
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={state.mode === MODE_DURATION}
                    className={`segmented-toggle-btn${state.mode === MODE_DURATION ? ' segmented-toggle-btn--active' : ''}`}
                    onClick={() => handleModeChange(MODE_DURATION)}
                    disabled={saving}
                  >
                    Tempo
                  </button>
                </div>

                {state.mode === MODE_REPS ? (
                  <div className="edit-exercise-sheet__reps-row">
                    <NumberStepper
                      label="Rep. mínimas"
                      value={state.repetitionsMin}
                      onChange={handleRepMinChange}
                      min={LIMITS.repetitions.min}
                      max={LIMITS.repetitions.max}
                      disabled={saving}
                    />
                    <NumberStepper
                      label="Rep. máximas"
                      value={state.repetitionsMax}
                      onChange={handleRepMaxChange}
                      min={LIMITS.repetitions.min}
                      max={LIMITS.repetitions.max}
                      disabled={saving}
                    />
                  </div>
                ) : (
                  <NumberStepper
                    label="Duração"
                    value={state.duration}
                    onChange={handleNumericChange('duration')}
                    min={LIMITS.duration.min}
                    max={LIMITS.duration.max}
                    unit="s"
                    disabled={saving}
                  />
                )}
                {errors.repetitions && (
                  <span className="form-error" role="alert">{errors.repetitions}</span>
                )}
              </div>

              {isCardio && (
                <div className="edit-exercise-sheet__section">
                  <IntensityField
                    idPrefix="edit-exercise"
                    type={exerciseType}
                    intensity={state.intensity}
                    options={EXERCISE_INTENSITY_OPTIONS}
                    onChange={handleIntensityChange}
                    onClear={handleIntensityClear}
                    onKeepCardio={noop}
                  />
                </div>
              )}

              <div className="edit-exercise-sheet__section">
                <NumberStepper
                  label="Descanso"
                  value={state.restInterval}
                  onChange={handleNumericChange('restInterval')}
                  min={LIMITS.restInterval.min}
                  max={LIMITS.restInterval.max}
                  unit="s"
                  disabled={saving}
                />
                <RestQuickChips
                  value={state.restInterval}
                  onChange={handleNumericChange('restInterval')}
                  disabled={saving}
                />
                {errors.restInterval && (
                  <span className="form-error" role="alert">{errors.restInterval}</span>
                )}
              </div>

              <div className="form-checkbox-row">
                <input
                  type="checkbox"
                  id="edit-exercise-sheet-has-load"
                  checked={state.hasLoad}
                  onChange={handleHasLoadChange}
                  disabled={saving}
                />
                <label
                  htmlFor="edit-exercise-sheet-has-load"
                  className="form-label mb-0"
                >
                  Exercício com carga
                </label>
              </div>

              {state.hasLoad && (
                <>
                  <NumberStepper
                    label="Carga"
                    value={state.suggestedLoad}
                    onChange={handleNumericChange('suggestedLoad')}
                    min={LIMITS.suggestedLoad.min}
                    max={LIMITS.suggestedLoad.max}
                    unit="kg"
                    disabled={saving}
                  />
                  {errors.suggestedLoad && (
                    <span className="form-error" role="alert">{errors.suggestedLoad}</span>
                  )}
                </>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="edit-exercise-sheet-notes">
                  Observações
                </label>
                <textarea
                  id="edit-exercise-sheet-notes"
                  className="form-textarea"
                  rows={3}
                  value={state.notes}
                  onChange={(event) => updateState({ notes: event.target.value })}
                  disabled={saving}
                  placeholder="Orientações ou anotações deste exercício"
                />
              </div>

              <div className="edit-exercise-sheet__footer">
                <button
                  type="submit"
                  className="btn-primary btn-primary-full"
                  disabled={saving}
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {confirmDiscardDialog}
    </>
  );
};

EditExerciseSheet.propTypes = {
  snapshot: PropTypes.shape({
    id: PropTypes.string,
    type: PropTypes.string,
    intensity: PropTypes.string,
    sets: PropTypes.number,
    repetitions: PropTypes.shape({
      min: PropTypes.number,
      max: PropTypes.number,
    }),
    duration: PropTypes.number,
    restInterval: PropTypes.number,
    hasLoad: PropTypes.bool,
    suggestedLoad: PropTypes.number,
    notes: PropTypes.string,
  }).isRequired,
  exerciseName: PropTypes.string.isRequired,
  sourceDeleted: PropTypes.bool,
  onSubmit: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onLightDiscard: PropTypes.func,
};

export default EditExerciseSheet;
