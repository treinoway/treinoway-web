import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { Trophy, Award, Calendar } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import useTrainerContext from '../../hooks/useTrainerContext';
import TrainerContextSelect from '../../components/TrainerContextSelect';
import { formatDateForDisplay } from '../../utils/dateFormat';
import {
  CHALLENGE_STATUS,
  CHALLENGE_STATUS_LABEL,
  CHALLENGE_STATUS_BADGE,
  CHALLENGE_STATUS_VALUES,
} from '../../constants/challenge';

const ALL_FILTER = 'all';

const AggregateSummaryCard = ({ challenges }) => {
  let totalPoints = 0;
  let bestRank = null;

  challenges.forEach((c) => {
    if (c.myPoints != null) totalPoints += c.myPoints;
    if (c.myPosition != null && (bestRank === null || c.myPosition < bestRank)) {
      bestRank = c.myPosition;
    }
  });

  if (totalPoints === 0 && bestRank === null) return null;

  return (
    <div className="aggregate-summary-card">
      <div className="aggregate-summary-card__item">
        <Award size={20} strokeWidth={1.6} aria-hidden="true" />
        <div>
          <span className="aggregate-summary-card__value">{totalPoints}</span>
          <span className="aggregate-summary-card__label">Pontos totais</span>
        </div>
      </div>
      {bestRank !== null && (
        <div className="aggregate-summary-card__item">
          <Trophy size={20} strokeWidth={1.6} aria-hidden="true" />
          <div>
            <span className="aggregate-summary-card__value">#{bestRank}</span>
            <span className="aggregate-summary-card__label">Melhor posição</span>
          </div>
        </div>
      )}
    </div>
  );
};

AggregateSummaryCard.propTypes = {
  challenges: PropTypes.array.isRequired,
};

const SkeletonCards = () => (
  <div className="grid-cards">
    {[1, 2, 3].map((i) => (
      <div key={i} className="skeleton skeleton-card" />
    ))}
  </div>
);

const MyChallenges = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { trainers, trainerId, setTrainerId, loading: ctxLoading } = useTrainerContext();

  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState(ALL_FILTER);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (trainerId) params.set('trainerId', trainerId);
        if (statusFilter !== ALL_FILTER) params.set('status', statusFilter);
        const response = await api.get(`/my/challenges?${params.toString()}`);
        if (mounted) setChallenges(response.data || []);
      } catch (error) {
        if (mounted) showToast(error.userMessage || translateError(error), 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [trainerId, statusFilter, showToast]);

  if (ctxLoading) {
    return (
      <div>
          <div className="page-header-title-row">
          <Trophy size={24} className="page-header-title-icon" />
          <h1 className="page-title">Campeonatos</h1>
        </div>
        <div className="skeleton skeleton-card" style={{ marginBottom: 'var(--spacing-md)' }} />
        <SkeletonCards />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header-title-row">
        <Trophy size={24} className="page-header-title-icon" />
        <h1 className="page-title">Campeonatos</h1>
      </div>

      {trainers.length > 0 && (
        <TrainerContextSelect trainers={trainers} trainerId={trainerId} onChange={setTrainerId} />
      )}

      <AggregateSummaryCard challenges={challenges} />

      <div className="filter-chips" role="group" aria-label="Filtrar por status">
        <button
          type="button"
          className={`filter-chip${statusFilter === ALL_FILTER ? ' filter-chip--active' : ''}`}
          onClick={() => setStatusFilter(ALL_FILTER)}
        >
          Todos
        </button>
        {CHALLENGE_STATUS_VALUES.map((s) => (
          <button
            key={s}
            type="button"
            className={`filter-chip${statusFilter === s ? ' filter-chip--active' : ''}`}
            onClick={() => setStatusFilter(s)}
          >
            {CHALLENGE_STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {loading && <SkeletonCards />}

      {!loading && challenges.length === 0 && (
        <div className="empty-state">
          <p className="empty-state-title">Nenhum campeonato ativo.</p>
        </div>
      )}

      {!loading && challenges.length > 0 && (
        <div className="grid-cards">
          {challenges.map((c) => {
            const badgeClass = CHALLENGE_STATUS_BADGE[c.status] || 'badge-gray';
            const isCancelled = c.status === CHALLENGE_STATUS.CANCELLED;
            return (
              <button
                key={c.id}
                type="button"
                className="card card-link"
                onClick={() => navigate(`/my/challenges/${c.id}`)}
                style={{ textAlign: 'left' }}
              >
                <div className="card-header">
                  <h3 className="card-title" style={isCancelled ? { textDecoration: 'line-through' } : undefined}>
                    {c.name}
                  </h3>
                  <span className={`badge ${badgeClass}`}>{CHALLENGE_STATUS_LABEL[c.status]}</span>
                </div>
                <div className="date-display text-sm text-muted">
                  <Calendar size={14} strokeWidth={2} aria-hidden="true" />
                  {formatDateForDisplay(c.startDate)}
                  <span className="date-display__divider">—</span>
                  {formatDateForDisplay(c.endDate)}
                </div>
                {c.myPosition != null && (
                  <p className="text-sm text-light">
                    #{c.myPosition} · {c.myPoints ?? 0} pts
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyChallenges;
