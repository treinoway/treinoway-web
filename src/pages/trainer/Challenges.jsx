import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { Trophy, Plus } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import CreateChampionshipModal from '../../components/CreateChampionshipModal';
import LibraryPageHeader from '../../components/LibraryPageHeader';
import ChallengeCard from '../../components/challenge/ChallengeCard';
import Tabs from '../../components/ds/Tabs';
import EmptyBlock from '../../components/ds/EmptyBlock';
import SkeletonRows from '../../components/ds/SkeletonRows';
import useConsistencyRankingAccess from '../../hooks/useConsistencyRankingAccess';
import useWeeklyChampionshipSources from '../../hooks/useWeeklyChampionshipSources';
import { todayIn } from '../../utils/challengeDisplay';
import { CHALLENGE_STATUS, CHALLENGE_STATUS_LABEL } from '../../constants/challenge';

const ALL_TAB = 'all';

const FILTER_TABS = Object.freeze([
  { id: ALL_TAB, label: 'Todos' },
  { id: CHALLENGE_STATUS.ACTIVE, label: 'Ativos' },
  { id: CHALLENGE_STATUS.SCHEDULED, label: 'Agendados' },
  { id: CHALLENGE_STATUS.COMPLETED, label: 'Encerrados' },
  { id: CHALLENGE_STATUS.CANCELLED, label: 'Cancelados' },
]);

const EMPTY_FILTER_DESCRIPTION = Object.freeze({
  [CHALLENGE_STATUS.ACTIVE]: 'Seus campeonatos ativos aparecerão aqui.',
  [CHALLENGE_STATUS.SCHEDULED]: 'Campeonatos agendados para o futuro aparecerão aqui.',
  [CHALLENGE_STATUS.COMPLETED]: 'Seus campeonatos encerrados ficarão registrados aqui.',
  [CHALLENGE_STATUS.CANCELLED]: 'Campeonatos que foram cancelados aparecerão aqui.',
});

const EMPTY_LIST_DESCRIPTION = 'Seus campeonatos ativos aparecerão aqui.';

// Championships of a filter tab: every one on "Todos", the ones in that status otherwise
const challengesOfTab = (challenges, tab) => (tab === ALL_TAB ? challenges : challenges.filter((c) => c.status === tab));

// Filter tabs with the number of championships each one holds
const tabsWithCounts = (challenges) => FILTER_TABS.map((tab) => ({ ...tab, count: challengesOfTab(challenges, tab.id).length }));

// Loads the trainer's championships once; toasts a failure
const useTrainerChallenges = () => {
  const { showToast } = useToast();
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const response = await api.get('/trainer/challenges');
        if (mounted) setChallenges(response.data || []);
      } catch (error) {
        if (mounted) showToast(error.userMessage || translateError(error), 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [showToast]);

  return { challenges, loading };
};

// "+ Novo campeonato" primary button
const NewChallengeButton = ({ onClick }) => (
  <button type="button" className="btn btn--primary" onClick={onClick}>
    <Plus size={16} strokeWidth={2} aria-hidden="true" />
    Novo campeonato
  </button>
);

NewChallengeButton.propTypes = {
  onClick: PropTypes.func.isRequired,
};

// Empty list card; no template sentence, since no trainer creates in the dates format from this page (CPD-64, CAMP-69)
const EmptyChallenges = ({ canCreateWeekly, onCreate }) => (
  <section className="challenges-empty">
    <EmptyBlock
      icon={Trophy}
      title="Nenhum campeonato ainda"
      description={EMPTY_LIST_DESCRIPTION}
      actionLabel={canCreateWeekly ? 'Novo campeonato' : undefined}
      actionIcon={Plus}
      onAction={onCreate}
    />
  </section>
);

EmptyChallenges.propTypes = {
  canCreateWeekly: PropTypes.bool.isRequired,
  onCreate: PropTypes.func.isRequired,
};

// Filter tabs over the grid of championship cards, or the empty message of the selected status
const ChallengeTabs = ({ challenges, tab, onTabChange, timeZone }) => {
  const visible = challengesOfTab(challenges, tab);
  const today = todayIn(timeZone);
  const emptyTitle = `Nenhum campeonato ${CHALLENGE_STATUS_LABEL[tab]?.toLowerCase() || ''}.`;
  return (
    <>
      <Tabs ariaLabel="Filtrar por status" tabs={tabsWithCounts(challenges)} value={tab} onChange={onTabChange} />
      <div className="challenges-list">
        {visible.length === 0 ? (
          <section className="challenges-empty">
            <EmptyBlock icon={Trophy} title={emptyTitle} description={EMPTY_FILTER_DESCRIPTION[tab]} />
          </section>
        ) : (
          <div className="challenges-grid">
            {visible.map((challenge) => <ChallengeCard key={challenge.id} challenge={challenge} today={today} />)}
          </div>
        )}
      </div>
    </>
  );
};

ChallengeTabs.propTypes = {
  challenges: PropTypes.arrayOf(PropTypes.object).isRequired,
  tab: PropTypes.string.isRequired,
  onTabChange: PropTypes.func.isRequired,
  timeZone: PropTypes.string,
};

// Championships list: title with trophy, "+ Novo campeonato", status tabs with counts and the cards
const Challenges = () => {
  const navigate = useNavigate();
  const { challenges, loading } = useTrainerChallenges();
  const [tab, setTab] = useState(ALL_TAB);
  const [showCreate, setShowCreate] = useState(false);
  const canCreateWeekly = useConsistencyRankingAccess();
  const { timeZone } = useWeeklyChampionshipSources(canCreateWeekly, { withStudents: false });
  const openCreate = () => setShowCreate(true);
  const createAction = canCreateWeekly ? <NewChallengeButton onClick={openCreate} /> : null;
  const isEmpty = !loading && challenges.length === 0;

  return (
    <div className="challenges-page">
      <LibraryPageHeader icon={Trophy} title="Campeonatos" actions={createAction} />
      {loading && <SkeletonRows label="Carregando campeonatos" count={3} />}
      {isEmpty && <EmptyChallenges canCreateWeekly={canCreateWeekly} onCreate={openCreate} />}
      {!loading && !isEmpty && <ChallengeTabs challenges={challenges} tab={tab} onTabChange={setTab} timeZone={timeZone} />}
      <CreateChampionshipModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(id) => navigate(`/trainer/challenges/${id}`)}
      />
    </div>
  );
};

export default Challenges;
