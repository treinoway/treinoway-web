import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Film, Trash2 } from 'lucide-react';
import VideoForm from './VideoForm';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';

const VideoEdit = () => {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState(undefined);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const handleNotFound = useCallback(() => {
    showToast('Vídeo não encontrado.', 'error');
    navigate('/admin/videos');
  }, [navigate, showToast]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/admin/videos/${videoId}`);
        if (!cancelled) setVideo(response.data);
      } catch (error) {
        if (cancelled) return;
        if (error.response?.status === 404) {
          handleNotFound();
          return;
        }
        showToast(error.userMessage || translateError(error), 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [videoId, handleNotFound, showToast]);

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setFormError('');
    setFieldErrors(undefined);
    try {
      const response = await api.patch(`/admin/videos/${videoId}`, payload);
      setVideo(response.data);
      showToast('Vídeo atualizado com sucesso!', 'success');
      navigate('/admin/videos');
    } catch (error) {
      const details = error.response?.data?.details;
      if (Array.isArray(details) && details.length > 0) {
        setFieldErrors(details);
      }
      const message = error.userMessage || translateError(error);
      setFormError(message);
      showToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => navigate('/admin/videos');

  const handleDelete = () => {
    setConfirmDialog({
      message: `Excluir "${video.title}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        setDeleting(true);
        try {
          await api.delete(`/admin/videos/${videoId}`);
          showToast('Vídeo excluído com sucesso!', 'success');
          navigate('/admin/videos');
        } catch (error) {
          showToast(error.userMessage || translateError(error), 'error');
          setDeleting(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="loading-text">Carregando...</span>
      </div>
    );
  }

  if (!video) return null;

  return (
    <div>
      <div className="page-header">
        <button
          type="button"
          onClick={() => navigate('/admin/videos')}
          className="btn-back"
          aria-label="Voltar para a biblioteca"
        >
          <ArrowLeft size={16} strokeWidth={2} /> Biblioteca
        </button>
      </div>

      <div className="page-header">
        <div className="page-header-title-row">
          <Film size={24} className="page-header-title-icon" strokeWidth={2} />
          <h1>Editar vídeo</h1>
        </div>
      </div>

      <div className="card card--mb">
        <VideoForm
          submitLabel="Salvar"
          initialValues={{
            title: video.title || '',
            description: video.description || '',
            url: video.url || '',
            thumbnailUrl: video.thumbnailUrl || '',
            duration: video.duration ?? '',
            category: video.category || '',
            bodySegment: video.bodySegment || '',
            tags: Array.isArray(video.tags) ? video.tags : [],
          }}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={submitting}
          error={formError}
          fieldErrors={fieldErrors}
        />
      </div>

      <div className="card card--mb">
        <h2 className="card-subtitle">Excluir vídeo</h2>
        <p className="text-sm text-light">
          A remoção é permanente. O vídeo deixará de aparecer na biblioteca.
        </p>
        <div className="btn-group">
          <button
            type="button"
            className="btn-danger"
            onClick={handleDelete}
            disabled={deleting || submitting}
          >
            <Trash2 size={16} strokeWidth={2} />
            {deleting ? 'Excluindo...' : 'Excluir vídeo'}
          </button>
        </div>
      </div>

      {confirmDialog && (
        <div className="overlay">
          <div className="confirm-dialog">
            <p className="confirm-dialog-message">{confirmDialog.message}</p>
            <div className="btn-group btn-group--equal">
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="btn-danger btn-flex-1"
              >
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="btn-secondary btn-flex-1"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoEdit;
