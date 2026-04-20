import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Calendar, Pencil, Trash2 } from 'lucide-react';
import PropTypes from 'prop-types';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import { getWeekDayLabel } from '../../constants/weekDays';
import { getProtocolTypeLabel } from '../../constants/protocolTypes';
import { getStatusLabel } from '../../constants/protocolStatus';
import { formatDateForDisplay } from '../../utils/dateFormat';
import { formatExerciseMeta } from '../../utils/exerciseMeta';

const calcDaysRemaining = (expirationDate) => {
  if (!expirationDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expirationDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
};

const getStatusHero = (daysRemaining, status) => {
  if (daysRemaining === null) {
    return { cls: 'status-hero status-hero--active', label: getStatusLabel(status) };
  }
  if (daysRemaining < 0) {
    const abs = Math.abs(daysRemaining);
    return {
      cls: 'status-hero status-hero--danger',
      label: `Vencida há ${abs} dia${abs === 1 ? '' : 's'}`,
    };
  }
  if (daysRemaining === 0) {
    return { cls: 'status-hero status-hero--warning', label: 'Vence hoje' };
  }
  if (daysRemaining <= 7) {
    return {
      cls: 'status-hero status-hero--warning',
      label: `Vence em ${daysRemaining} dia${daysRemaining === 1 ? '' : 's'}`,
    };
  }
  return { cls: 'status-hero status-hero--active', label: getStatusLabel(status) };
};

const DAYS = [
  { key: 'monday', label: 'Seg' },
  { key: 'tuesday', label: 'Ter' },
  { key: 'wednesday', label: 'Qua' },
  { key: 'thursday', label: 'Qui' },
  { key: 'friday', label: 'Sex' },
  { key: 'saturday', label: 'Sáb' },
  { key: 'sunday', label: 'Dom' },
];

const WeekGrid = ({ trainings }) => {
  const byDay = {};
  trainings.forEach((t) => {
    const d = (t.weekDay || '').toLowerCase();
    if (d) byDay[d] = (byDay[d] || 0) + 1;
  });

  return (
    <div className="week-grid">
      {DAYS.map(({ key, label }) => (
        <div
          key={key}
          className={`week-grid__cell${byDay[key] ? ' week-grid__cell--active' : ''}`}
        >
          {label}
          {byDay[key] ? <span className="week-grid__count">{byDay[key]}</span> : null}
        </div>
      ))}
    </div>
  );
};

WeekGrid.propTypes = {
  trainings: PropTypes.array.isRequired,
};

const TrainingCard = ({ training, exercises }) => {
  const [open, setOpen] = useState(false);
  const exerciseCount = exercises.length;
  const weekDayLabel = training.weekDay ? getWeekDayLabel(training.weekDay) : null;
  const previewText =
    exercises.length > 0
      ? exercises
          .slice(0, 3)
          .map((e) => e.name)
          .join(' · ') + (exercises.length > 3 ? ` · +${exercises.length - 3}` : '')
      : null;

  return (
    <article className={`training-card--view${open ? ' training-card--open' : ''}`}>
      <button
        type="button"
        className="training-card__toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`${open ? 'Recolher' : 'Expandir'} treino ${training.name}`}
      >
        <span className="training-card__order">{training.order}</span>
        <div className="training-card__body">
          <div className="training-card__row1">
            <span className="training-card__title">{training.name}</span>
            {weekDayLabel ? (
              <span className="training-card__day">{weekDayLabel}</span>
            ) : (
              <span className="training-card__day training-card__day--free">Livre</span>
            )}
          </div>
          {previewText && (
            <div className="training-card__preview">{previewText}</div>
          )}
        </div>
        <div className="training-card__right">
          <span className="training-card__count">{exerciseCount}</span>
          <span className="training-card__count-label">ex</span>
        </div>
        <ChevronDown
          size={16}
          strokeWidth={2}
          className="training-card__chevron"
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="training-card__exercises">
          {exercises.length === 0 ? (
            <p className="training-card-exercises-empty">Nenhum exercício cadastrado.</p>
          ) : (
            exercises.map((exercise) => {
              const meta = formatExerciseMeta(exercise);
              return (
                <div key={exercise.id} className="exercise-row">
                  <div>
                    <span className="exercise-row__name">{exercise.name}</span>
                    {exercise.notes && (
                      <p className="training-card-exercise-notes">{exercise.notes}</p>
                    )}
                  </div>
                  {meta && <span className="exercise-row__meta">{meta}</span>}
                </div>
              );
            })
          )}
        </div>
      )}
    </article>
  );
};

TrainingCard.propTypes = {
  training: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string,
    order: PropTypes.number,
    weekDay: PropTypes.string,
  }).isRequired,
  exercises: PropTypes.array.isRequired,
};

