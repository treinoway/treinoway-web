import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, X, Dumbbell, Calendar } from 'lucide-react';
import api from '../../api/axios';
import { formatDateForDisplay } from '../../utils/dateFormat';
import { formatExerciseMeta } from '../../utils/exerciseMeta';
import { formatDuration } from '../../utils/formatDuration';
import TrainingMetaRow from '../../components/TrainingMetaRow';
import { getWeekDayLabel } from '../../constants/weekDays';
import { getProtocolTypeLabel } from '../../constants/protocolTypes';
import { getStatusLabel, getStatusBadgeClass } from '../../constants/protocolStatus';
import { getYoutubeVideoId } from '../../utils/youtube';
import { useToast } from '../../contexts/ToastContext';

const MyProtocolDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [protocol, setProtocol] = useState(null);
  const [trainings, setTrainings] = useState([]);
  const [exercisesMap, setExercisesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [startingTrainingId, setStartingTrainingId] = useState(null);
  const [videoModal, setVideoModal] = useState({ open: false, videoId: null });

  useEffect(() => {
    fetchProtocol();
    fetchTrainings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchProtocol = async () => {
    try {
      const response = await api.get(`/my/protocols/${id}`);
      setProtocol(response.data);
    } catch (error) {
      console.error('Failed to fetch protocol:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExercisesForTraining = async (trainingId) => {
    try {
      const response = await api.get(`/my/trainings/${trainingId}/exercises`);
      setExercisesMap((prev) => ({ ...prev, [trainingId]: response.data || [] }));
    } catch (error) {
      console.error('Failed to fetch exercises for training:', error);
    }
  };

  const fetchTrainings = async () => {
    try {
      const response = await api.get(`/my/protocols/${id}/trainings`);
      const list = response.data || [];
      setTrainings(list);
      list.forEach((t) => fetchExercisesForTraining(t.id));
    } catch (error) {
      console.error('Failed to fetch trainings:', error);
    }
  };

  const handleStartTraining = async (trainingId) => {
    setStartingTrainingId(trainingId);
    try {
      const response = await api.post(`/my/trainings/${trainingId}/workout-sessions`, {});
      navigate(`/my/workout-sessions/${response.data.id}`);
    } catch (error) {
      const activeSessionId = error.response?.data?.details?.activeSessionId;
      if (activeSessionId) {
        showToast('Você já tem uma sessão em andamento. Redirecionando...', 'info');
        navigate(`/my/workout-sessions/${activeSessionId}`);
        return;
      }
      showToast(error.userMessage || 'Erro ao iniciar treino.', 'error');
    } finally {
      setStartingTrainingId(null);
    }
  };

  const trainerLabel = [protocol?.trainer?.firstName, protocol?.trainer?.lastName]
    .filter(Boolean)
    .join(' ')
    || protocol?.trainer?.name
    || protocol?.trainer?.email
    || 'N/A';

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-text">Carregando...</div>
      </div>
    );
  }

  if (!protocol) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">Rotina não encontrada</p>
        <button
          onClick={() => navigate('/my/protocols')}
          className="btn-primary mt-md"
        >
          Voltar para Minhas Rotinas
        </button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => navigate('/my/protocols')} className="btn-back">
        <ArrowLeft size={16} strokeWidth={1.6} /> Voltar para Minhas Rotinas
      </button>

      <div className="card card--mb">
        <div className="card-header-start">
          <h1 className="page-title mb-0">Minha Rotina de Treino</h1>
          <span className={getStatusBadgeClass(protocol.status)}>
            {getStatusLabel(protocol.status)}
          </span>
        </div>

        <div className="grid-responsive-2col text-sm">
          <div>
            <span className="info-label info-inline">Treinador:</span>
            <span className="info-value">
              {trainerLabel}
            </span>
          </div>
          <div>
            <span className="info-label info-inline">Data de Início:</span>
            <span className="info-value">
              <span className="date-display">
                <Calendar size={14} strokeWidth={2} aria-hidden="true" />
                {formatDateForDisplay(protocol.startDate)}
              </span>
            </span>
          </div>
          <div>
            <span className="info-label info-inline">Data de Término:</span>
            <span className="info-value">
              <span className="date-display">
                <Calendar size={14} strokeWidth={2} aria-hidden="true" />
                {formatDateForDisplay(protocol.expirationDate || protocol.endDate)}
              </span>
            </span>
          </div>
          <div>
            <span className="info-label info-inline">Total de Treinos:</span>
            <span className="info-value">{trainings.length}</span>
          </div>
          {protocol.type && (
            <div>
              <span className="info-label info-inline">Tipo:</span>
              <span className="info-value">{getProtocolTypeLabel(protocol.type)}</span>
            </div>
          )}
        </div>
      </div>

      <h2 className="card-title" style={{ marginBottom: 'var(--spacing-md)' }}>
        Treinos
      </h2>

      {trainings.length === 0 ? (
        <div className="empty-state">
          <p className="empty-state-title">Nenhum treino ainda</p>
          <p>Seu treinador irá adicionar treinos a esta rotina</p>
        </div>
      ) : (
        <div className="stack-md">
          {trainings.map((training) => {
            const exercises = exercisesMap[training.id] || [];
            const isStarting = startingTrainingId === training.id;
            const durationInfo = formatDuration(training.estimatedDurationSeconds);
            const ctaSuffix = durationInfo.state === 'not_estimated'
              ? ''
              : ` · ${durationInfo.text}`;
            return (
              <div key={training.id} className="training-card">
                <div className="training-card-header">
                  <div className="training-card-header-content">
                    <h3 className="training-card-title">{training.name}</h3>
                    {training.description && (
                      <p className="training-card-desc">{training.description}</p>
                    )}
                    <TrainingMetaRow
                      estimatedDurationSeconds={training.estimatedDurationSeconds}
                      exerciseCount={exercises.length}
                      categoryLabel={training.categoryLabel}
                      variant="student-card"
                    />
                    <div className="training-card-meta">
                      <span className="training-card-order">Ordem {training.order}</span>
                      {training.weekDay && (
                        <span className="badge badge-blue">
                          {getWeekDayLabel(training.weekDay)}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handleStartTraining(training.id)}
                    disabled={isStarting || startingTrainingId !== null}
                    aria-label={`Iniciar treino ${training.name}${ctaSuffix}`}
                  >
                    <Dumbbell size={14} strokeWidth={1.6} />
                    {isStarting ? 'Iniciando...' : `Iniciar${ctaSuffix}`}
                  </button>
                </div>

                {training.notes && (
                  <p className="training-card-exercise-notes">{training.notes}</p>
                )}

                <div className="training-card-exercises">
                  <span className="training-card-exercises-label">Exercícios</span>

                  {exercises.length === 0 ? (
                    <p className="training-card-exercises-empty">Nenhum exercício adicionado.</p>
                  ) : (
                    <div className="training-card-exercise-list">
                      {exercises.map((exercise) => {
                        const meta = formatExerciseMeta(exercise);
                        return (
                          <div key={exercise.id} className="training-card-exercise-row">
                            <div>
                              <span className="training-card-exercise-name">{exercise.name}</span>
                              {meta && (
                                <span className="training-card-exercise-meta">{meta}</span>
                              )}
                              {exercise.notes && (
                                <p className="training-card-exercise-notes">{exercise.notes}</p>
                              )}
                              {exercise.videoUrl && (() => {
                                const videoId = getYoutubeVideoId(exercise.videoUrl);
                                if (videoId) {
                                  return (
                                    <button
                                      className="training-card-exercise-video-link"
                                      onClick={() => setVideoModal({ open: true, videoId })}
                                    >
                                      <Play size={14} strokeWidth={1.6} />
                                      Ver vídeo
                                    </button>
                                  );
                                }
                                return (
                                  <a
                                    href={exercise.videoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="training-card-exercise-video-link"
                                  >
                                    <Play size={14} strokeWidth={1.6} />
                                    Ver vídeo
                                  </a>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {videoModal.open && (
        <div className="bottom-sheet-overlay" onClick={() => setVideoModal({ open: false, videoId: null })}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-header">
              <span className="bottom-sheet-title">Vídeo do exercício</span>
              <button
                className="bottom-sheet-close"
                onClick={() => setVideoModal({ open: false, videoId: null })}
                aria-label="Fechar vídeo"
              >
                <X size={20} />
              </button>
            </div>
            <div className="bottom-sheet-body">
              <div className="video-embed-wrapper">
                <iframe
                  src={`https://www.youtube.com/embed/${videoModal.videoId}`}
                  title="Vídeo do exercício"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyProtocolDetail;
