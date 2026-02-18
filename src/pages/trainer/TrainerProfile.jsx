import { useState, useEffect } from 'react';
import api from '../../api/axios';

const TrainerProfile = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
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
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await api.patch('/trainer', formData);
      setTrainer(response.data);
      setMessage({ type: 'success', text: 'Perfil do treinador atualizado com sucesso!' });
      setEditing(false);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Falha ao atualizar perfil do treinador',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Perfil do Treinador</h1>

      {message.text && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {message.text}
        </div>
      )}

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
              <label className="form-label">Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={4}
                className="form-textarea"
                placeholder="Conte aos alunos sobre voce..."
              />
            </div>

            <div>
              <label className="form-label">Modo de Atendimento</label>
              <select
                value={formData.serviceMode}
                onChange={(e) => setFormData({ ...formData, serviceMode: e.target.value })}
                className="form-select"
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
            <div className="info-item">
              <span className="info-label">Bio:</span>
              <p style={{ marginTop: '0.25rem', color: 'var(--color-gray-800)' }}>
                {trainer?.bio || 'Não informado'}
              </p>
            </div>
            <div>
              <span className="info-label info-inline">Modo de Atendimento:</span>
              <span className="info-value">
                {trainer?.serviceMode === 'ONLINE' ? 'Online' :
                 trainer?.serviceMode === 'IN_PERSON' ? 'Presencial' :
                 trainer?.serviceMode === 'HYBRID' ? 'Híbrido' : 'Não informado'}
              </span>
            </div>
            <div>
              <span className="info-label info-inline">Instagram:</span>
              <span className="info-value">{trainer?.instagram || 'Não informado'}</span>
            </div>
            <div>
              <span className="info-label info-inline">Facebook:</span>
              <span className="info-value">{trainer?.facebook || 'Não informado'}</span>
            </div>
            <div>
              <span className="info-label info-inline">WhatsApp:</span>
              <span className="info-value">{trainer?.whatsapp || 'Não informado'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrainerProfile;
