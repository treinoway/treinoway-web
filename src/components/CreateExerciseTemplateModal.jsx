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
  repetitions: '',
  duration: '',
  hasLoad: false,
  suggestedLoad: '',
};

const CreateExerciseTemplateModal = ({ open, onClose, onSuccess, exerciseTemplate }) => {
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
        repetitions: exerciseTemplate.repetitions ?? '',
        duration: exerciseTemplate.duration ?? '',
        hasLoad: exerciseTemplate.hasLoad || false,
        suggestedLoad: exerciseTemplate.suggestedLoad ?? '',
      });
    } else {
      setFormData(EMPTY_FORM);
    }
  }, [exerciseTemplate]);

  const buildPayload = (data) => {
    const payload = {
      name: data.name,
      type: data.type,
      isPublic: data.isPublic,
      hasLoad: data.hasLoad,
    };
    if (data.videoUrl?.trim()) payload.videoUrl = data.videoUrl.trim();
    if (data.sets !== '' && data.sets != null) payload.sets = parseInt(data.sets, 10);
    if (data.repetitions !== '' && data.repetitions != null) payload.repetitions = parseInt(data.repetitions, 10);
    if (data.duration !== '' && data.duration != null) payload.duration = parseInt(data.duration, 10);
    if (data.hasLoad && data.suggestedLoad !== '' && data.suggestedLoad != null) {
      payload.suggestedLoad = parseFloat(data.suggestedLoad, 10);
    }
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = buildPayload(formData);
      let response;
      if (isEditing) {
        response = await api.patch(`/trainer/exercise-templates/${exerciseTemplate.id}`, payload);
        showToast('Modelo de exercício atualizado com sucesso!', 'success');
      } else {
        response = await api.post('/trainer/exercise-templates', payload);
        showToast('Modelo de exercício criado com sucesso!', 'success');
      }
      resetAndClose();
      onSuccess?.(response.data);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setFormData(EMPTY_FORM);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="overlay" onClick={resetAndClose}>
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="bottom-sheet-header">
          <h2 className="bottom-sheet-title">{isEditing ? 'Editar Modelo de Exercício' : 'Criar Modelo de Exercício'}</h2>
          <button
            className="bottom-sheet-close"
            onClick={resetAndClose}
            aria-label="Fechar"
            type="button"
          >
            ✕
          </button>
        </div>
        <div className="bottom-sheet-body">
          <form onSubmit={handleSubmit} className="form">
            <div>
              <label className="form-label" htmlFor="et-modal-name">Nome</label>
              <input
                id="et-modal-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="form-input"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="form-label" htmlFor="et-modal-type">Tipo</label>
              <select
                id="et-modal-type"
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
              <label className="form-label" htmlFor="et-modal-videoUrl">URL do vídeo (opcional)</label>
              <input
                id="et-modal-videoUrl"
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
                <label className="form-label" htmlFor="et-modal-sets">Séries (opcional)</label>
                <input
                  id="et-modal-sets"
                  type="number"
                  min="1"
                  value={formData.sets}
                  onChange={(e) => setFormData({ ...formData, sets: e.target.value })}
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label" htmlFor="et-modal-repetitions">Repetições (opcional)</label>
                <input
                  id="et-modal-repetitions"
                  type="number"
                  min="1"
                  value={formData.repetitions}
                  onChange={(e) => setFormData({ ...formData, repetitions: e.target.value })}
                  className="form-input"
                />
              </div>
            </div>

            <div>
              <label className="form-label" htmlFor="et-modal-duration">Duração em segundos (opcional)</label>
              <input
                id="et-modal-duration"
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
                id="et-modal-hasLoad"
                checked={formData.hasLoad}
                onChange={(e) => setFormData({ ...formData, hasLoad: e.target.checked })}
              />
              <label htmlFor="et-modal-hasLoad" className="form-label mb-0">
                Exercício com carga
              </label>
            </div>

            {formData.hasLoad && (
              <div>
                <label className="form-label" htmlFor="et-modal-suggestedLoad">Carga sugerida (kg)</label>
                <input
                  id="et-modal-suggestedLoad"
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.suggestedLoad}
                  onChange={(e) => setFormData({ ...formData, suggestedLoad: e.target.value })}
                  className="form-input"
                />
              </div>
            )}

            <div className="form-checkbox-row">
              <input
                type="checkbox"
                id="et-modal-isPublic"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
              />
              <label htmlFor="et-modal-isPublic" className="form-label mb-0">
                Tornar este modelo público
              </label>
            </div>

            <div className="btn-group">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar Modelo de Exercício'}
              </button>
              <button type="button" onClick={resetAndClose} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

CreateExerciseTemplateModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  exerciseTemplate: PropTypes.object,
};

export default CreateExerciseTemplateModal;
