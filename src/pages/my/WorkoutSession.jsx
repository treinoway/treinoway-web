import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, SkipForward, Plus, Trash2, ChevronDown, ChevronUp, Repeat } from 'lucide-react';
import PropTypes from 'prop-types';
import api from '../../api/axios';
import { useToast } from '../../contexts/ToastContext';
import {
  getWorkoutSessionStatusLabel,
  getWorkoutSessionStatusBadgeClass,
  WORKOUT_SESSION_STATUS,
  EXERCISE_LOG_STATUS,
} from '../../constants/workoutSession';
import { formatExerciseMeta } from '../../utils/exerciseMeta';
import SwapExerciseSheet from '../../components/SwapExerciseSheet';
import SubstitutedLogLine from '../../components/SubstitutedLogLine';
import DurationLabel from '../../components/DurationLabel';
import StudentIntensityBand from '../../components/StudentIntensityBand';
import { t } from '../../i18n';
import { shouldShowGif } from '../../utils/gif';

const interpolate = (template, values) =>
  template.replace(/\{(\w+)\}/g, (_, key) =>
    values[key] !== undefined ? String(values[key]) : `{${key}}`
  );

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

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return '—';
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  if (minutes === 0) return `${remaining}s`;
  return remaining > 0 ? `${minutes}min ${remaining}s` : `${minutes}min`;
}

const SET_LOG_INITIAL_STATE = {
  setNumber: '',
  repetitions: '',
  load: '',
  duration: '',
  rpe: '',
  restSeconds: '',
  completed: true,
  notes: '',
};

function buildSetLogPayload(form) {
  return {
    setNumber: Number(form.setNumber),
    repetitions: form.repetitions !== '' ? Number(form.repetitions) : undefined,
    load: form.load !== '' ? Number(form.load) : undefined,
    duration: form.duration !== '' ? Number(form.duration) : undefined,
    rpe: form.rpe !== '' ? Number(form.rpe) : undefined,
    restSeconds: form.restSeconds !== '' ? Number(form.restSeconds) : undefined,
    completed: form.completed,
    notes: form.notes || undefined,
  };
}

