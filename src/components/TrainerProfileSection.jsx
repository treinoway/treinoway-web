import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { translateError } from '../i18n';
import api from '../api/axios';

const serviceModeLabel = (mode) => {
  if (mode === 'ONLINE') return 'Online';
  if (mode === 'IN_PERSON') return 'Presencial';
  if (mode === 'HYBRID') return 'Híbrido';
  return null;
};

// Tweak 4: Badge class for service mode
const serviceModeBadgeClass = (mode) => {
  if (mode === 'ONLINE') return 'badge badge-blue';
  if (mode === 'IN_PERSON') return 'badge badge-green';
  if (mode === 'HYBRID') return 'badge';
  return 'badge';
};

const TrainerProfileSection = () => {
  const { showToast } = useToast();
  const [profileLoading, setProfileLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [trainer, setTrainer] = useState(null);

  const [formData, setFormData] = useState({
    bio: '',
    serviceMode: 'HYBRID',
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
      setTrainer(response.data);
      setFormData({
        bio: response.data.bio || '',
        serviceMode: response.data.serviceMode || 'HYBRID',
        instagram: response.data.instagram || '',
        facebook: response.data.facebook || '',
        whatsapp: response.data.whatsapp || '',
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
        bio: trainer.bio || '',
        serviceMode: trainer.serviceMode || 'HYBRID',
        instagram: trainer.instagram || '',
        facebook: trainer.facebook || '',
        whatsapp: trainer.whatsapp || '',
      });
    }
    setEditing(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.patch('/trainer', formData);
      setTrainer(response.data);
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

  // Tweak 2 & 6: Count empty fields
  const socialFields = [trainer?.instagram, trainer?.facebook, trainer?.whatsapp];
  const socialEmptyCount = socialFields.filter((val) => !val).length;

  const modeLabel = serviceModeLabel(trainer?.serviceMode);
  const modeBadgeClass = serviceModeBadgeClass(trainer?.serviceMode);

  return (
    <div className="card card--mb">
      <div className="card-header">
        <div>
          <h2 className="card-title">Informações do Treinador</h2>
          {/* Tweak 4: Service mode badge in header */}
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
            <label className="form-label">Bio</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={4}
              className="form-textarea"
              placeholder="Conte aos alunos sobre você..."
              disabled={loading}
            />
          </div>

          <div>
            <label className="form-label">Modo de Atendimento</label>
            <select
              value={formData.serviceMode}
              onChange={(e) => setFormData({ ...formData, serviceMode: e.target.value })}
              className="form-select"
              disabled={loading}
            >
              <option value="ONLINE">Online</option>
              <option value="IN_PERSON">Presencial</option>
              <option value="HYBRID">Híbrido</option>
            </select>
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
          {/* Tweak 9: Bio block */}
          {trainer?.bio ? (
            <div className="bio-block">
              {trainer.bio}
            </div>
          ) : (
            <div className="bio-block bio-block--placeholder">
              Adicione uma bio para seus alunos conhecerem você
            </div>
          )}

          {/* Tweak 8: Separate social section */}
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
                {trainer?.instagram && (
                  <div>
                    <span className="info-label">Instagram</span>
                    <span className="info-value">{trainer.instagram}</span>
                  </div>
                )}
                {trainer?.facebook && (
                  <div>
                    <span className="info-label">Facebook</span>
                    <span className="info-value">{trainer.facebook}</span>
                  </div>
                )}
                {trainer?.whatsapp && (
                  <div>
                    <span className="info-label">WhatsApp</span>
                    <span className="info-value">{trainer.whatsapp}</span>
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
