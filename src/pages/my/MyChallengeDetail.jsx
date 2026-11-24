import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Trophy } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { translateError, extractErrorInfo } from '../../i18n';
import api from '../../api/axios';
import Badge from '../../components/ds/Badge';
import Tabs from '../../components/ds/Tabs';
import MetricCard from '../../components/ds/MetricCard';
import EmptyBlock from '../../components/ds/EmptyBlock';
import SkeletonRows from '../../components/ds/SkeletonRows';
import MyConsistencyBoard from '../../components/challenge/MyConsistencyBoard';
import MyPointsTab from '../../components/challenge/MyPointsTab';
import PrivacyConsentModal from '../../components/consistency/PrivacyConsentModal';
import { challengeTagOf, ordinalOf, todayIn } from '../../utils/challengeDisplay';
import { dayMonthOf, formatScore } from '../../utils/consistencyFormat';
import { formatDateForDisplay } from '../../utils/dateFormat';
import { CHALLENGE_FORMAT } from '../../constants/challenge';

const TABS = Object.freeze({ RANKING: 'ranking', POINTS: 'points' });

const TAB_OPTIONS = Object.freeze([
  { id: TABS.RANKING, label: 'Ranking' },
  { id: TABS.POINTS, label: 'Meus Pontos' },
]);

const STATUS = Object.freeze({ LOADING: 'loading', READY: 'ready', FORBIDDEN: 'forbidden', NOT_FOUND: 'notFound' });

const PENDING = 'pending';

// "Juliana M." from a first and a last name; "Aluno #N" of an anonymous ranking stays as it is
const shortNameOf = (firstName, lastName) => [firstName, lastName ? `${lastName[0]}.` : null].filter(Boolean).join(' ') || 'Aluno';

// Status of the page after a failed read: 403 is a championship the student is not in
const failureStatusOf = (error) => (extractErrorInfo(error).status === 403 ? STATUS.FORBIDDEN : STATUS.NOT_FOUND);

// Ranking of the championship: the consistency board of a weekly one, the XP ranking of a dates one
const loadRankingOf = async (challenge) => {
  if (challenge.format === CHALLENGE_FORMAT.WEEKS) {
    const response = await api.get(`/my/challenges/${challenge.id}/consistency`);
    return { consistency: response.data, ranking: null };
  }
  const response = await api.get(`/my/challenges/${challenge.id}/ranking`);
  return { consistency: null, ranking: response.data };
};

// Ready state of the page: the championship and its ranking
const fetchDetailState = async (id) => {
  const detail = await api.get(`/my/challenges/${id}`);
  const ranking = await loadRankingOf(detail.data);
  return { status: STATUS.READY, challenge: detail.data, ...ranking };
};

// Loads the championship and its ranking; 403 and 404 become the page states, other failures also toast
const useChallengeDetail = (id) => {
  const { showToast } = useToast();
  const [state, setState] = useState({ status: STATUS.LOADING, challenge: null, consistency: null, ranking: null });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const next = await fetchDetailState(id);
        if (mounted) setState(next);
      } catch (error) {
        if (!mounted) return;
        const status = failureStatusOf(error);
        if (status === STATUS.NOT_FOUND) showToast(error.userMessage || translateError(error), 'error');
        setState((current) => ({ ...current, status }));
      }
    };
    load();
    return () => { mounted = false; };
  }, [id, showToast]);

  const reload = useCallback(async () => {
    try {
      setState(await fetchDetailState(id));
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    }
  }, [id, showToast]);

  return { ...state, reload, setState };
};

// Next page of the classified list appended to the board
const useLoadMore = (id, consistency, setState) => {
  const [loadingMore, setLoadingMore] = useState(false);
  const { showToast } = useToast();
  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const response = await api.get(`/my/challenges/${id}/consistency?page=${consistency.board.page + 1}`);
      const next = response.data.board;
      setState((current) => ({ ...current, consistency: { ...current.consistency, board: { ...next, items: [...current.consistency.board.items, ...next.items] } } }));
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoadingMore(false);
    }
  };
  return { loadingMore, loadMore };
};