function SetLogForm({ sessionId, exerciseLogId, onSaved, onCancel }) {
  const { showToast } = useToast();
  const [form, setForm] = useState(SET_LOG_INITIAL_STATE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.setNumber) {
      setError('O número da série é obrigatório.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const response = await api.post(
        `/my/workout-sessions/${sessionId}/exercise-logs/${exerciseLogId}/sets`,
        buildSetLogPayload(form),
      );
      onSaved(response.data);
      setForm(SET_LOG_INITIAL_STATE);
    } catch (err) {
      showToast(err.userMessage || 'Erro ao registrar série.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="set-log-form">
      <div className="set-log-form-grid">
        <div className="form-group">
          <label className="form-label" htmlFor={`setNumber-${exerciseLogId}`}>
            Série *
          </label>
          <input
            id={`setNumber-${exerciseLogId}`}
            type="number"
            className={`form-input form-input--sm ${error ? 'form-input--error' : ''}`}
            value={form.setNumber}
            onChange={(e) => handleChange('setNumber', e.target.value)}
            min="1"
            placeholder="1"
          />
          {error && <p className="form-error">{error}</p>}
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor={`reps-${exerciseLogId}`}>
            Reps
          </label>
          <input
            id={`reps-${exerciseLogId}`}
            type="number"
            className="form-input form-input--sm"
            value={form.repetitions}
            onChange={(e) => handleChange('repetitions', e.target.value)}
            min="0"
            placeholder="—"
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor={`load-${exerciseLogId}`}>
            Carga (kg)
          </label>
          <input
            id={`load-${exerciseLogId}`}
            type="number"
            className="form-input form-input--sm"
            value={form.load}
            onChange={(e) => handleChange('load', e.target.value)}
            min="0"
            step="0.5"
            placeholder="—"
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor={`rpe-${exerciseLogId}`}>
            RPE
          </label>
          <input
            id={`rpe-${exerciseLogId}`}
            type="number"
            className="form-input form-input--sm"
            value={form.rpe}
            onChange={(e) => handleChange('rpe', e.target.value)}
            min="1"
            max="10"
            placeholder="—"
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor={`rest-${exerciseLogId}`}>
            Descanso (s)
          </label>
          <input
            id={`rest-${exerciseLogId}`}
            type="number"
            className="form-input form-input--sm"
            value={form.restSeconds}
            onChange={(e) => handleChange('restSeconds', e.target.value)}
            min="0"
            placeholder="—"
          />
        </div>
      </div>
      <div className="set-log-form-actions">
        <button type="submit" className="btn btn-sm btn-primary" disabled={saving}>
          {saving ? 'Salvando...' : 'Adicionar Série'}
        </button>
        <button type="button" className="btn btn-sm btn-secondary" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

SetLogForm.propTypes = {
  sessionId: PropTypes.string.isRequired,
  exerciseLogId: PropTypes.string.isRequired,
  onSaved: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

function SetLogRow({ sessionId, exerciseLogId, setLog, onDeleted }) {
  const { showToast } = useToast();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(
        `/my/workout-sessions/${sessionId}/exercise-logs/${exerciseLogId}/sets/${setLog.id}`,
      );
      onDeleted(setLog.id);
    } catch (err) {
      showToast(err.userMessage || 'Erro ao remover série.', 'error');
    } finally {
      setDeleting(false);
    }
  }

  const parts = [];
  if (setLog.repetitions != null) parts.push(`${setLog.repetitions} reps`);
  if (setLog.load != null) parts.push(`${setLog.load} kg`);
  if (setLog.duration != null) parts.push(`${setLog.duration}s`);
  if (setLog.rpe != null) parts.push(`RPE ${setLog.rpe}`);

  return (
    <div className="set-log-row">
      <span className="set-log-number">Série {setLog.setNumber}</span>
      <span className="set-log-detail">{parts.length ? parts.join(' · ') : '—'}</span>
      <button
        className="btn-delete-sm"
        onClick={handleDelete}
        disabled={deleting}
        aria-label={`Remover série ${setLog.setNumber}`}
      >
        <Trash2 size={14} strokeWidth={1.6} />
      </button>
    </div>
  );
}

SetLogRow.propTypes = {
  sessionId: PropTypes.string.isRequired,
  exerciseLogId: PropTypes.string.isRequired,
  setLog: PropTypes.shape({
    id: PropTypes.string.isRequired,
    setNumber: PropTypes.number.isRequired,
    repetitions: PropTypes.number,
    load: PropTypes.number,
    duration: PropTypes.number,
    rpe: PropTypes.number,
  }).isRequired,
  onDeleted: PropTypes.func.isRequired,
};

function ExerciseLogCard({ sessionId, exerciseLog, isSessionActive, onUpdated, onSwapRequest = () => {} }) {
  const { showToast } = useToast();
  const [showSetForm, setShowSetForm] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [setLogs, setSetLogs] = useState(exerciseLog.setLogs || []);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const substitutes = exerciseLog.exercise?.substitutes || [];
  const canSwap =
    isSessionActive
    && substitutes.length > 0
    && !exerciseLog.substitutedByExerciseId
    && setLogs.length === 0;

  async function handleStatusChange(newStatus) {
    setUpdatingStatus(true);
    try {
      const response = await api.patch(
        `/my/workout-sessions/${sessionId}/exercise-logs/${exerciseLog.id}`,
        { status: newStatus },
      );
      onUpdated(response.data);
    } catch (err) {
      showToast(err.userMessage || 'Erro ao atualizar exercício.', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  }

  function handleSetSaved(newSetLog) {
    setSetLogs((prev) => [...prev, newSetLog]);
    setShowSetForm(false);
  }

  function handleSetDeleted(setLogId) {
    setSetLogs((prev) => prev.filter((s) => s.id !== setLogId));
  }

  const meta = formatExerciseMeta(exerciseLog.exercise);
  const status = exerciseLog.status;
  const isCompleted = status === EXERCISE_LOG_STATUS.COMPLETED;
  const isSkipped = status === EXERCISE_LOG_STATUS.SKIPPED;

  return (
    <div className={`exercise-log-card ${isCompleted ? 'exercise-log-card--done' : ''} ${isSkipped ? 'exercise-log-card--skipped' : ''}`}>
      <div className="exercise-log-card-header">
        <div className="exercise-log-card-info">
          <button
            className="exercise-log-card-toggle"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? 'Expandir exercício' : 'Recolher exercício'}
          >
            {collapsed ? <ChevronDown size={16} strokeWidth={1.6} /> : <ChevronUp size={16} strokeWidth={1.6} />}
          </button>
          <div>
            <p className="exercise-log-card-name">
              {exerciseLog.exercise?.name ?? 'Exercício'}
              {substitutes.length > 0 && (
                <span className="alt-count-chip" aria-label={`${substitutes.length} alternativas`}>
                  {interpolate(t('substitute.altShort') || '{count} alt.', { count: substitutes.length })}
                </span>
              )}
            </p>
            {meta && <p className="text-sm text-muted">{meta}</p>}
            {(exerciseLog.exercise?.videoFileUrl || exerciseLog.exercise?.videoUrl) && (
              <a
                href={exerciseLog.exercise.videoFileUrl || exerciseLog.exercise.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-link"
              >
                ▷ Ver vídeo
              </a>
            )}
            {shouldShowGif(exerciseLog.exercise ?? {}) && (
              <a
                href={exerciseLog.exercise.gifUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-link"
              >
                ▷ Ver GIF
              </a>
            )}
            {exerciseLog.exercise?.notes && (
              <p className="text-sm text-muted">{exerciseLog.exercise.notes}</p>
            )}
          </div>
        </div>
        {isSessionActive && (
          <div className="exercise-log-card-actions">
            {canSwap && (
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => onSwapRequest(exerciseLog)}
                aria-label={`Trocar ${exerciseLog.exercise?.name ?? 'exercício'}`}
              >
                <Repeat size={14} strokeWidth={2} />
                {t('substitute.swap') || 'Trocar'}
              </button>
            )}
            {!isCompleted && (
              <button
                className="btn btn-sm btn-primary"
                disabled={updatingStatus}
                onClick={() => handleStatusChange(EXERCISE_LOG_STATUS.COMPLETED)}
                aria-label="Marcar exercício como concluído"
              >
                <CheckCircle size={14} strokeWidth={1.6} />
                Concluir
              </button>
            )}
            {!isSkipped && !isCompleted && (
              <button
                className="btn btn-sm btn-secondary"
                disabled={updatingStatus}
                onClick={() => handleStatusChange(EXERCISE_LOG_STATUS.SKIPPED)}
                aria-label="Pular exercício"
              >
                <SkipForward size={14} strokeWidth={1.6} />
                Pular
              </button>
            )}
            {(isCompleted || isSkipped) && (
              <button
                className="btn btn-sm btn-secondary"
                disabled={updatingStatus}
                onClick={() => handleStatusChange(EXERCISE_LOG_STATUS.PENDING)}
                aria-label="Desfazer status do exercício"
              >
                Desfazer
              </button>
            )}
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="exercise-log-card-body">
          {exerciseLog.exercise?.intensity && (
            <StudentIntensityBand
              exerciseName={exerciseLog.exercise?.name ?? 'Exercício'}
              summary={meta}
              intensity={exerciseLog.exercise.intensity}
              label={exerciseLog.exercise.intensityLabel}
            />
          )}
          {setLogs.length > 0 && (
            <div className="set-log-list">
              {setLogs.map((setLog) => (
                <SetLogRow
                  key={setLog.id}
                  sessionId={sessionId}
                  exerciseLogId={exerciseLog.id}
                  setLog={setLog}
                  onDeleted={handleSetDeleted}
                />
              ))}
            </div>
          )}

          {isSessionActive && !showSetForm && (
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => setShowSetForm(true)}
            >
              <Plus size={14} strokeWidth={1.6} />
              Adicionar Série
            </button>
          )}

          {isSessionActive && showSetForm && (
            <SetLogForm
              sessionId={sessionId}
              exerciseLogId={exerciseLog.id}
              onSaved={handleSetSaved}
              onCancel={() => setShowSetForm(false)}
            />
          )}

          {!isSessionActive && setLogs.length === 0 && (
            <p className="text-sm text-muted">Nenhuma série registrada.</p>
          )}
        </div>
      )}
    </div>
  );
}

ExerciseLogCard.propTypes = {
  sessionId: PropTypes.string.isRequired,
  exerciseLog: PropTypes.shape({
    id: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    order: PropTypes.number,
    notes: PropTypes.string,
    substitutedByExerciseId: PropTypes.string,
    exercise: PropTypes.shape({
      name: PropTypes.string,
      notes: PropTypes.string,
      videoUrl: PropTypes.string,
      videoFileUrl: PropTypes.string,
      gifUrl: PropTypes.string,
      intensity: PropTypes.string,
      intensityLabel: PropTypes.string,
      substitutes: PropTypes.array,
    }),
    setLogs: PropTypes.array,
  }).isRequired,
  isSessionActive: PropTypes.bool.isRequired,
  onUpdated: PropTypes.func.isRequired,
  onSwapRequest: PropTypes.func,
};

const WorkoutSession = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [session, setSession] = useState(null);
  const [exerciseLogs, setExerciseLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [swapTarget, setSwapTarget] = useState(null);
  // Map of `principalLogId → { originalName, newName, swappedAt }` so we can
  // render the SubstitutedLogLine + Undo affordance for the 15s window.
  //
  // KNOWN LIMITATION (v1, by design): the backend has no API to detect that a
  // student has an active (in-progress) session, so when a trainer edits the
  // exercise's substitutes mid-session we cannot show a banner prompting the
  // student to refresh. Substitute edits ARE picked up on the next manual
  // session refresh because the session payload includes nested
  // `exerciseLogs[].exercise.substitutes[]` live from the database. Track the
  // banner work in a future ticket once an "active session" endpoint exists.
  const [recentSwaps, setRecentSwaps] = useState({});

  const fetchSession = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/my/workout-sessions/${sessionId}`);
      setSession(response.data);
      setExerciseLogs(response.data.exerciseLogs || []);
    } catch (err) {
      showToast(err.userMessage || 'Erro ao carregar sessão de treino.', 'error');
    } finally {
      setLoading(false);
    }
  }, [sessionId, showToast]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  async function handleFinishSession(status) {
    setFinishing(true);
    try {
      const response = await api.patch(`/my/workout-sessions/${sessionId}`, { status });
      setSession(response.data);
      showToast(
        status === WORKOUT_SESSION_STATUS.COMPLETED
          ? 'Treino concluído com sucesso!'
          : 'Treino abandonado.',
        status === WORKOUT_SESSION_STATUS.COMPLETED ? 'success' : 'info',
      );
    } catch (err) {
      showToast(err.userMessage || 'Erro ao finalizar sessão.', 'error');
    } finally {
      setFinishing(false);
    }
  }

  function handleExerciseLogUpdated(updatedLog) {
    setExerciseLogs((prev) =>
      prev.map((log) => (log.id === updatedLog.id ? { ...log, ...updatedLog } : log)),
    );
  }

  // Student swap flow.
  // Backend contract: POST /my/workout-sessions/:sessionId/exercise-logs/:logId/substitute
  // returns 201 with the new ExerciseLog at order = principal.order + 1.
  // We append it locally and stamp the principal log with substitutedByExerciseId
  // so the row collapses into the SubstitutedLogLine state.
  async function handleSwapConfirm(substitute) {
    if (!swapTarget) return;
    const principalLog = swapTarget;
    try {
      const response = await api.post(
        `/my/workout-sessions/${sessionId}/exercise-logs/${principalLog.id}/substitute`,
        { substituteExerciseId: substitute.id },
      );
      const newLog = response.data;
      setExerciseLogs((prev) => [
        ...prev.map((log) =>
          log.id === principalLog.id
            ? { ...log, substitutedByExerciseId: substitute.id }
            : log,
        ),
        newLog,
      ]);
      setRecentSwaps((prev) => ({
        ...prev,
        [principalLog.id]: {
          originalName: principalLog.exercise?.name ?? 'Exercício',
          newName: substitute.name,
          newLogId: newLog.id,
          swappedAt: new Date().toISOString(),
        },
      }));
      setSwapTarget(null);
    } catch (err) {
      showToast(err.userMessage || (t('substitute.swapFailed') || 'Erro ao trocar exercício.'), 'error');
    }
  }

  // Undo swap — only available within the 15s window AND while no set has
  // been logged on the new exercise. We DELETE the new exercise log and
  // clear the principal's substitutedByExerciseId locally.
  async function handleSwapUndo(principalLogId) {
    const swap = recentSwaps[principalLogId];
    if (!swap) return;
    try {
      await api.delete(
        `/my/workout-sessions/${sessionId}/exercise-logs/${swap.newLogId}`,
      );
      setExerciseLogs((prev) =>
        prev
          .filter((log) => log.id !== swap.newLogId)
          .map((log) =>
            log.id === principalLogId ? { ...log, substitutedByExerciseId: null } : log,
          ),
      );
      setRecentSwaps((prev) => {
        const { [principalLogId]: _, ...rest } = prev;
        return rest;
      });
    } catch (err) {
      showToast(err.userMessage || 'Erro ao desfazer troca.', 'error');
    }
  }

  function handleSwapAutoHide(principalLogId) {
    setRecentSwaps((prev) => {
      const { [principalLogId]: _, ...rest } = prev;
      return rest;
    });
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-text">Carregando...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">Sessão não encontrada</p>
        <button className="btn btn-primary mt-md" onClick={() => navigate('/my/workout-sessions')}>
          Ver Histórico
        </button>
      </div>
    );
  }

  const isSessionActive = session.status === WORKOUT_SESSION_STATUS.IN_PROGRESS;

  return (
    <div>
      <button onClick={() => navigate('/my/workout-sessions')} className="btn-back">
        <ArrowLeft size={16} strokeWidth={1.6} /> Histórico de Treinos
      </button>

      <div className="card card--mb">
        <div className="card-header-start">
          <div>
            <h1 className="page-title mb-0">{session.training?.name ?? 'Treino'}</h1>
            <p className="text-sm text-muted">{formatSessionDate(session.startedAt)}</p>
            {session.training && (
              <DurationLabel
                seconds={session.training.estimatedDurationSeconds}
                variant="inline"
                className="session-header-duration"
              />
            )}
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

        {session.notes && (
          <p className="text-sm mt-sm text-muted">{session.notes}</p>
        )}

        {isSessionActive && (
          <div className="btn-group mt-md">
            <button
              className="btn btn-primary"
              onClick={() => handleFinishSession(WORKOUT_SESSION_STATUS.COMPLETED)}
              disabled={finishing}
            >
              <CheckCircle size={16} strokeWidth={1.6} />
              Finalizar Treino
            </button>
            <button
              className="btn btn-danger"
              onClick={() => handleFinishSession(WORKOUT_SESSION_STATUS.ABANDONED)}
              disabled={finishing}
            >
              Abandonar
            </button>
          </div>
        )}
      </div>

      <h2 className="card-title mb-md">Exercícios</h2>

      {exerciseLogs.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">Nenhum exercício neste treino</p>
        </div>
      ) : (
        <div className="stack-md">
          {exerciseLogs
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((exerciseLog) => {
              const swap = recentSwaps[exerciseLog.id];
              const newLog = swap
                ? exerciseLogs.find((l) => l.id === swap.newLogId)
                : null;
              const undoDisabled = !!(newLog?.setLogs && newLog.setLogs.length > 0);
              return (
                <div key={exerciseLog.id}>
                  {swap && (
                    <SubstitutedLogLine
                      originalName={swap.originalName}
                      newName={swap.newName}
                      swappedAt={swap.swappedAt}
                      undoDisabled={undoDisabled}
                      onUndo={() => handleSwapUndo(exerciseLog.id)}
                      onAutoHide={() => handleSwapAutoHide(exerciseLog.id)}
                    />
                  )}
                  <ExerciseLogCard
                    sessionId={sessionId}
                    exerciseLog={exerciseLog}
                    isSessionActive={isSessionActive}
                    onUpdated={handleExerciseLogUpdated}
                    onSwapRequest={(log) => setSwapTarget(log)}
                  />
                </div>
              );
            })}
        </div>
      )}

      <SwapExerciseSheet
        open={!!swapTarget}
        principalName={swapTarget?.exercise?.name}
        substitutes={swapTarget?.exercise?.substitutes || []}
        onSwap={handleSwapConfirm}
        onClose={() => setSwapTarget(null)}
      />
    </div>
  );
};

export default WorkoutSession;
