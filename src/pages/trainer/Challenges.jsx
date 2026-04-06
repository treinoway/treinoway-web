import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import InfoBanner from '../../components/InfoBanner';
import QuickCreateChallengeSheet from '../../components/QuickCreateChallengeSheet';
import { formatDateForDisplay } from '../../utils/dateFormat';
import {
  CHALLENGE_STATUS,
  CHALLENGE_STATUS_LABEL,
  CHALLENGE_STATUS_BADGE,
} from '../../constants/challenge';

const FILTER_OPTIONS = [
  { key: CHALLENGE_STATUS.ACTIVE, label: 'Ativos' },
  { key: CHALLENGE_STATUS.COMPLETED, label: 'Encerrados' },
  { key: CHALLENGE_STATUS.CANCELLED, label: 'Cancelados' },
];

const SkeletonCards = () => (
  <div className="grid-cards">
    {[1, 2, 3].map((i) => (
      <div key={i} className="skeleton skeleton-card" />
    ))}
  </div>
);

const Challenges = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(CHALLENGE_STATUS.ACTIVE);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [hasAnyChallenges, setHasAnyChallenges] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.get('/trainer/challenges')
      .then((r) => { if (mounted) setHasAnyChallenges((r.data || []).length > 0); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/trainer/challenges?status=${statusFilter}`);
        if (mounted) {
          const data = response.data || [];
          setChallenges(data);
          if (data.length > 0) setHasAnyChallenges(true);
        }
      } catch (error) {
        if (mounted) showToast(error.userMessage || translateError(error), 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [statusFilter, showToast]);

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 'var(--spacing-md)' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Campeonatos</h1>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setShowQuickCreate(true)}
        >
          <Plus size={16} strokeWidth={1.6} /> Criar
        </button>
      </div>

      {!hasAnyChallenges && (
        <InfoBanner text="Crie campeonatos com ranking e pontuação para engajar seus alunos. Cada treino concluído, sequência mantida ou check-in diário gera pontos automaticamente." />
      )}

      <div className="filter-chips" role="group" aria-label="Filtrar por status">
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`filter-chip${statusFilter === f.key ? ' filter-chip--active' : ''}`}
            onClick={() => setStatusFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && <SkeletonCards />}

      {!loading && challenges.length === 0 && (
        <div className="empty-state">
          <p className="empty-state-title">Nenhum campeonato {CHALLENGE_STATUS_LABEL[statusFilter]?.toLowerCase() || ''}.</p>
          {statusFilter === CHALLENGE_STATUS.ACTIVE && (
            <button type="button" className="btn-primary" onClick={() => setShowQuickCreate(true)}>
              Criar meu primeiro campeonato
            </button>
          )}
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
                onClick={() => navigate(`/trainer/challenges/${c.id}`)}
                style={{ textAlign: 'left' }}
              >
                <div className="card-header">
                  <h3 className="card-title" style={isCancelled ? { textDecoration: 'line-through' } : undefined}>
                    {c.name}
                  </h3>
                  <span className={`badge ${badgeClass}`}>{CHALLENGE_STATUS_LABEL[c.status]}</span>
                </div>
                <p className="text-sm text-muted">
                  {formatDateForDisplay(c.startDate)} — {formatDateForDisplay(c.endDate)}
                </p>
                <p className="text-sm text-light">{c.participantCount} participantes</p>
              </button>
            );
          })}
        </div>
      )}

      {showQuickCreate && (
        <QuickCreateChallengeSheet
          onClose={() => setShowQuickCreate(false)}
          onCreated={(newId) => navigate(`/trainer/challenges/${newId}`)}
        />
      )}
    </div>
  );
};

export default Challenges;
