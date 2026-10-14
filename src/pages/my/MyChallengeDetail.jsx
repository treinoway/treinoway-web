import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { translateError, extractErrorInfo } from '../../i18n';
import api from '../../api/axios';
import RankingList from '../../components/RankingList';
import { formatDateForDisplay } from '../../utils/dateFormat';
import { POINT_ACTION_LABEL } from '../../constants/gamification';
import {
  CHALLENGE_STATUS_LABEL,
  CHALLENGE_STATUS_BADGE,
} from '../../constants/challenge';

const TABS = Object.freeze({ RANKING: 'ranking', POINTS: 'points' });

const SkeletonRanking = () => (
  <div>
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="skeleton skeleton-text" style={{ marginBottom: 'var(--spacing-xs)' }} />
    ))}
  </div>
);

const PointsSummaryCard = ({ summary }) => {
  if (!summary) return null;
  return (
    <div className="card card--mb">
      <div className="card-header">
        <h3 className="card-title">Resumo</h3>
      </div>
      <p className="text-lg font-medium">{summary.totalPoints} pontos</p>
      <ul className="summary-breakdown">
        {Object.entries(summary.breakdown || {}).map(([action, points]) => (
          <li key={action} className="summary-breakdown-row">
            <span>{POINT_ACTION_LABEL[action] || action}</span>
            <span className="font-medium">{points}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const PointHistoryList = ({ transactions, page, pageCount, onPageChange }) => {
  if (transactions.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">Nenhum ponto registrado ainda.</p>
      </div>
    );
  }

  return (
    <>
      <ul className="point-history-list">
        {transactions.map((t) => (
          <li key={t.id} className="point-history-row">
            <div>
              <span className="font-medium">{POINT_ACTION_LABEL[t.action] || t.action}</span>
              {t.reason && <p className="text-sm text-muted">{t.reason}</p>}
              <p className="text-sm text-light">{formatDateForDisplay(t.createdAt)}</p>
            </div>
            <span className="point-history-points">{t.points > 0 ? `+${t.points}` : t.points}</span>
          </li>
        ))}
      </ul>
      {pageCount > 1 && (
        <div className="btn-group" style={{ marginTop: 'var(--spacing-lg)' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
          >Anterior</button>
          <span className="text-sm text-muted" style={{ alignSelf: 'center' }}>
            Página {page} de {pageCount}
          </span>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onPageChange(Math.min(pageCount, page + 1))}
            disabled={page === pageCount}
          >Próxima</button>
        </div>
      )}
    </>
  );
};

PointsSummaryCard.propTypes = {
  summary: PropTypes.shape({
    totalPoints: PropTypes.number,
    breakdown: PropTypes.object,
  }),
};

PointHistoryList.propTypes = {
  transactions: PropTypes.array.isRequired,
  page: PropTypes.number.isRequired,
  pageCount: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
};

const MyChallengeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [challenge, setChallenge] = useState(null);
  const [ranking, setRanking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [tab, setTab] = useState(TABS.RANKING);

  // Points tab state
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [pointsTotal, setPointsTotal] = useState(0);
  const [pointsPage, setPointsPage] = useState(1);
  const [pointsLoading, setPointsLoading] = useState(false);
  const pointsLimit = 20;

  // Cache flag to avoid re-fetching points on tab switch
  const [pointsLoaded, setPointsLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const [detailRes, rankingRes] = await Promise.all([
        api.get(`/my/challenges/${id}`),
        api.get(`/my/challenges/${id}/ranking`),
      ]);
      setChallenge(detailRes.data);
      setRanking(rankingRes.data);
    } catch (error) {
      const info = extractErrorInfo(error);
      if (info.status === 403) {
        setForbidden(true);
      } else {
        showToast(error.userMessage || translateError(error), 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => { load(); }, [load]);

  const loadPoints = useCallback(async () => {
    setPointsLoading(true);
    try {
      const [summaryRes, historyRes] = await Promise.all([
        api.get(`/my/points/summary?challengeId=${id}`),
        api.get(`/my/points?challengeId=${id}&page=${pointsPage}&limit=${pointsLimit}`),
      ]);
      setSummary(summaryRes.data);
      setTransactions(historyRes.data.data || []);
      setPointsTotal(historyRes.data.total || 0);
      setPointsLoaded(true);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setPointsLoading(false);
    }
  }, [id, pointsPage, showToast]);

  useEffect(() => {
    if (tab === TABS.POINTS && (!pointsLoaded || pointsPage > 1)) {
      loadPoints();
    }
  }, [tab, pointsPage, loadPoints, pointsLoaded]);

  if (loading) {
    return (
      <div>
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-card" />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div>
        <div className="page-header" style={{ marginBottom: 'var(--spacing-lg)' }}>
          <button
            type="button"
            onClick={() => navigate('/my/challenges')}
            className="btn-back"
            aria-label="Voltar"
          >
            <ArrowLeft size={16} strokeWidth={1.6} /> Voltar
          </button>
        </div>
        <div className="empty-state">
          <p className="empty-state-title">Você não participa deste campeonato.</p>
        </div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div>
        <p className="text-muted">Campeonato não encontrado.</p>
      </div>
    );
  }

  const badgeClass = CHALLENGE_STATUS_BADGE[challenge.status] || 'badge-gray';
  const pointsPageCount = Math.max(1, Math.ceil(pointsTotal / pointsLimit));

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <button
          type="button"
          onClick={() => navigate('/my/challenges')}
          className="btn-back"
          aria-label="Voltar para campeonatos"
        >
          <ArrowLeft size={16} strokeWidth={1.6} /> Campeonatos
        </button>
      </div>

      <div className="card card--mb">
        <div className="card-header">
          <h1 className="card-title" style={{ marginBottom: 0 }}>{challenge.name}</h1>
          <span className={`badge ${badgeClass}`}>{CHALLENGE_STATUS_LABEL[challenge.status]}</span>
        </div>
        <div className="date-display text-sm text-muted">
          <Calendar size={14} strokeWidth={2} aria-hidden="true" />
          {formatDateForDisplay(challenge.startDate)}
          <span className="date-display__divider">—</span>
          {formatDateForDisplay(challenge.endDate)}
        </div>
        {ranking && (
          <div className="my-position-summary">
            <p>
              <span className="font-medium">Sua posição: </span>
              {ranking.myPosition ? `#${ranking.myPosition}` : '—'}
            </p>
            <p>
              <span className="font-medium">Seus pontos: </span>
              {ranking.myPoints}
            </p>
          </div>
        )}
      </div>

      <div className="segmented-toggle">
        <button
          type="button"
          className={`segmented-toggle-btn${tab === TABS.RANKING ? ' segmented-toggle-btn--active' : ''}`}
          onClick={() => setTab(TABS.RANKING)}
        >
          Ranking
        </button>
        <button
          type="button"
          className={`segmented-toggle-btn${tab === TABS.POINTS ? ' segmented-toggle-btn--active' : ''}`}
          onClick={() => setTab(TABS.POINTS)}
        >
          Meus Pontos
        </button>
      </div>

      {tab === TABS.RANKING && (
        ranking ? (
          <RankingList entries={ranking.entries || []} ownStudentId={user?.id} />
        ) : (
          <div className="empty-state"><p className="empty-state-title">Sem dados de ranking.</p></div>
        )
      )}

      {tab === TABS.POINTS && (
        pointsLoading ? (
          <SkeletonRanking />
        ) : (
          <>
            <PointsSummaryCard summary={summary} />
            <h3 className="card-title">Histórico</h3>
            <PointHistoryList
              transactions={transactions}
              page={pointsPage}
              pageCount={pointsPageCount}
              onPageChange={setPointsPage}
            />
          </>
        )
      )}
    </div>
  );
};

export default MyChallengeDetail;
