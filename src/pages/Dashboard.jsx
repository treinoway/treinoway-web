import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { translateError } from '../i18n';
import { Link } from 'react-router-dom';
import { Dumbbell, ClipboardList, BookOpen } from 'lucide-react';
import api from '../api/axios';

const Dashboard = () => {
  const { user, hasRole, refreshUser, updateTokens } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (refreshUser) {
      refreshUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBecomeTrainer = async () => {
    setLoading(true);

    try {
      const response = await api.patch('/become-trainer');

      const newAccessToken = response.data.token?.accessToken || response.data.accessToken;
      const newRefreshToken = response.data.refreshToken;

      updateTokens(newAccessToken, newRefreshToken);

      showToast('Parabéns! Você agora é um treinador!', 'success');

      await refreshUser();
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="dashboard-hero">
        <h1 className="dashboard-hero-greeting">{user?.firstName ? `Olá, ${user.firstName}! 👋` : 'Bem-vindo! 👋'}</h1>
        <p className="dashboard-hero-subtitle">Pronto para o trabalho de hoje?</p>
        {user?.status === 'pending' && (
          <Link to="/profile" className="dashboard-hero-cta">
            Completar perfil →
          </Link>
        )}
      </div>

      <section>
        <h2 className="dashboard-section-title">Ações Rápidas</h2>
        <div className="quick-actions">
          {hasRole('TRAINER') && (
            <Link to="/trainer/protocols/new" className="quick-action-card">
              <div className="quick-action-icon">
                <ClipboardList size={20} strokeWidth={1.6} />
              </div>
              <span className="quick-action-label">Criar Rotina para um Aluno</span>
              <p className="quick-action-desc">Monte uma nova rotina de treino personalizada e vincule diretamente a um aluno</p>
            </Link>
          )}

          {hasRole('TRAINER') && (
            <Link to="/trainer/protocol-templates" className="quick-action-card">
              <div className="quick-action-icon">
                <BookOpen size={20} strokeWidth={1.6} />
              </div>
              <span className="quick-action-label">Modelos de Rotina</span>
              <p className="quick-action-desc">Crie estruturas de rotina reutilizáveis para agilizar a montagem dos treinos dos seus alunos</p>
            </Link>
          )}

          {!hasRole('TRAINER') && (
            <button
              onClick={handleBecomeTrainer}
              disabled={loading}
              className="quick-action-card"
            >
              <div className="quick-action-icon">
                <Dumbbell size={20} strokeWidth={1.6} />
              </div>
              <span className="quick-action-label">
                {loading ? 'Processando...' : 'Seja um Treinador'}
              </span>
              <p className="quick-action-desc">Habilite sua conta para criar rotinas, gerenciar alunos e muito mais</p>
            </button>
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
