import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { translateError } from '../i18n';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Sparkles, Salad, Users } from 'lucide-react';
import api from '../api/axios';
import { becomeNutritionist } from '../api/nutrition';
import NoStudentsModal from '../components/NoStudentsModal';
import { OnboardingChecklistView } from '../components/OnboardingChecklistCard';
import WelcomeHero from '../components/WelcomeHero';
import ControlTower from '../components/ControlTower';
import ActionGrid from '../components/ActionGrid';
import ActionCard from '../components/ActionCard';
import useAiAccess from '../hooks/useAiAccess';
import useTrainerRoster from '../hooks/useTrainerRoster';
import useTrainerDashboard from '../hooks/useTrainerDashboard';
import useOnboardingChecklist from '../hooks/useOnboardingChecklist';
import formatHeroDateLabel from '../utils/formatHeroDate';
import getGreeting from '../utils/getGreeting';

const SKIP_STORAGE_KEY = 'treinoway.skipNoStudentsWarning';

const Dashboard = () => {
  const { user, hasRole, refreshUser, updateTokens } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const canUseAi = useAiAccess();
  const showTrainerCards = hasRole('TRAINER');
  const isNutritionist = hasRole('NUTRITIONIST');
  const showBecomeTrainer = !hasRole('TRAINER');
  const showBecomeNutritionist = Boolean(user?.betaAccess) && !isNutritionist;

  const [becomingTrainer, setBecomingTrainer] = useState(false);
  const [checkingStudents, setCheckingStudents] = useState(false);
  const [showNoStudentsModal, setShowNoStudentsModal] = useState(false);
  const [becomingNutritionist, setBecomingNutritionist] = useState(false);

  const roster = useTrainerRoster(showTrainerCards);
  const controlTower = useTrainerDashboard(showTrainerCards);
  const onboardingChecklist = useOnboardingChecklist(showTrainerCards);
  const rosterEmpty = roster.hasCounts && roster.isEmpty;

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

    // Roster counts are usually already known (cache or the Pulse fetch), so
    // this is instant — only a true cache miss falls back to a fresh check.
    if (roster.hasCounts) {
      if (roster.isEmpty) {
        setShowNoStudentsModal(true);
      } else {
        navigate('/trainer/protocols/new');
      }
      return;
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
    setBecomingTrainer(true);

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
      setBecomingTrainer(false);
    }
  };

  const handleBecomeNutritionist = async () => {
    setBecomingNutritionist(true);

    try {
      const body = await becomeNutritionist();
      updateTokens(body.token?.accessToken || body.accessToken, body.refreshToken);
      showToast('Conta de nutricionista ativada.', 'success');
      await refreshUser();
      navigate('/nutritionist/patients');
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setBecomingNutritionist(false);
    }
  };

  const dateLabel = formatHeroDateLabel();
  const greeting = getGreeting();

  let heroCta = null;
  if (showTrainerCards) {
    heroCta = rosterEmpty
      ? { label: 'Vincular primeiro aluno', to: '/trainer/students' }
      : { label: 'Criar rotina', onClick: handleCreateRoutine, loading: checkingStudents };
  }

  return (
    <div>
      <WelcomeHero
        name={user?.firstName}
        dateLabel={dateLabel}
        subtitle="Pronto para o trabalho de hoje?"
        cta={heroCta}
        greeting={greeting}
      />

      {showTrainerCards && <OnboardingChecklistView checklist={onboardingChecklist} placement="top" />}

      {showTrainerCards && (
        <ControlTower
          data={controlTower.data}
          loading={controlTower.loading}
          error={controlTower.error}
          rosterEmpty={rosterEmpty}
          onRetry={controlTower.refetch}
        />
      )}

      {showTrainerCards && <OnboardingChecklistView checklist={onboardingChecklist} placement="bottom" />}
      {isNutritionist && (
        <section>
          <div className="section-header">
            <h2 className="dashboard-section-title">Nutrição</h2>
          </div>
          <ActionGrid>
            <ActionCard
              icon={Users}
              title="Meus pacientes"
              description="Monte e publique o plano alimentar dos seus pacientes"
              to="/nutritionist/patients"
            />
          </ActionGrid>
        </section>
      )}

      {(showBecomeTrainer || showBecomeNutritionist) && (
        <section>
          <div className="section-header">
            <h2 className="dashboard-section-title">Comece a atender</h2>
          </div>
          <ActionGrid>
            {showBecomeTrainer && (
              <ActionCard
                icon={UserPlus}
                title="Seja um Treinador"
                description="Habilite sua conta para criar rotinas, gerenciar alunos e muito mais"
                onClick={handleBecomeTrainer}
                loading={becomingTrainer}
                variant="primary"
              />
            )}
            {showBecomeNutritionist && (
              <ActionCard
                icon={Salad}
                title="Seja nutricionista"
                description="Habilite sua conta para montar planos alimentares e acompanhar seus pacientes"
                onClick={handleBecomeNutritionist}
                loading={becomingNutritionist}
                variant="primary"
              />
            )}
          </ActionGrid>
        </section>
      )}

      {showTrainerCards && canUseAi && (
        <section>
          <div className="section-header">
            <h2 className="dashboard-section-title">Ações</h2>
          </div>
          <ActionGrid>
            <ActionCard
              icon={Sparkles}
              title="iArnold"
              description="Crie rotinas e treinos, aplique rotinas e analise o desempenho dos alunos com linguagem natural"
              to="/trainer/ai-assistant"
              variant="ai"
            />
          </ActionGrid>
        </section>
      )}

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
