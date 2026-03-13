import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useToast } from '../contexts/ToastContext';
import { translateError } from '../i18n';
import api from '../api/axios';
import { EXERCISE_TYPE_OPTIONS } from '../constants/exerciseTypes';
import { getYoutubeVideoId } from '../utils/youtube';

const EMPTY_FORM = {
  name: '',
  type: '',
  videoUrl: '',
  sets: '',
  repetitionsMin: '',
  repetitionsMax: '',
  duration: '',
  hasLoad: false,
  suggestedLoad: '',
  notes: '',
};

const buildPayload = (data) => {
  const payload = {
    name: data.name,
    type: data.type,
    hasLoad: data.hasLoad,
  };
  if (data.videoUrl?.trim()) payload.videoUrl = data.videoUrl.trim();
  if (data.sets !== '' && data.sets != null) payload.sets = parseInt(data.sets, 10);
  if (
    data.repetitionsMin !== '' && data.repetitionsMin != null &&
    data.repetitionsMax !== '' && data.repetitionsMax != null
  ) {
    payload.repetitions = {
      min: parseInt(data.repetitionsMin, 10),
      max: parseInt(data.repetitionsMax, 10),
    };
  }
  if (data.duration !== '' && data.duration != null) payload.duration = parseInt(data.duration, 10);
  if (data.hasLoad && data.suggestedLoad !== '' && data.suggestedLoad != null) {
    payload.suggestedLoad = parseFloat(data.suggestedLoad, 10);
  }
  if (data.notes?.trim()) payload.notes = data.notes.trim();
  return payload;
};

const ExerciseForm = ({ trainingId, exercise, onSuccess, onCancel, headerContent }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const isEditing = !!exercise?.id;
  const isDraftMode = !isEditing && !trainingId;

  useEffect(() => {
    if (exercise) {
      setFormData({
        name: exercise.name || '',
        type: exercise.type || '',
        videoUrl: exercise.videoUrl || '',
        sets: exercise.sets ?? '',
        repetitionsMin: exercise.repetitions?.min ?? '',
        repetitionsMax: exercise.repetitions?.max ?? '',
        duration: exercise.duration ?? '',
        hasLoad: exercise.hasLoad || false,
        suggestedLoad: exercise.suggestedLoad ?? '',
        notes: exercise.notes || '',
      });
    } else {
      setFormData(EMPTY_FORM);
    }
  }, [exercise]);

  const handleSubmit = async (e) => {
    e.preventDefault();
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
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {headerContent}
      <form onSubmit={handleSubmit} className="form">
        <div>
          <label className="form-label" htmlFor="exercise-form-name">Nome</label>
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
          <label className="form-label" htmlFor="exercise-form-type">Tipo</label>
          <select
            id="exercise-form-type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="form-select"
            required
          >
            <option value="">Selecione...</option>
            {EXERCISE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label" htmlFor="exercise-form-videoUrl">URL do vídeo</label>
          <input
            id="exercise-form-videoUrl"
            type="url"
            value={formData.videoUrl}
            onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
            className="form-input"
            placeholder="https://..."
          />
          {getYoutubeVideoId(formData.videoUrl) && (
            <div className="youtube-preview" style={{ marginTop: 'var(--spacing-sm)' }}>
              <iframe
                src={`https://www.youtube.com/embed/${getYoutubeVideoId(formData.videoUrl)}`}
                title="Preview do vídeo do exercício"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>

        <div className="grid-responsive-2col">
          <div>
            <label className="form-label" htmlFor="exercise-form-sets">Séries</label>
            <input
              id="exercise-form-sets"
              type="number"
              min="1"
              value={formData.sets}
              onChange={(e) => setFormData({ ...formData, sets: e.target.value })}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Repetições</label>
            <div className="grid-2col" style={{ gap: 'var(--spacing-xs)' }}>
              <input
                id="exercise-form-repetitions-min"
                type="number"
                min="1"
                value={formData.repetitionsMin}
                onChange={(e) => setFormData({ ...formData, repetitionsMin: e.target.value })}
                className="form-input"
                aria-label="Repetições mínimas"
                placeholder="Mín"
              />
              <input
                id="exercise-form-repetitions-max"
                type="number"
                min="1"
                value={formData.repetitionsMax}
                onChange={(e) => setFormData({ ...formData, repetitionsMax: e.target.value })}
                className="form-input"
                aria-label="Repetições máximas"
                placeholder="Máx"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="form-label" htmlFor="exercise-form-duration">Duração em segundos</label>
          <input
            id="exercise-form-duration"
            type="number"
            min="1"
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
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
            <label className="form-label" htmlFor="exercise-form-suggestedLoad">Carga sugerida (kg)</label>
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
