import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user, hasRole, refreshUser } = useAuth();

  useEffect(() => {
    // Fetch fresh user data on mount (once)
    if (refreshUser) {
      refreshUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h1 className="page-title">Painel</h1>

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
          <Link to="/profile" className="card-gradient-link">
            <div className="card-icon">💪</div>
            <h3 className="card-subtitle">Seja um Treinador</h3>
            <p className="text-sm opacity-90">Comece a criar e gerenciar protocolos de treino</p>
          </Link>
        )}

        {hasRole('TRAINER') && (
          <>
            <Link to="/trainer" className="card-link">
              <div className="card-icon">💪</div>
              <h3 className="card-subtitle">Perfil do Treinador</h3>
              <p className="card-description">Gerencie suas informações de treinador</p>
            </Link>

            <Link to="/trainer/protocol-templates" className="card-link">
              <div className="card-icon">📊</div>
              <h3 className="card-subtitle">Protocolos</h3>
              <p className="card-description">Gerencie templates e protocolos de treino</p>
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
