import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';

// Helper function to format date without timezone conversion
const formatDateForDisplay = (dateString) => {
  if (!dateString) return 'Não informado';
  const [year, month, day] = dateString.split('T')[0].split('-');
  return `${day}/${month}/${year}`;
};

// Helper function to format date for input[type="date"]
const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  return dateString.split('T')[0]; // Returns YYYY-MM-DD
};

const Profile = () => {
  const navigate = useNavigate();
  const { user, updateUser, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    gender: '',
    birthDate: '',
    address: {
      line1: '',
      line2: '',
      neighborhood: '',
      city: '',
      state: '',
      stateCode: '',
      country: 'Brazil',
      countryCode: 'BR',
      postalCode: '',
    },
    socials: {
      instagram: '',
      whatsapp: '',
      linkedin: '',
    },
  });

useEffect(() => {
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        gender: user.gender || '',
        birthDate: formatDateForInput(user.birthDate),
        address: {
          line1: user.address?.line1 || '',
          line2: user.address?.line2 || '',
          neighborhood: user.address?.neighborhood || '',
          city: user.address?.city || '',
          state: user.address?.state || '',
          stateCode: user.address?.stateCode || '',
          country: user.address?.country || 'Brazil',
          countryCode: user.address?.countryCode || 'BR',
          postalCode: user.address?.postalCode || '',
        },
        socials: {
          instagram: user.socials?.instagram || '',
          whatsapp: user.socials?.whatsapp || '',
          linkedin: user.socials?.linkedin || '',
        },
      });
    }
  }, [user]);

  const handleCepLookup = async (cep) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setLoadingCep(true);
    
    try {
      const response = await api.get(`/postal-code?code=${cleanCep}`);
      const data = response.data;
      
      const newAddress = {
        line1: data.logradouro || data.street || data.line1 || '',
        line2: formData.address.line2,
        neighborhood: data.bairro || data.neighborhood || '',
        city: data.localidade || data.city || '',
        state: data.estado || data.state || '',
        stateCode: data.uf || data.stateCode || '',
        country: 'Brazil',
        countryCode: 'BR',
        postalCode: cleanCep,
      };
      
      setFormData(prev => ({
        ...prev,
        address: newAddress,
      }));
      
      setMessage({ type: 'success', text: 'CEP encontrado!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
    } catch (error) {
      setMessage({ type: 'error', text: 'CEP não encontrado ou inválido' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setLoadingCep(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await api.patch('/me/profile', formData);
      updateUser(response.data);
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
      setEditing(false);
      await refreshUser();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Falha ao atualizar perfil',
      });
    } finally {
      setLoading(false);
    }
  };

return (
    <div>
      <h1 className="page-title">Meu Perfil</h1>

      {message.text && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {message.text}
        </div>
      )}

      <div className="card card--mb">
        <div className="card-header">
          <h2 className="card-title">Informações do Perfil</h2>
          {!editing && (
            <button onClick={() => setEditing(true)} className="btn-primary">
              Editar
            </button>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleProfileUpdate} className="form">
            <div className="profile-section">
              <h3 className="profile-section-title">Dados Pessoais</h3>
              
              <div className="grid-responsive-2col">
                <div>
                  <label className="form-label">Nome</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Sobrenome</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="grid-responsive-2col">
                <div>
                  <label className="form-label">Gênero</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="form-select"
                  >
                    <option value="">Selecione...</option>
                    <option value="male">Masculino</option>
                    <option value="female">Feminino</option>
                    <option value="other">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Data de Nascimento</label>
                  <input
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            <div className="profile-section">
              <h3 className="profile-section-title">Endereço</h3>
              
              <div>
                <label className="form-label">CEP</label>
                <input
                  type="text"
                  value={formData.address.postalCode}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, postalCode: value }
                    }));
                    if (value.replace(/\D/g, '').length === 8) {
                      handleCepLookup(value);
                    }
                  }}
                  className="form-input"
                  placeholder="00000-000"
                  disabled={loadingCep}
                />
                {loadingCep && <p className="text-sm text-muted">Buscando CEP...</p>}
              </div>

              <div>
                <label className="form-label">Logradouro</label>
                <input
                  type="text"
                  value={formData.address.line1}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    address: { ...prev.address, line1: e.target.value }
                  }))}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Complemento</label>
                <input
                  type="text"
                  value={formData.address.line2}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    address: { ...prev.address, line2: e.target.value }
                  }))}
                  className="form-input"
                />
              </div>

              <div className="grid-responsive-2col">
                <div>
                  <label className="form-label">Bairro</label>
                  <input
                    type="text"
                    value={formData.address.neighborhood}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, neighborhood: e.target.value }
                    }))}
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label">Cidade</label>
                  <input
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, city: e.target.value }
                    }))}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="grid-responsive-2col">
                <div>
                  <label className="form-label">Estado</label>
                  <input
                    type="text"
                    value={formData.address.state}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, state: e.target.value }
                    }))}
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label">UF</label>
                  <input
                    type="text"
                    value={formData.address.stateCode}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, stateCode: e.target.value.toUpperCase() }
                    }))}
                    className="form-input"
                    maxLength="2"
                  />
                </div>
              </div>
            </div>

            <div className="profile-section">
              <h3 className="profile-section-title">Redes Sociais</h3>
              
              <div>
                <label className="form-label">Instagram</label>
                <input
                  type="text"
                  value={formData.socials.instagram}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    socials: { ...prev.socials, instagram: e.target.value }
                  }))}
                  className="form-input"
                  placeholder="@usuario"
                />
              </div>

              <div>
                <label className="form-label">WhatsApp</label>
                <input
                  type="text"
                  value={formData.socials.whatsapp}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    socials: { ...prev.socials, whatsapp: e.target.value }
                  }))}
                  className="form-input"
                  placeholder="+55 11 99999-9999"
                />
              </div>

              <div>
                <label className="form-label">LinkedIn</label>
                <input
                  type="text"
                  value={formData.socials.linkedin}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    socials: { ...prev.socials, linkedin: e.target.value }
                  }))}
                  className="form-input"
                  placeholder="https://linkedin.com/in/usuario"
                />
              </div>
            </div>

            <div>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        ) : (
          <div className="profile-display">
            <div className="profile-section">
              <h3 className="profile-section-title">Dados Pessoais</h3>
              <div className="info-list">
                <div>
                  <span className="info-label info-inline">E-mail:</span>
                  <span className="info-value">{user?.email}</span>
                </div>
                <div>
                  <span className="info-label info-inline">Nome:</span>
                  <span className="info-value">{user?.firstName || 'Não informado'} {user?.lastName || ''}</span>
                </div>
                <div>
                  <span className="info-label info-inline">Gênero:</span>
                  <span className="info-value">
                    {user?.gender === 'male' ? 'Masculino' : user?.gender === 'female' ? 'Feminino' : user?.gender === 'other' ? 'Outro' : 'Não informado'}
                  </span>
                </div>
                <div>
                  <span className="info-label info-inline">Data de Nascimento:</span>
                  <span className="info-value">{formatDateForDisplay(user?.birthDate)}</span>
                </div>
              </div>
            </div>

            {user?.address && (
              <div className="profile-section">
                <h3 className="profile-section-title">Endereço</h3>
                <div className="info-list">
                  <div>
                    <span className="info-label info-inline">CEP:</span>
                    <span className="info-value">{user.address.postalCode || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="info-label info-inline">Logradouro:</span>
                    <span className="info-value">{user.address.line1 || 'Não informado'}</span>
                  </div>
                  {user.address.line2 && (
                    <div>
                      <span className="info-label info-inline">Complemento:</span>
                      <span className="info-value">{user.address.line2}</span>
                    </div>
                  )}
                  <div>
                    <span className="info-label info-inline">Bairro:</span>
                    <span className="info-value">{user.address.neighborhood || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="info-label info-inline">Cidade:</span>
                    <span className="info-value">{user.address.city || 'Não informado'} - {user.address.stateCode || ''}</span>
                  </div>
                </div>
              </div>
            )}

            {user?.socials && (
              <div className="profile-section">
                <h3 className="profile-section-title">Redes Sociais</h3>
                <div className="info-list">
                  <div>
                    <span className="info-label info-inline">Instagram:</span>
                    <span className="info-value">{user.socials.instagram || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="info-label info-inline">WhatsApp:</span>
                    <span className="info-value">{user.socials.whatsapp || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="info-label info-inline">LinkedIn:</span>
                    <span className="info-value">{user.socials.linkedin || 'Não informado'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default Profile;
