import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';

const Dashboard = () => {
  const { user, hasRole, refreshUser, updateTokens } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch fresh user data on mount
    if (refreshUser) {
      refreshUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Log current state for debugging
  console.log('Dashboard render - hasRole(TRAINER):', hasRole('TRAINER'), 'user roles:', user?.roles);

  const handleBecomeTrainer = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const response = await api.patch('/become-trainer');
      
      // API returns new tokens with updated roles
      const newAccessToken = response.data.token?.accessToken || response.data.accessToken;
      const newRefreshToken = response.data.refreshToken;
      
      // Update tokens in AuthContext AND localStorage
      updateTokens(newAccessToken, newRefreshToken);
      
      setMessage({ type: 'success', text: '🎉 Parabéns! Você agora é um treinador!' });
      
      // Refresh user data to get new role
      await refreshUser();
      
      // Redirect after showing success message
      setTimeout(() => {
        navigate('/trainer/protocol-templates');
      }, 2000);
    } catch (error) {
      console.error('Failed to become trainer:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Falha ao se tornar treinador' 
      });
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Painel</h1>

      {message.text && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 'var(--spacing-lg)' }}>
          {message.text}
        </div>
      )}

      {user?.status === 'pending' ? (
        <Link to="/profile" className="complete-profile-card card--mb">
          <div className="card-icon">✏️</div>
          <h2 className="card-title">Complete seu perfil</h2>
          <p className="card-description">
            Adicione suas informações pessoais para começar a usar o Treinoway
          </p>
        </Link>
      ) : (
        <div className="card card--mb dashboard-welcome">
          <h2 className="card-title">Bem-vindo, {user?.name}!</h2>
        </div>
      )}

      <div className="grid-cards">
        <Link to="/profile" className="card-link">
          <div className="card-icon">👤</div>
          <h3 className="card-subtitle">Meu Perfil</h3>
          <p className="card-description">Atualize suas informações pessoais e configurações</p>
        </Link>

        {!hasRole('TRAINER') && (
          <button 
            onClick={handleBecomeTrainer} 
            disabled={loading}
            className="card-gradient-link"
            style={{ border: 'none', cursor: 'pointer', width: '100%' }}
          >
            <div className="card-icon">💪</div>
            <h3 className="card-subtitle">{loading ? 'Processando...' : 'Seja um Treinador'}</h3>
            <p className="text-sm opacity-90">Comece a criar e gerenciar protocolos de treino</p>
          </button>
        )}

        {hasRole('TRAINER') && (
          <Link to="/trainer/protocol-templates" className="card-link">
            <div className="card-icon">📊</div>
            <h3 className="card-subtitle">Protocolos</h3>
            <p className="card-description">Gerencie templates e protocolos de treino</p>
          </Link>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
