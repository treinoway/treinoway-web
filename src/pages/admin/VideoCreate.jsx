import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Film } from 'lucide-react';
import VideoForm from './VideoForm';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';

const VideoCreate = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState(undefined);

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    setFormError('');
    setFieldErrors(undefined);
    try {
      await api.post('/admin/videos', payload);
      showToast('Vídeo cadastrado com sucesso!', 'success');
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
          <h1>Novo vídeo</h1>
        </div>
      </div>

      <div className="card card--mb">
        <VideoForm
          submitLabel="Criar"
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={submitting}
          error={formError}
          fieldErrors={fieldErrors}
        />
      </div>
    </div>
  );
};

export default VideoCreate;
