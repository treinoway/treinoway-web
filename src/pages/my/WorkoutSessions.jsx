import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Dumbbell } from 'lucide-react';
import api from '../../api/axios';
import { useToast } from '../../contexts/ToastContext';
import {
  getWorkoutSessionStatusLabel,
  getWorkoutSessionStatusBadgeClass,
  WORKOUT_SESSION_STATUS,
} from '../../constants/workoutSession';

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: WORKOUT_SESSION_STATUS.IN_PROGRESS, label: 'Em andamento' },
  { value: WORKOUT_SESSION_STATUS.COMPLETED, label: 'Concluídos' },
  { value: WORKOUT_SESSION_STATUS.ABANDONED, label: 'Abandonados' },
];

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '—';
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  if (minutes === 0) return `${remaining}s`;
  return remaining > 0 ? `${minutes}min ${remaining}s` : `${minutes}min`;
}

function formatSessionDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const WorkoutSessions = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [sessions, setSessions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const limit = 20;

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (statusFilter) params.status = statusFilter;

      const response = await api.get('/my/workout-sessions', { params });
      setSessions(response.data.data);
      setTotal(response.data.total);
    } catch (error) {
      showToast(error.userMessage || 'Erro ao carregar sessões de treino.', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, showToast]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleStatusChange = (newStatus) => {
    setStatusFilter(newStatus);
    setPage(1);
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <button onClick={() => navigate('/')} className="btn-back">
        <ArrowLeft size={16} strokeWidth={1.6} /> Voltar
      </button>

      <h1 className="page-title">Histórico de Treinos</h1>

      <div className="filter-row">
        {STATUS_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`btn btn-sm ${statusFilter === opt.value ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleStatusChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-screen">
          <div className="loading-text">Carregando...</div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="empty-state">
          <Dumbbell size={40} strokeWidth={1.4} style={{ marginBottom: 'var(--spacing-lg)', color: 'var(--color-outline)' }} />
          <p className="empty-state-title">Nenhuma sessão encontrada</p>
          <p>Inicie um treino para começar a registrar seu histórico.</p>
        </div>
      ) : (
        <>
          <div className="stack-md">
            {sessions.map((session) => (
              <button
                key={session.id}
                className="card card-link"
                onClick={() => navigate(`/my/workout-sessions/${session.id}`)}
              >
                <div className="card-header-start">
                  <div>
                    <p className="card-title">{session.training?.name ?? 'Treino'}</p>
                    <p className="text-muted text-sm">{formatSessionDate(session.startedAt)}</p>
                  </div>
                  <span className={getWorkoutSessionStatusBadgeClass(session.status)}>
                    {getWorkoutSessionStatusLabel(session.status)}
                  </span>
                </div>

                {session.durationSeconds != null && (
                  <p className="text-sm mt-sm">
                    Duração: <strong>{formatDuration(session.durationSeconds)}</strong>
                  </p>
                )}
              </button>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination-row">
              <button
                className="btn btn-sm btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </button>
              <span className="text-sm text-muted">
                Página {page} de {totalPages}
              </span>
              <button
                className="btn btn-sm btn-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WorkoutSessions;
