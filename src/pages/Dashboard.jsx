import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { translateError } from '../i18n';
import { Link, useNavigate } from 'react-router-dom';
import { Dumbbell, ClipboardList, BookOpen } from 'lucide-react';
import api from '../api/axios';
import NoStudentsModal from '../components/NoStudentsModal';

const SKIP_STORAGE_KEY = 'treinoway.skipNoStudentsWarning';

const Dashboard = () => {
  const { user, hasRole, refreshUser, updateTokens } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingStudents, setCheckingStudents] = useState(false);
  const [showNoStudentsModal, setShowNoStudentsModal] = useState(false);
  const [studentsCount, setStudentsCount] = useState(null);
  const [protocolsCount, setProtocolsCount] = useState(null);

  useEffect(() => {
    if (refreshUser) {
      refreshUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hasRole('TRAINER')) return;

    const fetchStats = async () => {
      try {
        const [studentsRes, protocolsRes] = await Promise.all([
          api.get('/trainer/students'),
          api.get('/trainer/protocol-templates'),
        ]);
        setStudentsCount(studentsRes.data.length);
        setProtocolsCount(protocolsRes.data.length);
      } catch {
        setStudentsCount(0);
        setProtocolsCount(0);
      }
    };

    fetchStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleCreateRoutine = async () => {
    try {
      const skipWarning = localStorage.getItem(SKIP_STORAGE_KEY) === 'true';
      if (skipWarning) {
        navigate('/trainer/protocols/new');
        return;
      }
    } catch {
      // localStorage unavailable; proceed with API check
    }

    setCheckingStudents(true);
    try {
      const response = await api.get('/trainer/students');
      const students = response.data;

      if (students.length > 0) {
        navigate('/trainer/protocols/new');
      } else {
        setShowNoStudentsModal(true);
      }
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setCheckingStudents(false);
    }
  };

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

      {hasRole('TRAINER') && (
        <section className="dashboard-stats">
          <div className="stat-card">
            <span className="stat-card-value">{studentsCount ?? '--'}</span>
            <span className="stat-card-label">Alunos</span>
          </div>
          <div className="stat-card">
            <span className="stat-card-value">{protocolsCount ?? '--'}</span>
            <span className="stat-card-label">Rotinas</span>
          </div>
        </section>
      )}

      <section>
        <h2 className="dashboard-section-title">Ações Rápidas</h2>
        <div className="quick-actions">
          {hasRole('TRAINER') && (
            <button
              onClick={handleCreateRoutine}
              disabled={checkingStudents}
              className="quick-action-card"
            >
              <div className="quick-action-icon">
                <ClipboardList size={20} strokeWidth={1.6} />
              </div>
              <span className="quick-action-label">
                {checkingStudents ? 'Verificando...' : 'Criar Rotina para um Aluno'}
              </span>
              <p className="quick-action-desc">Monte uma nova rotina de treino personalizada e vincule diretamente a um aluno</p>
            </button>
          )}

          {hasRole('TRAINER') && (
            <Link to="/trainer/protocol-templates" className="quick-action-card">
              <div className="quick-action-icon">
                <BookOpen size={20} strokeWidth={1.6} />
              </div>
              <span className="quick-action-label">Rotinas</span>
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

      <NoStudentsModal
        open={showNoStudentsModal}
        onClose={() => setShowNoStudentsModal(false)}
        onConfirm={() => {
          setShowNoStudentsModal(false);
          navigate('/trainer/students');
        }}
      />
    </div>
  );
};

export default Dashboard;
