import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Trophy } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import useTrainerContext from '../../hooks/useTrainerContext';
import LibraryPageHeader from '../../components/LibraryPageHeader';
import MyChallengeCard from '../../components/challenge/MyChallengeCard';
import Tabs from '../../components/ds/Tabs';
import MetricCard from '../../components/ds/MetricCard';
import EmptyBlock from '../../components/ds/EmptyBlock';
import SkeletonRows from '../../components/ds/SkeletonRows';
import { ordinalOf, todayIn } from '../../utils/challengeDisplay';
import { CHALLENGE_FORMAT, CHALLENGE_STATUS } from '../../constants/challenge';

const ALL_TAB = 'all';

const FILTER_TABS = Object.freeze([
  { id: ALL_TAB, label: 'Todos' },
  { id: CHALLENGE_STATUS.ACTIVE, label: 'Ativos' },
  { id: CHALLENGE_STATUS.COMPLETED, label: 'Encerrados' },
]);

const EMPTY_TAB_TITLE = Object.freeze({
  [CHALLENGE_STATUS.ACTIVE]: 'Nenhum campeonato ativo.',
  [CHALLENGE_STATUS.COMPLETED]: 'Nenhum campeonato encerrado.',
});

// Civil date of today in the browser time zone
const localToday = () => todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone);

// XP position and points of the student in each championship, by id; a failed read leaves the championship out
const loadXpById = async (challenges) => {
  const results = await Promise.allSettled(challenges.map((challenge) => api.get(`/my/challenges/${challenge.id}/ranking`)));
  return Object.fromEntries(results.flatMap((result, index) => (
    result.status === 'fulfilled'
      ? [[challenges[index].id, { position: result.value.data.myPosition, points: result.value.data.myPoints ?? 0 }]]
      : []
  )));
};

// Loads the student's championships of every trainer and the XP of each one; toasts a failure
const useMyChallenges = () => {
  const { showToast } = useToast();
  const [state, setState] = useState({ challenges: [], xpById: {}, loading: true });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await api.get('/my/challenges');
        const challenges = response.data || [];
        const xpById = await loadXpById(challenges);
        if (mounted) setState({ challenges, xpById, loading: false });
      } catch (error) {
        if (!mounted) return;
        showToast(error.userMessage || translateError(error), 'error');
        setState((current) => ({ ...current, loading: false }));
      }
    };
    load();
    return () => { mounted = false; };
  }, [showToast]);

  return state;
};

// Position shown on a card: the consistency one in a weekly championship, the XP one otherwise
const cardPositionOf = (challenge, xp) => (
  challenge.format === CHALLENGE_FORMAT.WEEKS ? challenge.consistency?.position : xp?.position
);

// "Pontos totais" (XP summed over the championships) and "Melhor posição" (the best one the cards show)
const totalsOf = (challenges, xpById) => {
  const points = Object.values(xpById).reduce((total, xp) => total + xp.points, 0);
  const positions = challenges.map((challenge) => cardPositionOf(challenge, xpById[challenge.id])).filter((position) => position != null);
  return { points, bestPosition: positions.length > 0 ? Math.min(...positions) : null };
};

// "Pontos totais" and "Melhor posição" cards
const TotalsCards = ({ challenges, xpById }) => {
  const { points, bestPosition } = totalsOf(challenges, xpById);
  return (
    <div className="metric-grid championship-kpis my-challenges-kpis">
      <MetricCard label="Pontos totais" value={points} />
      <MetricCard label="Melhor posição" value={ordinalOf(bestPosition)} />
    </div>
  );
};

TotalsCards.propTypes = {
  challenges: PropTypes.arrayOf(PropTypes.object).isRequired,
  xpById: PropTypes.object.isRequired,
};

// White card with the trophy empty state
const EmptyCard = ({ title, description }) => (
  <section className="challenges-empty">
    <EmptyBlock icon={Trophy} title={title} description={description} />
  </section>
);

EmptyCard.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
};

// Status tabs over the student's championship cards, or the empty message of the tab
const ChallengeTabs = ({ challenges, xpById, trainerNames }) => {
  const [tab, setTab] = useState(ALL_TAB);
  const visible = tab === ALL_TAB ? challenges : challenges.filter((challenge) => challenge.status === tab);
  const today = localToday();
  return (
    <>
      <Tabs ariaLabel="Filtrar por status" tabs={FILTER_TABS} value={tab} onChange={setTab} />
      <div className="challenges-list">
        {visible.length === 0 ? <EmptyCard title={EMPTY_TAB_TITLE[tab]} /> : (
          <div className="my-challenges-list">
            {visible.map((challenge) => (
              <MyChallengeCard key={challenge.id} challenge={challenge} trainerName={trainerNames[challenge.trainerId] ?? null} xp={xpById[challenge.id] ?? null} today={today} />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

ChallengeTabs.propTypes = {
  challenges: PropTypes.arrayOf(PropTypes.object).isRequired,
  xpById: PropTypes.object.isRequired,
  trainerNames: PropTypes.object.isRequired,
};

// Student championships: totals, status tabs and a card per championship of every trainer, or the empty card
const MyChallenges = () => {
  const { trainers } = useTrainerContext();
  const { challenges, xpById, loading } = useMyChallenges();
  const trainerNames = Object.fromEntries(trainers.map((trainer) => [trainer.id, trainer.name]));
  const isEmpty = !loading && challenges.length === 0;

  return (
    <div className="challenges-page my-challenges-page">
      <LibraryPageHeader icon={Trophy} title="Campeonatos" />
      {loading && <SkeletonRows label="Carregando campeonatos" count={3} />}
      {isEmpty && <EmptyCard title="Nenhum campeonato ativo." description="Quando seu treinador criar um campeonato, ele aparece aqui." />}
      {!loading && !isEmpty && (
        <>
          <TotalsCards challenges={challenges} xpById={xpById} />
          <ChallengeTabs challenges={challenges} xpById={xpById} trainerNames={trainerNames} />
        </>
      )}
    </div>
  );
};

export default MyChallenges;
