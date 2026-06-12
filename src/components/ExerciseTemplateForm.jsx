import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Film,
  Dumbbell,
  HeartPulse,
  StretchHorizontal,
  Activity,
  Globe,
  Info,
  Play,
  X,
  Link,
} from 'lucide-react';
import VideoLibraryPicker from './VideoLibraryPicker';
import { useToast } from '../contexts/ToastContext';
import { translateError } from '../i18n';
import api from '../api/axios';
import { getYoutubeVideoId } from '../utils/youtube';

const EXERCISE_TYPES = [
  { value: 'strength', label: 'Força', Icon: Dumbbell },
  { value: 'cardio', label: 'Cardio', Icon: HeartPulse },
  { value: 'mobility', label: 'Mobilidade', Icon: StretchHorizontal },
  { value: 'stretching', label: 'Alongamento', Icon: Activity },
];

const EMPTY_FORM = {
  name: '',
  type: 'strength',
  videoUrl: '',
  isPublic: false,
};

const buildPayload = (data) => {
  const payload = {
    name: data.name,
    type: data.type,
    isPublic: data.isPublic,
  };
  if (data.videoUrl?.trim()) payload.videoUrl = data.videoUrl.trim();
  return payload;
};

const buildInitialForm = (template) => {
  if (!template) return EMPTY_FORM;
  return {
    name: template.name || '',
    type: template.type || '',
    videoUrl: template.videoUrl || '',
    isPublic: template.isPublic || false,
  };
};

