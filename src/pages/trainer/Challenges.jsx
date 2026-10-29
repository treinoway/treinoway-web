import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Calendar } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import {
  CHALLENGE_STATUS,
  CHALLENGE_STATUS_LABEL,
} from '../../constants/challenge';

const FILTER_OPTIONS = [
  { key: CHALLENGE_STATUS.ACTIVE, label: 'Ativos' },
  { key: CHALLENGE_STATUS.SCHEDULED, label: 'Agendados' },
  { key: CHALLENGE_STATUS.COMPLETED, label: 'Encerrados' },
  { key: CHALLENGE_STATUS.CANCELLED, label: 'Cancelados' },
];

const getTemporalInfo = (challenge) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (challenge.status === CHALLENGE_STATUS.SCHEDULED) {
    const start = new Date(challenge.startDate + 'T00:00:00');
    const daysUntilStart = Math.ceil((start - today) / 86400000);
    if (daysUntilStart <= 0) return null;
    if (daysUntilStart === 1) return 'Começa amanhã';
    return `Começa em ${daysUntilStart} dias`;
  }

  if (challenge.status === CHALLENGE_STATUS.ACTIVE) {
    const end = new Date(challenge.endDate + 'T00:00:00');
    const daysLeft = Math.ceil((end - today) / 86400000);
    if (daysLeft < 0) return 'Encerramento pendente';
    if (daysLeft === 0) return 'Último dia';
    if (daysLeft === 1) return '1 dia restante';
    return `${daysLeft} dias restantes`;
  }

  return null;
};

