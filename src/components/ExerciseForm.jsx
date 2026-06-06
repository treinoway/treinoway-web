import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Select from '../components/Select';
import VideoField from './VideoField';
import PrescriptionField from './PrescriptionField';
import IntensityField from './IntensityField';
import { useToast } from '../contexts/ToastContext';
import { translateError } from '../i18n';
import api from '../api/axios';
import { EXERCISE_TYPE_OPTIONS } from '../constants/exerciseTypes';
import { EXERCISE_INTENSITY_OPTIONS } from '../constants/exerciseIntensity';

const INTENSITY_REQUIRES_CARDIO_CODE = 'exercise.intensityRequiresCardio';

const EMPTY_FORM = {
  name: '',
  type: '',
  videoUrl: '',
  prescriptionMode: 'reps',
  sets: '',
  repetitionsMin: '',
  repetitionsMax: '',
  duration: '',
  restInterval: '',
  hasLoad: true,
  suggestedLoad: '',
  notes: '',
  intensity: null,
};

const buildPayload = (data) => {
  const payload = {
    name: data.name,
    type: data.type,
    hasLoad: data.hasLoad,
    prescriptionMode: data.prescriptionMode,
  };
  payload.videoUrl = data.videoUrl?.trim() ? data.videoUrl.trim() : null;
  if (data.sets !== '' && data.sets != null) payload.sets = parseInt(data.sets, 10);

  if (data.prescriptionMode === 'duration') {
    if (data.duration !== '' && data.duration != null) {
      payload.duration = parseInt(data.duration, 10);
    }
  } else if (
    data.repetitionsMin !== '' && data.repetitionsMin != null &&
    data.repetitionsMax !== '' && data.repetitionsMax != null
  ) {
    payload.repetitions = {
      min: parseInt(data.repetitionsMin, 10),
      max: parseInt(data.repetitionsMax, 10),
    };
  }

  if (data.restInterval !== '' && data.restInterval != null) {
    payload.restInterval = parseInt(data.restInterval, 10);
  }
  if (data.hasLoad && data.suggestedLoad !== '' && data.suggestedLoad != null) {
    payload.suggestedLoad = parseFloat(data.suggestedLoad, 10);
  }
  if (data.notes?.trim()) payload.notes = data.notes.trim();
  // Intensity is cardio-only: retained in local state, stripped from the payload
  // for any non-cardio type. PATCH clears it explicitly with null.
  if (data.type === 'cardio') {
    payload.intensity = data.intensity || null;
  } else {
    payload.intensity = null;
  }
  return payload;
};

const buildInitialForm = (exercise) => {
  if (!exercise) return EMPTY_FORM;
  return {
    name: exercise.name || '',
    type: exercise.type || '',
    videoUrl: exercise.videoUrl || '',
    prescriptionMode: exercise.prescriptionMode ?? 'reps',
    sets: exercise.sets ?? '',
    repetitionsMin: exercise.repetitions?.min ?? '',
    repetitionsMax: exercise.repetitions?.max ?? '',
    duration: exercise.duration ?? '',
    restInterval: exercise.restInterval ?? '',
    hasLoad: exercise.hasLoad || false,
    suggestedLoad: exercise.suggestedLoad ?? '',
    notes: exercise.notes || '',
    intensity: exercise.intensity ?? null,
  };
};

