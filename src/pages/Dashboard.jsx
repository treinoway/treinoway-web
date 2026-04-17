import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { translateError } from '../i18n';
import { Link, useNavigate } from 'react-router-dom';
import { Dumbbell, ClipboardList, Palette, Sparkles, Trophy } from 'lucide-react';
import api from '../api/axios';
import NoStudentsModal from '../components/NoStudentsModal';
import OnboardingChecklistCard from '../components/OnboardingChecklistCard';

const SKIP_STORAGE_KEY = 'treinoway.skipNoStudentsWarning';

const Dashboard = () => {
  const { user, hasRole, refreshUser, updateTokens } = useAuth();
  const isStudentUser = user?.email === 'n.santos1897@gmail.com';
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingStudents, setCheckingStudents] = useState(false);
  const [showNoStudentsModal, setShowNoStudentsModal] = useState(false);

  useEffect(() => {
    if (refreshUser) {
      refreshUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      showToast('Conta de treinador ativada.', 'success');

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
        <h1 className="dashboard-hero-greeting">{user?.firstName ? `Olá, ${user.firstName}!` : 'Bem-vindo!'}</h1>
        <p className="dashboard-hero-subtitle">Pronto para o trabalho de hoje?</p>
        {hasRole('TRAINER') && (
          <Link to="/trainer/students" className="dashboard-hero-cta">
            Ver meus alunos →
          </Link>
        )}
      </div>

      {hasRole('TRAINER') && <OnboardingChecklistCard />}

      <section>
        <h2 className="dashboard-section-title">Ações Rápidas</h2>
        <div className="quick-actions">
          {hasRole('TRAINER') && user?.email !== 'gabriel.araujo.lima2011@gmail.com' && (
            <Link to="/trainer/ai-assistant" className="quick-action-card quick-action-card--ai">
              <div className="quick-action-icon quick-action-icon--ai">
                <Sparkles size={20} strokeWidth={2} />
              </div>
              <span className="quick-action-label quick-action-label--ai">iArnold</span>
              <p className="quick-action-desc quick-action-desc--ai">Crie treinos e rotinas com linguagem natural usando inteligência artificial</p>
            </Link>
          )}

          {hasRole('TRAINER') && (
            <button
              onClick={handleCreateRoutine}
              disabled={checkingStudents}
              className="quick-action-card quick-action-card--highlight"
            >
              <div className="quick-action-icon">
                <ClipboardList size={20} strokeWidth={2} />
              </div>
              <span className="quick-action-label">
                {checkingStudents ? 'Verificando...' : 'Criar Rotina para um Aluno'}
              </span>
              <p className="quick-action-desc">Monte uma nova rotina de treino personalizada e vincule diretamente a um aluno</p>
            </button>
          )}

          {hasRole('TRAINER') && (
            <Link to="/trainer/branding" className="quick-action-card">
              <div className="quick-action-icon">
                <Palette size={20} strokeWidth={2} />
              </div>
              <span className="quick-action-label">Personalize sua Marca</span>
              <p className="quick-action-desc">Defina as cores e o visual da sua marca para criar uma experiência personalizada para seus alunos</p>
            </Link>
          )}

          {hasRole('TRAINER') && (
            <Link to="/trainer/challenges" className="quick-action-card">
              <div className="quick-action-icon">
                <Trophy size={20} strokeWidth={2} />
              </div>
              <span className="quick-action-label">Campeonatos</span>
              <p className="quick-action-desc">Veja os campeonatos e desafios dos seus alunos</p>
            </Link>
          )}

          {isStudentUser && (
            <Link to="/my/challenges" className="quick-action-card">
              <div className="quick-action-icon">
                <Trophy size={20} strokeWidth={2} />
              </div>
              <span className="quick-action-label">Campeonatos</span>
              <p className="quick-action-desc">Participe de campeonatos e acompanhe seu desempenho</p>
            </Link>
          )}

          {!hasRole('TRAINER') && (
            <button
              onClick={handleBecomeTrainer}
              disabled={loading}
              className="quick-action-card"
            >
              <div className="quick-action-icon">
                <Dumbbell size={20} strokeWidth={2} />
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
