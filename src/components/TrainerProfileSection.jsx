import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import Select from '../components/Select';
import { useToast } from '../contexts/ToastContext';
import { translateError } from '../i18n';
import api from '../api/axios';

const serviceModeLabel = (mode) => {
  if (mode === 'online') return 'Online';
  if (mode === 'in_person') return 'Presencial';
  if (mode === 'hybrid') return 'Híbrido';
  return null;
};

const serviceModeBadgeClass = (mode) => {
  if (mode === 'online') return 'badge badge-blue';
  if (mode === 'in_person') return 'badge badge-green';
  if (mode === 'hybrid') return 'badge';
  return 'badge';
};

const TrainerProfileSection = () => {
  const { showToast } = useToast();
  const [profileLoading, setProfileLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [trainer, setTrainer] = useState(null);

  const [formData, setFormData] = useState({
    serviceMode: 'hybrid',
    instagram: '',
    facebook: '',
    whatsapp: '',
  });

  useEffect(() => {
    fetchTrainerProfile();
  }, []);

  const fetchTrainerProfile = async () => {
    setProfileLoading(true);
    try {
      const response = await api.get('/trainer');
      const data = response.data;
      setTrainer(data);
      setFormData({
        serviceMode: data.serviceMode || 'hybrid',
        instagram: data.socialNetworks?.instagram || '',
        facebook: data.socialNetworks?.facebook || '',
        whatsapp: data.socialNetworks?.whatsapp || '',
      });
    } catch (error) {
      console.error('Failed to fetch trainer profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCancel = () => {
    if (trainer) {
      setFormData({
        serviceMode: trainer.serviceMode || 'hybrid',
        instagram: trainer.socialNetworks?.instagram || '',
        facebook: trainer.socialNetworks?.facebook || '',
        whatsapp: trainer.socialNetworks?.whatsapp || '',
      });
    }
    setEditing(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.patch('/trainer', {
        trainer: { serviceMode: formData.serviceMode },
        socials: {
          instagram: formData.instagram,
          facebook: formData.facebook,
          whatsapp: formData.whatsapp,
        },
      });
      setTrainer(response.data);
      setFormData({
        serviceMode: response.data.serviceMode || 'hybrid',
        instagram: response.data.socialNetworks?.instagram || '',
        facebook: response.data.socialNetworks?.facebook || '',
        whatsapp: response.data.socialNetworks?.whatsapp || '',
      });
      showToast('Perfil do treinador atualizado com sucesso!', 'success');
      setEditing(false);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="card card--mb">
        <div className="loading-screen">
          <span className="loading-text">Carregando...</span>
        </div>
      </div>
    );
  }

  const socialFields = [
    trainer?.socialNetworks?.instagram,
    trainer?.socialNetworks?.facebook,
    trainer?.socialNetworks?.whatsapp,
  ];
  const socialEmptyCount = socialFields.filter((val) => !val).length;

  const modeLabel = serviceModeLabel(trainer?.serviceMode);
  const modeBadgeClass = serviceModeBadgeClass(trainer?.serviceMode);

  return (
    <div className="card card--mb">
      <div className="card-header">
        <div>
          <h2 className="card-title">Informações do Treinador</h2>
          {!editing && modeLabel && (
            <span className={`${modeBadgeClass} card-header-badge`}>
              {modeLabel}
            </span>
          )}
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="btn-primary">
            Editar
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSubmit} className="form fade-in">
          <div>
            <label className="form-label">Modo de Atendimento</label>
            <Select
              value={formData.serviceMode}
              onChange={(e) => setFormData({ ...formData, serviceMode: e.target.value })}
              disabled={loading}
            >
              <option value="online">Online</option>
              <option value="in_person">Presencial</option>
              <option value="hybrid">Híbrido</option>
            </Select>
          </div>

          <div>
            <label className="form-label">Instagram</label>
            <input
              type="text"
              value={formData.instagram}
              onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
              className="form-input"
              placeholder="@usuario"
              disabled={loading}
            />
          </div>

          <div>
            <label className="form-label">Facebook</label>
            <input
              type="text"
              value={formData.facebook}
              onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
              className="form-input"
              placeholder="facebook.com/usuario"
              disabled={loading}
            />
          </div>

          <div>
            <label className="form-label">WhatsApp</label>
            <input
              type="text"
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              className="form-input"
              placeholder="+5511999999999"
              disabled={loading}
            />
          </div>

          <div className="btn-group">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
            <button type="button" onClick={handleCancel} disabled={loading} className="btn-secondary">
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="fade-in">
          <div className="profile-section">
            <div className="profile-section-header">
              <h3 className="profile-section-title">Redes Sociais e Contato</h3>
              {socialEmptyCount === 0 ? (
                <Check size={16} className="section-complete-icon" aria-label="Seção completa" />
              ) : (
                <span className="section-incomplete-text">Incompleto</span>
              )}
            </div>
            {socialEmptyCount === socialFields.length ? (
              <p className="info-empty-summary">
                {socialEmptyCount} campos não preenchidos
              </p>
            ) : (
              <div className="info-stacked">
                {trainer?.socialNetworks?.instagram && (
                  <div>
                    <span className="info-label">Instagram</span>
                    <span className="info-value">{trainer.socialNetworks.instagram}</span>
                  </div>
                )}
                {trainer?.socialNetworks?.facebook && (
                  <div>
                    <span className="info-label">Facebook</span>
                    <span className="info-value">{trainer.socialNetworks.facebook}</span>
                  </div>
                )}
                {trainer?.socialNetworks?.whatsapp && (
                  <div>
                    <span className="info-label">WhatsApp</span>
                    <span className="info-value">{trainer.socialNetworks.whatsapp}</span>
                  </div>
                )}
              </div>
            )}
            {socialEmptyCount > 0 && socialEmptyCount < socialFields.length && (
              <p className="info-empty-summary">
                {socialEmptyCount} {socialEmptyCount === 1 ? 'campo não preenchido' : 'campos não preenchidos'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainerProfileSection;