// "← Voltar para campeonatos"
const BackLink = ({ onBack }) => (
  <button type="button" className="challenge-header__back" onClick={onBack}>
    <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
    Voltar para campeonatos
  </button>
);

BackLink.propTypes = {
  onBack: PropTypes.func.isRequired,
};

// White card with a trophy empty state and an optional primary action
const EmptyCard = ({ title, description, actionLabel, onAction }) => (
  <section className="challenges-empty">
    <EmptyBlock icon={Trophy} title={title} description={description} actionLabel={actionLabel} onAction={onAction} />
  </section>
);

EmptyCard.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  actionLabel: PropTypes.string,
  onAction: PropTypes.func,
};

// Name, then "01/09 – 30/09/2026 · [tag]"
const DetailHeader = ({ challenge }) => {
  const tag = challengeTagOf(challenge, todayIn(Intl.DateTimeFormat().resolvedOptions().timeZone));
  return (
    <div className="challenge-header__identity">
      <h1 className="challenge-header__title type-h1">{challenge.name}</h1>
      <div className="challenge-header__meta">
        <span className="type-body">{`${dayMonthOf(challenge.startDate)} – ${formatDateForDisplay(challenge.endDate)} ·`}</span>
        <Badge variant="tag" tone={tag.tone}>{tag.label}</Badge>
      </div>
    </div>
  );
};

DetailHeader.propTypes = {
  challenge: PropTypes.object.isRequired,
};

// "Sua posição:" with "Sua média:" (weekly, consistency) or "Seus pontos:" (dates, XP)
const FigureCards = ({ consistency, ranking }) => {
  const cards = consistency
    ? [{ label: 'Sua posição:', value: ordinalOf(consistency.me?.position) }, { label: 'Sua média:', value: formatScore(consistency.me?.average) }]
    : [{ label: 'Sua posição:', value: ordinalOf(ranking?.myPosition) }, { label: 'Seus pontos:', value: ranking?.myPoints ?? 0 }];
  return (
    <div className="metric-grid championship-kpis my-challenges-kpis">
      {cards.map((card) => <MetricCard key={card.label} label={card.label} value={card.value} />)}
    </div>
  );
};

FigureCards.propTypes = {
  consistency: PropTypes.object,
  ranking: PropTypes.object,
};

