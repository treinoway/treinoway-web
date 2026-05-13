import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import PropTypes from 'prop-types';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import { getWeekDayLabel } from '../../constants/weekDays';
import { getProtocolTypeLabel } from '../../constants/protocolTypes';
import { formatExerciseMeta } from '../../utils/exerciseMeta';
import DurationLabel from '../../components/DurationLabel';

const TRAINING_LEVEL_LABELS = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
  athlete: 'Atleta',
};

const GENDER_LABELS = {
  male: 'Masculino',
  female: 'Feminino',
  other: 'Outro',
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
          <DurationLabel
            seconds={training.estimatedDurationSeconds}
            variant="column"
            className="training-card__duration"
          />
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
    estimatedDurationSeconds: PropTypes.number,
  }).isRequired,
  exercises: PropTypes.array.isRequired,
};

const ProtocolTemplateView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [template, setTemplate] = useState(null);
  const [trainings, setTrainings] = useState([]);
  const [exercisesMap, setExercisesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState(null);

  useEffect(() => {
    fetchTemplate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchTemplate = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/trainer/protocol-templates/${id}`);
      const data = response.data;
      setTemplate(data);

      const scheduleItems = data?.trainings || [];
      const sortedItems = [...scheduleItems].sort((a, b) => (a.order || 0) - (b.order || 0));
      setTrainings(sortedItems);

      const exercisesByTraining = {};
      await Promise.all(
        scheduleItems.map(async (item) => {
          const ttId = item.trainingTemplate?.id;
          const key = item.id;
          if (!ttId) {
            exercisesByTraining[key] = [];
            return;
          }
          try {
            const res = await api.get(`/trainer/training-templates/${ttId}`);
            const junctionRows = res.data?.trainingTemplateExerciseTemplates || [];
            exercisesByTraining[key] = junctionRows
              .map((j) => ({
                ...j.exerciseTemplate,
                sets: j.sets,
                repetitions: j.repetitions,
                duration: j.duration,
                hasLoad: j.hasLoad,
                suggestedLoad: j.suggestedLoad,
                restInterval: j.restInterval,
                notes: j.notes ?? j.exerciseTemplate?.notes,
              }))
              .filter((e) => e.id);
          } catch {
            exercisesByTraining[key] = [];
          }
        }),
      );
      setExercisesMap(exercisesByTraining);
    } catch (error) {
      console.error('Failed to fetch protocol template:', error);
      showToast(error.userMessage || translateError(error), 'error');
      navigate('/trainer/routines');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    setConfirmDialog({
      message: `Excluir "${template.name}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/trainer/protocol-templates/${id}`);
          showToast('Rotina excluída com sucesso!', 'success');
          navigate('/trainer/routines');
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

  if (!template) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">Rotina não encontrada</p>
        <button className="btn-primary" onClick={() => navigate('/trainer/routines')}>
          Voltar para Rotinas
        </button>
      </div>
    );
  }

  const levelLabel = TRAINING_LEVEL_LABELS[template.trainingLevel?.toLowerCase()];
  const genderLabel = GENDER_LABELS[template.genderOrdination?.toLowerCase()];
  const typeLabel = template.type ? getProtocolTypeLabel(template.type) : null;
  const trainingsCount = trainings.length;

  const summaryTrainings = trainings.map((item) => ({
    id: item.id,
    weekDay: (item.weekDay || '').toLowerCase() || null,
  }));

  return (
    <div>
      <button className="btn-back" onClick={() => navigate('/trainer/routines')}>
        <ArrowLeft size={16} strokeWidth={2} />
        Templates de Rotina
      </button>

      <div className="page-header">
        <div className="page-header-left">
          <div className="page-header-eyebrow page-header-eyebrow--flex">
            Template de Rotina
            {typeLabel && (
              <>
                {' · '}
                <span className="badge-inline badge-inline--brand">{typeLabel}</span>
              </>
            )}
            {levelLabel && (
              <span className="badge-inline">{levelLabel}</span>
            )}
          </div>
          <h1 className="page-title">{template.name}</h1>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate(`/trainer/routines/${id}/edit`)}
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

      {template.description && (
        <p className="lead-description">{template.description}</p>
      )}

      <section className="routine-hero">
        <div className="stat-strip">
          {template.defaultDurationWeeks && (
            <div className="stat-display">
              <span className="stat-display__label">Duração</span>
              <span className="stat-display__value">{template.defaultDurationWeeks}</span>
              <span className="stat-display__unit">semanas</span>
            </div>
          )}
          <div className="stat-display">
            <span className="stat-display__label">Treinos</span>
            <span className="stat-display__value">{trainingsCount}</span>
            <span className="stat-display__unit">por semana</span>
          </div>
          {levelLabel && (
            <div className="stat-display">
              <span className="stat-display__label">Nível</span>
              <span className="stat-display__value stat-display__value--text">{levelLabel}</span>
              {genderLabel && (
                <span className="stat-display__unit">{genderLabel.toLowerCase()}</span>
              )}
            </div>
          )}
        </div>

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
        trainings.map((item) => {
          const trainingName = item.trainingTemplate?.name || item.name || '—';
          const exercises = exercisesMap[item.id] || [];
          return (
            <TrainingCard
              key={item.id}
              training={{
                id: item.id,
                name: trainingName,
                order: item.order,
                weekDay: item.weekDay,
                estimatedDurationSeconds:
                  item.estimatedDurationSeconds
                  ?? item.trainingTemplate?.estimatedDurationSeconds,
              }}
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

export default ProtocolTemplateView;
