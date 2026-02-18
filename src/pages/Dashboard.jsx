import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getErrorMessage } from '../utils/errorMessages';
import { Link } from 'react-router-dom';
import { User, Dumbbell, ClipboardList, UserPen } from 'lucide-react';
import api from '../api/axios';

const Dashboard = () => {
  const { user, hasRole, refreshUser, updateTokens } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch fresh user data on mount
    if (refreshUser) {
      refreshUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBecomeTrainer = async () => {
    setLoading(true);

    try {
      const response = await api.patch('/become-trainer');
      
      // API returns new tokens with updated roles
      const newAccessToken = response.data.token?.accessToken || response.data.accessToken;
      const newRefreshToken = response.data.refreshToken;
      
      // Update tokens in AuthContext AND localStorage
      updateTokens(newAccessToken, newRefreshToken);
      
      showToast('Parabéns! Você agora é um treinador!', 'success');

      // Refresh user data to get new role
      await refreshUser();
    } catch (error) {
      showToast(error.userMessage || getErrorMessage(error, 'Falha ao se tornar treinador.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Painel</h1>

      {user?.status === 'pending' ? (
        <Link to="/profile" className="complete-profile-card card--mb">
          <div className="card-icon"><UserPen size={48} strokeWidth={1.6} /></div>
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
          <div className="card-icon"><User size={36} strokeWidth={1.6} /></div>
          <h3 className="card-subtitle">Meu Perfil</h3>
          <p className="card-description">Atualize suas informações pessoais e configurações</p>
        </Link>

        {!hasRole('TRAINER') && (
          <button 
            onClick={handleBecomeTrainer} 
            disabled={loading}
            className="card-gradient-link"
            style={{ border: 'none', width: '100%', textAlign: 'left' }}
          >
            <div className="card-icon"><Dumbbell size={36} strokeWidth={1.6} /></div>
            <h3 className="card-subtitle">{loading ? 'Processando...' : 'Seja um Treinador'}</h3>
            <p className="text-sm opacity-90">Comece a criar e gerenciar protocolos de treino</p>
          </button>
        )}

        {hasRole('TRAINER') && (
          <Link to="/trainer/protocols" className="card-link">
            <div className="card-icon"><ClipboardList size={36} strokeWidth={1.6} /></div>
            <h3 className="card-subtitle">Protocolos</h3>
            <p className="card-description">Gerencie modelos e protocolos de treino</p>
          </Link>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