const ExerciseForm = ({ trainingId, exercise, onSuccess, onCancel, headerContent }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [durationError, setDurationError] = useState('');
  const [repsError, setRepsError] = useState('');
  const [intensityError, setIntensityError] = useState('');
  const [formData, setFormData] = useState(() => buildInitialForm(exercise));
  const isEditing = !!exercise?.id;
  const isDraftMode = !isEditing && !trainingId;

  useEffect(() => {
    setFormData(buildInitialForm(exercise));
    setDurationError('');
    setRepsError('');
    setIntensityError('');
  }, [exercise]);

  const handlePrescriptionChange = useCallback((patch) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  }, []);

  const clearDurationError = useCallback(() => setDurationError(''), []);
  const clearRepsError = useCallback(() => setRepsError(''), []);

  const handleIntensityChange = useCallback((value) => {
    setIntensityError('');
    setFormData((prev) => ({ ...prev, intensity: value }));
  }, []);

  const handleIntensityClear = useCallback(() => {
    setIntensityError('');
    setFormData((prev) => ({ ...prev, intensity: null }));
  }, []);

  const handleKeepCardio = useCallback(() => {
    setIntensityError('');
    setFormData((prev) => ({ ...prev, type: 'cardio' }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.prescriptionMode === 'duration') {
      if (!formData.duration || Number(formData.duration) < 1) {
        setDurationError('Defina o valor antes de salvar.');
        return;
      }
    } else if (!formData.repetitionsMin || !formData.repetitionsMax) {
      setRepsError('Defina o valor antes de salvar.');
      return;
    }

    const payload = buildPayload(formData);

    if (isDraftMode) {
      onSuccess?.(payload);
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        await api.patch(`/trainer/exercises/${exercise.id}`, payload);
        showToast('Exercício atualizado com sucesso!', 'success');
      } else {
        await api.post(`/trainer/trainings/${trainingId}/exercises`, payload);
        showToast('Exercício adicionado com sucesso!', 'success');
      }
      onSuccess?.();
    } catch (error) {
      const message = error.userMessage || translateError(error);
      if (error.response?.data?.messageCode === INTENSITY_REQUIRES_CARDIO_CODE) {
        setIntensityError(message);
      } else {
        showToast(message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {headerContent}
      <form onSubmit={handleSubmit} className="form" noValidate>
        <div>
          <label className="form-label" htmlFor="exercise-form-name">
            Nome <span aria-hidden="true" className="form-label-required">*</span>
          </label>
          <input
            id="exercise-form-name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="form-input"
            required
            autoFocus
          />
        </div>

        <div>
          <label className="form-label" htmlFor="exercise-form-type">
            Tipo <span aria-hidden="true" className="form-label-required">*</span>
          </label>
          <Select
            id="exercise-form-type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            required
          >
            <option value="">Selecione...</option>
            {EXERCISE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </div>

        <IntensityField
          idPrefix="exercise-form"
          type={formData.type}
          intensity={formData.intensity}
          options={EXERCISE_INTENSITY_OPTIONS}
          errorMessage={intensityError}
          onChange={handleIntensityChange}
          onClear={handleIntensityClear}
          onKeepCardio={handleKeepCardio}
        />

        <VideoField
          value={formData.videoUrl}
          onChange={(url) => setFormData((prev) => ({ ...prev, videoUrl: url }))}
        />

        <PrescriptionField
          idPrefix="exercise-form"
          formData={formData}
          onChange={handlePrescriptionChange}
          durationError={durationError}
          onClearDurationError={clearDurationError}
          repsError={repsError}
          onClearRepsError={clearRepsError}
        />

        <div>
          <label className="form-label" htmlFor="exercise-form-restInterval">
            Intervalo de descanso (segundos)
          </label>
          <input
            id="exercise-form-restInterval"
            type="number"
            min="0"
            value={formData.restInterval}
            onChange={(e) => setFormData({ ...formData, restInterval: e.target.value })}
            className="form-input"
            placeholder="Ex: 60"
          />
        </div>

        <div className="form-checkbox-row">
          <input
            type="checkbox"
            id="exercise-form-hasLoad"
            checked={formData.hasLoad}
            onChange={(e) => setFormData({ ...formData, hasLoad: e.target.checked })}
          />
          <label htmlFor="exercise-form-hasLoad" className="form-label mb-0">
            Exercício com carga
          </label>
        </div>

        {formData.hasLoad && (
          <div>
            <label className="form-label" htmlFor="exercise-form-suggestedLoad">
              Carga sugerida (Kg)
            </label>
            <input
              id="exercise-form-suggestedLoad"
              type="number"
              min="0"
              step="0.5"
              value={formData.suggestedLoad}
              onChange={(e) => setFormData({ ...formData, suggestedLoad: e.target.value })}
              className="form-input"
            />
          </div>
        )}

        <div>
          <label className="form-label" htmlFor="exercise-form-notes">Observações</label>
          <textarea
            id="exercise-form-notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="form-textarea"
            placeholder="Orientações ou anotações sobre este exercício"
          />
        </div>

        <div className="btn-group">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Salvando...' : isEditing ? 'Salvar' : 'Adicionar Exercício'}
          </button>
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancelar
          </button>
        </div>
      </form>
    </>
  );
};

ExerciseForm.propTypes = {
  trainingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  exercise: PropTypes.object,
  onSuccess: PropTypes.func,
  onCancel: PropTypes.func.isRequired,
  headerContent: PropTypes.node,
};

export default ExerciseForm;