const getProgressInfo = (challenge) => {
  const start = new Date(challenge.startDate + 'T00:00:00');
  const end = new Date(challenge.endDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalDays = Math.max(Math.ceil((end - start) / 86400000) + 1, 1);
  const elapsed = Math.ceil((today - start) / 86400000) + 1;
  const elapsedClamped = Math.max(0, Math.min(elapsed, totalDays));
  const remaining = totalDays - elapsedClamped;
  const percent = Math.round((elapsedClamped / totalDays) * 100);

  return { totalDays, elapsedDays: elapsedClamped, remaining, percent };
};

const formatShortDate = (dateStr) => {
  if (!dateStr) return '-';
  const [, m, d] = dateStr.split('-');
  return `${d}/${m}`;
};

const formatFullDate = (dateStr) => {
  if (!dateStr) return '-';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

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
  const [allChallenges, setAllChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(CHALLENGE_STATUS.ACTIVE);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const response = await api.get('/trainer/challenges');
        if (mounted) setAllChallenges(response.data || []);
      } catch (error) {
        if (mounted) showToast(error.userMessage || translateError(error), 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [showToast]);

  const challenges = allChallenges.filter((c) => c.status === statusFilter);
  const statusCounts = {
    [CHALLENGE_STATUS.ACTIVE]: allChallenges.filter((c) => c.status === CHALLENGE_STATUS.ACTIVE).length,
    [CHALLENGE_STATUS.SCHEDULED]: allChallenges.filter((c) => c.status === CHALLENGE_STATUS.SCHEDULED).length,
    [CHALLENGE_STATUS.COMPLETED]: allChallenges.filter((c) => c.status === CHALLENGE_STATUS.COMPLETED).length,
    [CHALLENGE_STATUS.CANCELLED]: allChallenges.filter((c) => c.status === CHALLENGE_STATUS.CANCELLED).length,
  };

  const renderActiveCard = (c) => {
    const progress = getProgressInfo(c);
    const hasParticipants = c.participantCount > 0;
    const isAlert = !hasParticipants;

    return (
      <button
        key={c.id}
        type="button"
        className="card card-link"
        onClick={() => navigate(`/trainer/challenges/${c.id}`)}
        style={{ textAlign: 'left' }}
      >
        <div className="card-header">
          <h3 className="card-title">{c.name}</h3>
          <span className="badge badge-green">{CHALLENGE_STATUS_LABEL[c.status]}</span>
        </div>

        <div className="date-display text-sm text-muted" style={{ marginTop: 'var(--spacing-xs)' }}>
          <Calendar size={14} strokeWidth={2} aria-hidden="true" />
          {formatShortDate(c.startDate)}
          <span className="date-display__divider">—</span>
          {formatFullDate(c.endDate)} · {progress.totalDays} dias
        </div>

        <div className="championship-progress">
          <div className="championship-progress-labels">
            <span>Progresso</span>
            <span>
              {progress.elapsedDays} de {progress.totalDays} dias
              {progress.remaining > 0 ? ` · ${progress.remaining} restantes` : ''}
            </span>
          </div>
          <div className="championship-progress-bar">
            <div className="championship-progress-fill" style={{ width: `${progress.percent}%` }} />
          </div>
        </div>

        {isAlert ? (
          <div className="championship-alert">
            <span className="championship-alert-text">
              Nenhum participante — campeonato inativo
            </span>
            <span
              className="championship-alert-action"
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); navigate(`/trainer/challenges/${c.id}?tab=participants`); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); navigate(`/trainer/challenges/${c.id}?tab=participants`); } }}
            >
              Adicionar alunos →
            </span>
          </div>
        ) : (
          <div className="championship-card-footer">
            <span className="text-sm text-muted">{c.participantCount} participantes</span>
            <span className="text-sm text-primary">Ver ranking →</span>
          </div>
        )}
      </button>
    );
  };

  const renderScheduledCard = (c) => {
    const temporalInfo = getTemporalInfo(c);
    const progress = getProgressInfo(c);
    return (
      <button
        key={c.id}
        type="button"
        className="card card-link"
        onClick={() => navigate(`/trainer/challenges/${c.id}`)}
        style={{ textAlign: 'left' }}
      >
        <div className="card-header">
          <h3 className="card-title">{c.name}</h3>
          <span className="badge badge-gray">{CHALLENGE_STATUS_LABEL[c.status]}</span>
        </div>
        <div className="date-display text-sm text-muted" style={{ marginTop: 'var(--spacing-xs)' }}>
          <Calendar size={14} strokeWidth={2} aria-hidden="true" />
          {formatShortDate(c.startDate)}
          <span className="date-display__divider">—</span>
          {formatFullDate(c.endDate)} · {progress.totalDays} dias
        </div>
        <div className="championship-card-footer">
          <span className="text-sm text-muted">{c.participantCount} participantes</span>
          {temporalInfo && <span className="text-sm text-muted">{temporalInfo}</span>}
        </div>
      </button>
    );
  };

  const renderCompletedCard = (c) => {
    const progress = getProgressInfo(c);
    return (
      <button
        key={c.id}
        type="button"
        className="card card-link"
        onClick={() => navigate(`/trainer/challenges/${c.id}`)}
        style={{ textAlign: 'left' }}
      >
        <div className="card-header">
          <h3 className="card-title">{c.name}</h3>
          <span className="badge badge-blue">{CHALLENGE_STATUS_LABEL[c.status]}</span>
        </div>
        <div className="date-display text-sm text-muted" style={{ marginTop: 'var(--spacing-xs)' }}>
          <Calendar size={14} strokeWidth={2} aria-hidden="true" />
          {formatShortDate(c.startDate)}
          <span className="date-display__divider">—</span>
          {formatFullDate(c.endDate)} · {progress.totalDays} dias
        </div>
        <div className="championship-card-footer">
          <span className="text-sm text-muted">{c.participantCount} participantes</span>
          <span className="text-sm text-primary">Ver ranking →</span>
        </div>
      </button>
    );
  };

  const renderCancelledCard = (c) => {
    const progress = getProgressInfo(c);
    return (
      <button
        key={c.id}
        type="button"
        className="card card-link"
        onClick={() => navigate(`/trainer/challenges/${c.id}`)}
        style={{ textAlign: 'left' }}
      >
        <div className="card-header">
          <h3 className="card-title" style={{ textDecoration: 'line-through' }}>{c.name}</h3>
          <span className="badge badge-red">{CHALLENGE_STATUS_LABEL[c.status]}</span>
        </div>
        <div className="date-display text-sm text-muted" style={{ marginTop: 'var(--spacing-xs)' }}>
          <Calendar size={14} strokeWidth={2} aria-hidden="true" />
          {formatShortDate(c.startDate)}
          <span className="date-display__divider">—</span>
          {formatFullDate(c.endDate)}
        </div>
        {c.cancelledAt && (
          <div className="date-display text-sm text-muted" style={{ marginTop: 'var(--spacing-xs)' }}>
            <Calendar size={14} strokeWidth={2} aria-hidden="true" />
            Cancelado em {formatFullDate(c.cancelledAt.split('T')[0])}
          </div>
        )}
        <div className="championship-card-footer">
          <span className="text-sm text-muted">{progress.totalDays} dias</span>
        </div>
      </button>
    );
  };

  const renderCard = (c) => {
    switch (c.status) {
      case CHALLENGE_STATUS.ACTIVE: return renderActiveCard(c);
      case CHALLENGE_STATUS.SCHEDULED: return renderScheduledCard(c);
      case CHALLENGE_STATUS.COMPLETED: return renderCompletedCard(c);
      case CHALLENGE_STATUS.CANCELLED: return renderCancelledCard(c);
      default: return renderActiveCard(c);
    }
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div className="page-header-title-row">
          <Trophy size={24} className="page-header-title-icon" />
          <h1 className="page-title">Campeonatos</h1>
        </div>
      </div>

      <div className="tabs-container" role="tablist" aria-label="Filtrar por status">
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={statusFilter === f.key}
            className={`tab-button${statusFilter === f.key ? ' tab-button--active' : ''}`}
            onClick={() => setStatusFilter(f.key)}
          >
            {f.label}
            {statusCounts[f.key] > 0 && (
              <span className={`tab-badge${statusFilter === f.key ? ' tab-badge--active' : ''}`}>
                {statusCounts[f.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && <SkeletonCards />}

      {!loading && challenges.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon empty-state-icon--accent">
            <Trophy size={32} strokeWidth={1.2} />
          </div>
          <p className="empty-state-title">
            Nenhum campeonato {CHALLENGE_STATUS_LABEL[statusFilter]?.toLowerCase() || ''}.
          </p>
          <p className="text-sm text-muted">
            {statusFilter === CHALLENGE_STATUS.ACTIVE && 'Seus campeonatos ativos aparecerão aqui.'}
            {statusFilter === CHALLENGE_STATUS.SCHEDULED && 'Campeonatos agendados para o futuro aparecerão aqui.'}
            {statusFilter === CHALLENGE_STATUS.COMPLETED && 'Seus campeonatos encerrados ficarão registrados aqui.'}
            {statusFilter === CHALLENGE_STATUS.CANCELLED && 'Campeonatos que foram cancelados aparecerão aqui.'}
          </p>
        </div>
      )}

      {!loading && challenges.length > 0 && (
        <div className="grid-cards">
          {challenges.map(renderCard)}
        </div>
      )}
    </div>
  );
};

export default Challenges;