// XP ranking of a dates championship: position, name ("Você" on the own row) and points
const PointsRanking = ({ ranking, userId }) => {
  if (!ranking?.entries?.length) return <EmptyCard title="Nenhum aluno no ranking ainda." />;
  return (
    <section className="section-card my-ranking-card" aria-label="Ranking">
      <h2 className="my-ranking-card__title type-h3">Ranking</h2>
      <ol className="my-ranking-list">
        {ranking.entries.map((entry) => {
          const isMe = entry.studentId === userId;
          return (
            <li key={entry.studentId} className={`my-ranking-row my-ranking-row--points${isMe ? ' my-ranking-row--me' : ''}`} aria-current={isMe ? 'true' : undefined}>
              <span className="my-ranking-row__position type-body-strong">{ordinalOf(entry.position)}</span>
              <span className="my-ranking-row__name type-body">{isMe ? 'Você' : shortNameOf(entry.firstName, entry.lastName)}</span>
              <span className="my-ranking-row__value type-body">{`${entry.points} pts`}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

PointsRanking.propTypes = {
  ranking: PropTypes.object,
  userId: PropTypes.string,
};

// Weekly Ranking tab: the consent first while it is pending, then the consistency board
const ConsistencyPanel = ({ consistency, onChoose, loadMore }) => {
  if (consistency.privacy?.appearAs === PENDING) {
    return (
      <section className="challenges-empty">
        <EmptyBlock icon={Lock} title="Escolha como você aparece no ranking." description="O ranking aparece depois da sua escolha." actionLabel="Escolher" onAction={onChoose} />
      </section>
    );
  }
  return <MyConsistencyBoard data={consistency} loadingMore={loadMore.loadingMore} onLoadMore={loadMore.loadMore} />;
};

ConsistencyPanel.propTypes = {
  consistency: PropTypes.object.isRequired,
  onChoose: PropTypes.func.isRequired,
  loadMore: PropTypes.shape({ loadingMore: PropTypes.bool, loadMore: PropTypes.func }).isRequired,
};

// Consent modal of a weekly championship while the choice is pending; a saved choice reloads the board
const ConsentGate = ({ consistency, open, onClose, onSaved }) => {
  const { user } = useAuth();
  if (!open || consistency?.privacy?.appearAs !== PENDING) return null;
  return (
    <PrivacyConsentModal
      termVersion={consistency.privacy.termVersion}
      studentName={user?.firstName ? shortNameOf(user.firstName, user.lastName) : 'Você'}
      preview={consistency.me}
      participantCount={consistency.challenge?.participantCount ?? null}
      onSaved={onSaved}
      onClose={onClose}
    />
  );
};

ConsentGate.propTypes = {
  consistency: PropTypes.object,
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
};

// Header, figure cards, Ranking and Meus Pontos tabs of a championship the student is in
const ReadyDetail = ({ detail }) => {
  const { user } = useAuth();
  const [tab, setTab] = useState(TABS.RANKING);
  const [consentOpen, setConsentOpen] = useState(true);
  const loadMore = useLoadMore(detail.challenge.id, detail.consistency, detail.setState);
  const handleSaved = () => {
    setConsentOpen(false);
    detail.reload();
  };
  const rankingPanel = detail.consistency
    ? <ConsistencyPanel consistency={detail.consistency} onChoose={() => setConsentOpen(true)} loadMore={loadMore} />
    : <PointsRanking ranking={detail.ranking} userId={user?.id} />;
  return (
    <>
      <FigureCards consistency={detail.consistency} ranking={detail.ranking} />
      <Tabs ariaLabel="Visões do campeonato" tabs={TAB_OPTIONS} value={tab} onChange={setTab} />
      <div className="challenge-detail__panel">
        {tab === TABS.RANKING ? rankingPanel : <MyPointsTab challengeId={detail.challenge.id} />}
      </div>
      <ConsentGate consistency={detail.consistency} open={consentOpen} onClose={() => setConsentOpen(false)} onSaved={handleSaved} />
    </>
  );
};

ReadyDetail.propTypes = {
  detail: PropTypes.object.isRequired,
};

// Student championship detail as ds-aluno-campeonato.png; the not-participating state as ds-aluno-campeonato-nao-participa.png
const MyChallengeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const detail = useChallengeDetail(id);
  const goBack = () => navigate('/my/challenges');

  return (
    <div className="challenge-detail my-challenge-detail">
      <header className="challenge-header">
        <BackLink onBack={goBack} />
        {detail.status === STATUS.READY && <DetailHeader challenge={detail.challenge} />}
      </header>
      {detail.status === STATUS.LOADING && <SkeletonRows label="Carregando campeonato" count={4} />}
      {detail.status === STATUS.FORBIDDEN && (
        <EmptyCard title="Você não participa deste campeonato." description="Fale com seu treinador para entrar no próximo." actionLabel="Voltar para campeonatos" onAction={goBack} />
      )}
      {detail.status === STATUS.NOT_FOUND && <EmptyCard title="Campeonato não encontrado." actionLabel="Voltar para campeonatos" onAction={goBack} />}
      {detail.status === STATUS.READY && <ReadyDetail detail={detail} />}
    </div>
  );
};

export default MyChallengeDetail;