const ProtocolView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [protocol, setProtocol] = useState(null);
  const [trainings, setTrainings] = useState([]);
  const [exercisesMap, setExercisesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState(null);

  useEffect(() => {
    fetchProtocol();
    fetchTrainings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchProtocol = async () => {
    try {
      const response = await api.get(`/trainer/protocols/${id}`);
      setProtocol(response.data);
    } catch (error) {
      console.error('Failed to fetch protocol:', error);
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchExercisesForTraining = async (trainingId) => {
    try {
      const response = await api.get(`/trainer/trainings/${trainingId}/exercises`);
      setExercisesMap((prev) => ({ ...prev, [trainingId]: response.data || [] }));
    } catch (error) {
      console.error('Failed to fetch exercises:', error);
    }
  };

  const fetchTrainings = async () => {
    try {
      const response = await api.get(`/trainer/protocols/${id}/trainings`);
      const list = response.data || [];
      setTrainings(list);
      list.forEach((t) => fetchExercisesForTraining(t.id));
    } catch (error) {
      console.error('Failed to fetch trainings:', error);
    }
  };

  const handleDelete = () => {
    setConfirmDialog({
      message: `Excluir "${protocol.name}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/trainer/protocols/${id}`);
          showToast('Rotina excluída com sucesso!', 'success');
          const assigneeId = protocol?.assignee?.id;
          if (assigneeId) {
            navigate(`/trainer/students/${assigneeId}`);
          } else {
            navigate('/trainer/students');
          }
        } catch (error) {
          showToast(error.userMessage || translateError(error), 'error');
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="loading-text">Carregando...</span>
      </div>
    );
  }

  if (!protocol) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">Rotina não encontrada</p>
        <button className="btn-primary" onClick={() => navigate('/trainer/students')}>
          Voltar para Alunos
        </button>
      </div>
    );
  }

  const assigneeLabel =
    [protocol?.assignee?.firstName, protocol?.assignee?.lastName]
      .filter(Boolean)
      .join(' ') ||
    protocol?.assignee?.name ||
    protocol?.assignee?.email ||
    'Aluno';

  const typeLabel = protocol.type ? getProtocolTypeLabel(protocol.type) : null;
  const trainingsCount = trainings.length;
  const expirationField = protocol.expirationDate || protocol.endDate;
  const daysRemaining = calcDaysRemaining(expirationField);
  const { cls: statusHeroCls, label: statusHeroLabel } = getStatusHero(
    daysRemaining,
    protocol.status,
  );

  const weeksCount =
    protocol.startDate && expirationField
      ? Math.round(
          Math.abs(new Date(expirationField) - new Date(protocol.startDate)) /
            (1000 * 60 * 60 * 24 * 7),
        )
      : null;

  const daysRemainingUnit =
    daysRemaining === null
      ? ''
      : daysRemaining >= 0
        ? 'restantes'
        : 'atraso';

  const summaryTrainings = trainings.map((t) => ({
    id: t.id,
    weekDay: (t.weekDay || '').toLowerCase() || null,
  }));

  return (
    <div>
      <button
        className="btn-back"
        onClick={() => {
          const assigneeId = protocol?.assignee?.id;
          if (assigneeId) {
            navigate(`/trainer/students/${assigneeId}`);
          } else {
            navigate('/trainer/students');
          }
        }}
      >
        <ArrowLeft size={16} strokeWidth={2} />
        {assigneeLabel}
      </button>

      <div className="page-header">
        <div className="page-header-left">
          <div className="page-header-eyebrow page-header-eyebrow--flex">
            {typeLabel ? `Rotina do Aluno · ${typeLabel}` : 'Rotina do Aluno'}
          </div>
          <h1 className="page-title">{protocol.name}</h1>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate(`/trainer/protocols/${id}/edit`)}
          >
            <Pencil size={14} strokeWidth={2} />
            Editar
          </button>
          <button
            type="button"
            className="btn-icon"
            onClick={handleDelete}
            aria-label="Excluir rotina"
          >
            <Trash2 size={18} strokeWidth={2} />
          </button>
        </div>
      </div>

      <section className="routine-hero">
        <div className={statusHeroCls}>
          <span className="status-hero-dot" />
          {statusHeroLabel}
        </div>

        <div className="stat-strip">
          {daysRemaining !== null && (
            <div className="stat-display">
              <span className="stat-display__label">Dias</span>
              <span className="stat-display__value">{Math.abs(daysRemaining)}</span>
              <span className="stat-display__unit">{daysRemainingUnit}</span>
            </div>
          )}
          <div className="stat-display">
            <span className="stat-display__label">Treinos</span>
            <span className="stat-display__value">{trainingsCount}</span>
            <span className="stat-display__unit">na rotina</span>
          </div>
          {weeksCount !== null && (
            <div className="stat-display">
              <span className="stat-display__label">Período</span>
              <span className="stat-display__value">{weeksCount}</span>
              <span className="stat-display__unit">semanas</span>
            </div>
          )}
        </div>

        {(protocol.startDate || expirationField) && (
          <div className="routine-hero__period">
            <Calendar size={14} strokeWidth={2} />
            {formatDateForDisplay(protocol.startDate)}
            <span className="routine-hero__period-divider">→</span>
            {formatDateForDisplay(expirationField)}
          </div>
        )}

        <WeekGrid trainings={summaryTrainings} />
      </section>

      <div className="section-header--routine">
        <h2 className="section-title">Treinos ({trainingsCount})</h2>
        <button type="button" className="section-action">Expandir tudo</button>
      </div>

      {trainings.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">Nenhum treino nesta rotina</p>
          <p>Clique em &ldquo;Editar&rdquo; para adicionar treinos.</p>
        </div>
      ) : (
        trainings.map((training) => {
          const exercises = exercisesMap[training.id] || [];
          return (
            <TrainingCard
              key={training.id}
              training={training}
              exercises={exercises}
            />
          );
        })
      )}

      {confirmDialog && (
        <div className="overlay" onClick={() => setConfirmDialog(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-dialog-message">{confirmDialog.message}</p>
            <div className="btn-group">
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="btn-danger"
                style={{ flex: 1 }}
              >
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="btn-secondary"
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProtocolView;
