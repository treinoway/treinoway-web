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
  isPublic: false,
  sets: '',
  repetitionsMin: '',
  repetitionsMax: '',
  duration: '',
  restInterval: '',
  hasLoad: false,
  suggestedLoad: '',
  notes: '',
};

const buildPayload = (data) => {
  const payload = {
    name: data.name,
    type: data.type,
    isPublic: data.isPublic,
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
  if (data.restInterval !== '' && data.restInterval != null) payload.restInterval = parseInt(data.restInterval, 10);
  if (data.hasLoad && data.suggestedLoad !== '' && data.suggestedLoad != null) {
    payload.suggestedLoad = parseFloat(data.suggestedLoad, 10);
  }
  if (data.notes?.trim()) payload.notes = data.notes.trim();
  return payload;
};

const ExerciseTemplateForm = ({ exerciseTemplate, onSuccess, onCancel }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const isEditing = !!exerciseTemplate?.id;

  useEffect(() => {
    if (exerciseTemplate) {
      setFormData({
        name: exerciseTemplate.name || '',
        type: exerciseTemplate.type || '',
        videoUrl: exerciseTemplate.videoUrl || '',
        isPublic: exerciseTemplate.isPublic || false,
        sets: exerciseTemplate.sets ?? '',
        repetitionsMin: exerciseTemplate.repetitions?.min ?? '',
        repetitionsMax: exerciseTemplate.repetitions?.max ?? '',
        duration: exerciseTemplate.duration ?? '',
        restInterval: exerciseTemplate.restInterval ?? '',
        hasLoad: exerciseTemplate.hasLoad || false,
        suggestedLoad: exerciseTemplate.suggestedLoad ?? '',
        notes: exerciseTemplate.notes || '',
      });
    } else {
      setFormData(EMPTY_FORM);
    }
  }, [exerciseTemplate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = buildPayload(formData);
      let response;
      if (isEditing) {
        response = await api.patch(`/trainer/exercise-templates/${exerciseTemplate.id}`, payload);
        showToast('Exercício atualizado com sucesso!', 'success');
      } else {
        response = await api.post('/trainer/exercise-templates', payload);
        showToast('Exercício criado com sucesso!', 'success');
      }
      onSuccess?.(response.data);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <div>
        <label className="form-label" htmlFor="etf-name">Nome</label>
        <input
          id="etf-name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="form-input"
          required
          autoFocus
        />
      </div>

      <div>
        <label className="form-label" htmlFor="etf-type">Tipo</label>
        <select
          id="etf-type"
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
        <label className="form-label" htmlFor="etf-videoUrl">URL do vídeo</label>
        <input
          id="etf-videoUrl"
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
          <label className="form-label" htmlFor="etf-sets">Séries</label>
          <input
            id="etf-sets"
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
              id="etf-repetitions-min"
              type="number"
              min="1"
              value={formData.repetitionsMin}
              onChange={(e) => setFormData({ ...formData, repetitionsMin: e.target.value })}
              className="form-input"
              aria-label="Repetições mínimas"
              placeholder="Mín"
            />
            <input
              id="etf-repetitions-max"
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
        <label className="form-label" htmlFor="etf-duration">Duração em segundos</label>
        <input
          id="etf-duration"
          type="number"
          min="1"
          value={formData.duration}
          onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
          className="form-input"
          placeholder="Ex: 60"
        />
      </div>

      <div>
        <label className="form-label" htmlFor="etf-restInterval">Intervalo de descanso (segundos)</label>
        <input
          id="etf-restInterval"
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
          id="etf-hasLoad"
          checked={formData.hasLoad}
          onChange={(e) => setFormData({ ...formData, hasLoad: e.target.checked })}
        />
        <label htmlFor="etf-hasLoad" className="form-label mb-0">
          Exercício com carga
        </label>
      </div>

      {formData.hasLoad && (
        <div>
          <label className="form-label" htmlFor="etf-suggestedLoad">Carga sugerida (kg)</label>
          <input
            id="etf-suggestedLoad"
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
        <label className="form-label" htmlFor="etf-notes">Observações</label>
        <textarea
          id="etf-notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={3}
          className="form-textarea"
          placeholder="Orientações ou anotações sobre este exercício"
        />
      </div>

      <div className="form-checkbox-row">
        <input
          type="checkbox"
          id="etf-isPublic"
          checked={formData.isPublic}
          onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
        />
        <label htmlFor="etf-isPublic" className="form-label mb-0">
          Tornar este modelo público
        </label>
      </div>

      <div className="btn-group">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar exercício'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancelar
        </button>
      </div>
    </form>
  );
};

ExerciseTemplateForm.propTypes = {
  exerciseTemplate: PropTypes.object,
  onSuccess: PropTypes.func,
  onCancel: PropTypes.func.isRequired,
};

export default ExerciseTemplateForm;