const ExerciseTemplateForm = ({ exerciseTemplate, onSuccess, onCancel, onNameChange }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(() => buildInitialForm(exerciseTemplate));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [publicConfirmedThisSession, setPublicConfirmedThisSession] = useState(false);
  const [thumbError, setThumbError] = useState(false);

  const isEditing = !!exerciseTemplate?.id;

  useEffect(() => {
    const initial = buildInitialForm(exerciseTemplate);
    setFormData(initial);
    setPublicConfirmedThisSession(false);
    onNameChange?.(initial.name);
  }, [exerciseTemplate, onNameChange]);

  // Notify parent of name changes for live h1 reflection
  const handleNameChange = (value) => {
    setFormData((prev) => ({ ...prev, name: value }));
    onNameChange?.(value);
  };

  const handlePublicToggle = (checked) => {
    if (checked && !publicConfirmedThisSession) {
      setConfirmDialog({
        title: 'Tornar público?',
        message: 'Outros treinadores podem usar este exercício na biblioteca compartilhada. Você pode reverter a qualquer momento.',
        onConfirm: () => {
          setConfirmDialog(null);
          setPublicConfirmedThisSession(true);
          setFormData((prev) => ({ ...prev, isPublic: true }));
        },
        onCancel: () => setConfirmDialog(null),
      });
    } else {
      setFormData((prev) => ({ ...prev, isPublic: checked }));
    }
  };

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

  const youtubeId = getYoutubeVideoId(formData.videoUrl);
  const hasVideo = !!youtubeId;
  const hasInvalidUrl = formData.videoUrl.trim() !== '' && !youtubeId;

  // Reset thumb error and playback state whenever the video ID changes
  useEffect(() => {
    setThumbError(false);
    setVideoPlaying(false);
  }, [youtubeId]);

  const handleRemoveVideo = () => {
    setConfirmDialog({
      title: 'Remover vídeo?',
      message: 'O link do vídeo será removido deste exercício.',
      onConfirm: () => {
        setConfirmDialog(null);
        setFormData((prev) => ({ ...prev, videoUrl: '' }));
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="form" noValidate>

        {/* ==== Identificação ==== */}
        <div className="form-section">
          <div className="form-section-title-row">
            <h2 className="form-section-display-title">Identificação</h2>
            <span className="form-section-meta-eyebrow">O essencial</span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="etf-name">
              Nome <span aria-hidden="true" className="form-label-required">*</span>
            </label>
            <input
              id="etf-name"
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="form-input"
              placeholder="Ex.: Agachamento livre"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <div className="form-label">
              Tipo <span aria-hidden="true" className="form-label-required">*</span>
            </div>
            <div
              className="segmented-toggle--type"
              role="radiogroup"
              aria-label="Tipo do exercício"
            >
              {EXERCISE_TYPES.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={formData.type === value}
                  className={`segmented-toggle-btn${formData.type === value ? ' segmented-toggle-btn--active' : ''}`}
                  onClick={() => setFormData((prev) => ({ ...prev, type: value }))}
                >
                  <Icon size={18} strokeWidth={2} className="toggle-icon" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="info-banner">
            <span className="info-banner-icon">
              <Info size={16} strokeWidth={2} aria-hidden="true" />
            </span>
            <span>Séries, repetições, carga e descanso são definidos ao adicionar este exercício a um treino.</span>
          </div>
        </div>

        {/* ==== Demonstração (vídeo) ==== */}
        <div className="form-section">
          <div className="form-section-title-row">
            <h2 className="form-section-display-title">Demonstração</h2>
            <span className="form-section-meta-eyebrow">Opcional · YouTube</span>
          </div>

          <div className="video-hero">
            {/* Stage — empty or filled */}
            {hasVideo && !thumbError ? (
              <div
                className="video-hero-stage"
                role="img"
                aria-label="Pré-visualização do vídeo de demonstração"
              >
                {videoPlaying ? (
                  <iframe
                    className="video-hero-iframe"
                    src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`}
                    title="Demonstração do exercício"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <>
                    <img
                      className="video-hero-thumb"
                      src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
                      alt="Miniatura do vídeo"
                      loading="lazy"
                      onError={() => setThumbError(true)}
                    />
                    <button
                      type="button"
                      className="video-hero-play"
                      onClick={() => setVideoPlaying(true)}
                      aria-label="Reproduzir prévia"
                    >
                      <Play size={26} strokeWidth={2} aria-hidden="true" />
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="video-hero-stage video-hero-stage--empty">
                {thumbError ? (
                  <>
                    <span className="video-hero-empty-icon" aria-hidden="true">
                      <Film size={22} strokeWidth={2} />
                    </span>
                    <p className="video-hero-empty-hint">Vídeo indisponível. Verifique o link ou escolha outro vídeo.</p>
                  </>
                ) : (
                  <>
                    <span className="video-hero-empty-icon" aria-hidden="true">
                      <Film size={22} strokeWidth={2} />
                    </span>
                    <p className="video-hero-empty-hint">Cole o link do YouTube abaixo ou escolha um vídeo da sua biblioteca.</p>
                  </>
                )}
              </div>
            )}

            {/* Meta row — URL input + actions */}
            <div className="video-hero-meta">
              <div className="form-group">
                <label className="form-label" htmlFor="etf-videoUrl">URL do vídeo</label>
                <div className="video-hero-url-row">
                  <div className="form-input-with-icon">
                    <Link size={16} strokeWidth={2} aria-hidden="true" />
                    <input
                      id="etf-videoUrl"
                      type="url"
                      value={formData.videoUrl}
                      onChange={(e) => setFormData((prev) => ({ ...prev, videoUrl: e.target.value }))}
                      className={`form-input${hasInvalidUrl ? ' form-input--error' : ''}`}
                      placeholder="https://youtube.com/..."
                    />
                  </div>
                </div>
                {hasInvalidUrl && (
                  <span className="form-error" role="alert">Link de YouTube inválido</span>
                )}
              </div>

              <div className="video-hero-actions">
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => setPickerOpen(true)}
                >
                  <Film size={14} strokeWidth={2} aria-hidden="true" />
                  Escolher da biblioteca
                </button>
                {hasVideo && (
                  <button
                    type="button"
                    className="btn-link btn-link--muted"
                    onClick={handleRemoveVideo}
                  >
                    <X size={14} strokeWidth={2} aria-hidden="true" />
                    Remover vídeo
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ==== Visibilidade ==== */}
        <div className="form-section">
          <div className="form-section-title-row">
            <h2 className="form-section-display-title">Visibilidade</h2>
            <span className="form-section-meta-eyebrow">Quem pode usar</span>
          </div>

          <div className="info-banner">
            <span className="info-banner-icon">
              <Info size={16} strokeWidth={2} aria-hidden="true" />
            </span>
            <span>Modelos privados aparecem só para você. Tornar público permite que outros treinadores reutilizem este exercício.</span>
          </div>

          <div className="visibility-card">
            <div className="visibility-card-icon" aria-hidden="true">
              <Globe size={20} strokeWidth={2} />
            </div>
            <div className="visibility-card-content">
              <span className="visibility-card-title" id="etf-vis-title">
                Tornar público
              </span>
              <span className="visibility-card-sub" id="etf-vis-sub">
                Outros treinadores podem usar este exercício na biblioteca compartilhada.
              </span>
            </div>
            <label className="switch switch--accent">
              <input
                type="checkbox"
                checked={formData.isPublic}
                onChange={(e) => handlePublicToggle(e.target.checked)}
                role="switch"
                aria-labelledby="etf-vis-title"
                aria-describedby="etf-vis-sub"
                aria-label="Tornar este modelo público"
              />
              <span className="switch-slider" />
            </label>
          </div>
        </div>

        {/* ==== Botões ==== */}
        <div className="etf-form-footer">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar exercício'}
          </button>
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancelar
          </button>
        </div>
      </form>

      {/* ==== Picker de vídeo ==== */}
      <VideoLibraryPicker
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(video) => setFormData((prev) => ({ ...prev, videoUrl: video.url }))}
      />

      {/* ==== Confirm dialog — visibilidade pública / remover vídeo ==== */}
      {confirmDialog && (
        <div
          className="overlay"
          onClick={confirmDialog.onCancel}
          role="dialog"
          aria-modal="true"
          aria-label={confirmDialog.title}
        >
          <div
            className="confirm-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="confirm-dialog-message">
              <strong>{confirmDialog.title}</strong>
              <br />
              {confirmDialog.message}
            </p>
            <div className="btn-group">
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="btn-primary"
              >
                Confirmar
              </button>
              <button
                type="button"
                onClick={confirmDialog.onCancel}
                className="btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
};

ExerciseTemplateForm.propTypes = {
  exerciseTemplate: PropTypes.object,
  onSuccess: PropTypes.func,
  onCancel: PropTypes.func.isRequired,
  onNameChange: PropTypes.func,
};

export default ExerciseTemplateForm;
