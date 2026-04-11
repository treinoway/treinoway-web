import { useState, useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import Select from '../../components/Select';

const TrainerProfile = () => {
  const { showToast } = useToast();
  const [profileLoading, setProfileLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [trainer, setTrainer] = useState(null);

  const [trainerData, setTrainerData] = useState({
    serviceMode: 'hybrid',
  });

  const [socialsData, setSocialsData] = useState({
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
      setTrainerData({
        serviceMode: data.serviceMode || 'hybrid',
      });
      setSocialsData({
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.patch('/trainer', {
        trainer: trainerData,
        socials: socialsData,
      });
      setTrainer(response.data);
      showToast('Perfil do treinador atualizado com sucesso!', 'success');
      setEditing(false);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const serviceModeLabel = (mode) => {
    if (mode === 'online') return 'Online';
    if (mode === 'in_person') return 'Presencial';
    if (mode === 'hybrid') return 'Híbrido';
    return 'Não informado';
  };

  if (profileLoading) {
    return (
      <div className="loading-screen">
        <span className="loading-text">Carregando...</span>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Perfil do Treinador</h1>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Informações do Treinador</h2>
          {!editing && (
            <button onClick={() => setEditing(true)} className="btn-primary">
              Editar
            </button>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSubmit} className="form">
            <div>
              <label className="form-label">Modo de Atendimento</label>
              <Select
                value={trainerData.serviceMode}
                onChange={(e) => setTrainerData({ ...trainerData, serviceMode: e.target.value })}
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
                value={socialsData.instagram}
                onChange={(e) => setSocialsData({ ...socialsData, instagram: e.target.value })}
                className="form-input"
                placeholder="@usuario"
              />
            </div>

            <div>
              <label className="form-label">Facebook</label>
              <input
                type="text"
                value={socialsData.facebook}
                onChange={(e) => setSocialsData({ ...socialsData, facebook: e.target.value })}
                className="form-input"
                placeholder="facebook.com/usuario"
              />
            </div>

            <div>
              <label className="form-label">WhatsApp</label>
              <input
                type="text"
                value={socialsData.whatsapp}
                onChange={(e) => setSocialsData({ ...socialsData, whatsapp: e.target.value })}
                className="form-input"
                placeholder="+5511999999999"
              />
            </div>

            <div className="btn-group">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <div className="info-list">
            <div>
              <span className="info-label info-inline">Modo de Atendimento:</span>
              <span className="info-value">{serviceModeLabel(trainer?.serviceMode)}</span>
            </div>
            <div>
              <span className="info-label info-inline">Instagram:</span>
              <span className="info-value">{trainer?.socialNetworks?.instagram || 'Não informado'}</span>
            </div>
            <div>
              <span className="info-label info-inline">Facebook:</span>
              <span className="info-value">{trainer?.socialNetworks?.facebook || 'Não informado'}</span>
            </div>
            <div>
              <span className="info-label info-inline">WhatsApp:</span>
              <span className="info-value">{trainer?.socialNetworks?.whatsapp || 'Não informado'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainerProfile;
