import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, GripVertical } from 'lucide-react';
import PropTypes from 'prop-types';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import { formatDateForDisplay } from '../../utils/dateFormat';
import { WEEK_DAY_OPTIONS, getWeekDayLabel } from '../../constants/weekDays';
import { PROTOCOL_TYPE_OPTIONS, getProtocolTypeLabel } from '../../constants/protocolTypes';
import { getStatusLabel } from '../../constants/protocolStatus';
import { formatExerciseMeta } from '../../utils/exerciseMeta';
import CreateExerciseModal from '../../components/CreateExerciseModal';
import ExerciseForm from '../../components/ExerciseForm';
import RowMenu from '../../components/RowMenu';

const SortableTrainingCard = ({ training, children, onEdit, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(training.id),
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`training-card${isDragging ? ' training-card--dragging' : ''}`}
    >
      <div className="training-card-header">
        <span className="drag-handle" {...attributes} {...listeners} aria-label="Arrastar para reordenar">
          <GripVertical size={16} strokeWidth={1.8} />
        </span>
        <div className="training-card-header-content">
          <h3 className="training-card-title">{training.name}</h3>
          {training.description && (
            <p className="training-card-desc">{training.description}</p>
          )}
          <div className="training-card-meta">
            <span className="training-card-order">Ordem {training.order}</span>
            {training.weekDay && (
              <span className="badge badge-blue">
                {getWeekDayLabel(training.weekDay)}
              </span>
            )}
          </div>
        </div>
        <RowMenu
          ariaLabel={`Ações do treino ${training.name}`}
          onEdit={() => onEdit(training)}
          onDelete={() => onDelete(training.id)}
        />
      </div>
      {children}
    </div>
  );
};

SortableTrainingCard.propTypes = {
  training: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string,
    description: PropTypes.string,
    order: PropTypes.number,
    weekDay: PropTypes.string,
  }).isRequired,
  children: PropTypes.node.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

const ProtocolDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [protocol, setProtocol] = useState(null);
  const [trainings, setTrainings] = useState([]);
  const [trainingTemplates, setTrainingTemplates] = useState([]);
  const [exerciseTemplates, setExerciseTemplates] = useState([]);
  const [exercisesMap, setExercisesMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [showTrainingForm, setShowTrainingForm] = useState(false);
  const [editingTrainingId, setEditingTrainingId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [addExerciseTrainingId, setAddExerciseTrainingId] = useState(null);
  const [addExerciseTemplateId, setAddExerciseTemplateId] = useState('');
  const [addingExercise, setAddingExercise] = useState(false);
  const [addExerciseMode, setAddExerciseMode] = useState('create');
  const [editingExercise, setEditingExercise] = useState(null);
  const [editingExerciseTrainingId, setEditingExerciseTrainingId] = useState(null);
  const [showEditExerciseModal, setShowEditExerciseModal] = useState(false);
  const [reorderingTrainings, setReorderingTrainings] = useState(false);
  const [showEditProtocolForm, setShowEditProtocolForm] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editProtocolData, setEditProtocolData] = useState({
    name: '',
    startDate: '',
    expirationDate: '',
    type: '',
    status: '',
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const [trainingFormData, setTrainingFormData] = useState({
    name: '',
    description: '',
    category: '',
    bodySegment: '',
    notes: '',
    order: 1,
    weekDay: '',
    trainingTemplateId: '',
  });

  useEffect(() => {
    fetchProtocol();
    fetchTrainings();
    fetchTrainingTemplates();
    fetchExerciseTemplates();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchProtocol = async () => {
    try {
      const response = await api.get(`/trainer/protocols/${id}`);
      setProtocol(response.data);
    } catch (error) {
      console.error('Failed to fetch protocol:', error);
      showToast(error.userMessage || translateError(error), 'error');
    }
  };

  const fetchExercisesForTraining = async (trainingId) => {
    try {
      const response = await api.get(`/trainer/trainings/${trainingId}/exercises`);
      setExercisesMap((prev) => ({ ...prev, [trainingId]: response.data || [] }));
    } catch (error) {
      console.error('Failed to fetch exercises for training:', error);
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

  const fetchTrainingTemplates = async () => {
    try {
      const response = await api.get('/trainer/training-templates');
      setTrainingTemplates(response.data);
    } catch (error) {
      console.error('Failed to fetch training templates:', error);
    }
  };

  const fetchExerciseTemplates = async () => {
    try {
      const response = await api.get('/trainer/exercise-templates');
      setExerciseTemplates(response.data || []);
    } catch (error) {
      console.error('Failed to fetch exercise templates:', error);
    }
  };

  const handleTrainingSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingTrainingId) {
        const { trainingTemplateId: _tid, ...updateData } = trainingFormData;
        const payload = { ...updateData };
        delete payload.weekDay;
        await api.patch(`/trainer/trainings/${editingTrainingId}`, payload);
        showToast('Treino atualizado com sucesso!', 'success');
      } else {
        // eslint-disable-next-line no-unused-vars
        const { trainingTemplateId, weekDay, ...rest } = trainingFormData;
        const createData = {
          ...rest,
          ...(trainingTemplateId && { trainingTemplateId }),
        };
        await api.post(`/trainer/protocols/${id}/trainings`, createData);
        showToast('Treino criado com sucesso!', 'success');
      }
      fetchTrainings();
      resetTrainingForm();
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTraining = (training) => {
    setTrainingFormData({
      name: training.name,
      description: training.description || '',
      category: training.category || '',
      bodySegment: training.bodySegment || '',
      notes: training.notes || '',
      order: training.order,
      weekDay: training.weekDay ? training.weekDay.toLowerCase() : '',
      trainingTemplateId: '',
    });
    setEditingTrainingId(training.id);
    setShowTrainingForm(true);
  };

  const handleDeleteTraining = (trainingId) => {
    setConfirmDialog({
      message: 'Tem certeza que deseja excluir este treino? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/trainer/trainings/${trainingId}`);
          showToast('Treino excluído com sucesso!', 'success');
          fetchTrainings();
        } catch (error) {
          showToast(error.userMessage || translateError(error), 'error');
        }
      },
    });
  };

  const handleAddExerciseFromTemplate = async (e) => {
    e.preventDefault();
    if (!addExerciseTemplateId) return;
    setAddingExercise(true);
    try {
      await api.post('/trainer/exercises/from-template', {
        trainingId: addExerciseTrainingId,
        templateId: addExerciseTemplateId,
      });
      showToast('Exercício adicionado com sucesso!', 'success');
      fetchExercisesForTraining(addExerciseTrainingId);
      closeAddExerciseSheet();
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setAddingExercise(false);
    }
  };

  const handleDeleteExercise = (exerciseId, trainingId) => {
    setConfirmDialog({
      message: 'Tem certeza que deseja remover este exercício? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/trainer/exercises/${exerciseId}`);
          showToast('Exercício removido com sucesso!', 'success');
          fetchExercisesForTraining(trainingId);
        } catch (error) {
          showToast(error.userMessage || translateError(error), 'error');
        }
      },
    });
  };

  const openAddExerciseSheet = (trainingId) => {
    setAddExerciseTrainingId(trainingId);
    setAddExerciseTemplateId('');
    setAddExerciseMode('create');
  };

  const closeAddExerciseSheet = () => {
    setAddExerciseTrainingId(null);
    setAddExerciseTemplateId('');
    setAddExerciseMode('create');
  };

  const handleEditExercise = (exercise, trainingId) => {
    setEditingExercise(exercise);
    setEditingExerciseTrainingId(trainingId);
    setShowEditExerciseModal(true);
  };

  const closeEditExerciseModal = () => {
    setEditingExercise(null);
    setEditingExerciseTrainingId(null);
    setShowEditExerciseModal(false);
  };

  const handleTrainingDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = trainings.findIndex((t) => String(t.id) === String(active.id));
    const newIndex = trainings.findIndex((t) => String(t.id) === String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(trainings, oldIndex, newIndex);
    const withOrder = reordered.map((t, i) => ({ ...t, order: i + 1 }));

    setTrainings(withOrder);
    setReorderingTrainings(true);

    try {
      await Promise.all(
        withOrder.map((t, i) =>
          api.patch(`/trainer/trainings/${t.id}`, { order: i + 1 }),
        ),
      );
      showToast('Ordem dos treinos atualizada.', 'success');
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
      fetchTrainings();
    } finally {
      setReorderingTrainings(false);
    }
  };

  const resetTrainingForm = () => {
    setTrainingFormData({
      name: '',
      description: '',
      category: '',
      bodySegment: '',
      notes: '',
      order: 1,
      weekDay: '',
      trainingTemplateId: '',
    });
    setEditingTrainingId(null);
    setShowTrainingForm(false);
  };

  const handleOpenEditProtocol = () => {
    setEditProtocolData({
      name: protocol.name || '',
      startDate: protocol.startDate?.slice(0, 10) || '',
      expirationDate: (protocol.expirationDate || protocol.endDate)?.slice(0, 10) || '',
      type: protocol.type || '',
      status: protocol.status || '',
    });
    setShowEditProtocolForm(true);
  };

  const handleEditProtocolSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      await api.patch(`/trainer/protocols/${id}`, editProtocolData);
      showToast('Rotina atualizada com sucesso!', 'success');
      setShowEditProtocolForm(false);
      fetchProtocol();
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setEditLoading(false);
    }
  };

  const segmentedToggle = (
    <div className="segmented-toggle">
      <button
        type="button"
        className={`segmented-toggle-btn${addExerciseMode === 'create' ? ' segmented-toggle-btn--active' : ''}`}
        onClick={() => setAddExerciseMode('create')}
      >
        Criar novo
      </button>
      <button
        type="button"
        className={`segmented-toggle-btn${addExerciseMode === 'fromTemplate' ? ' segmented-toggle-btn--active' : ''}`}
        onClick={() => setAddExerciseMode('fromTemplate')}
      >
        Importar de modelo
      </button>
    </div>
  );

  const assigneeLabel = [protocol?.assignee?.firstName, protocol?.assignee?.lastName]
    .filter(Boolean)
    .join(' ')
    || protocol?.assignee?.name
    || protocol?.assignee?.email
    || 'Aluno';

  if (!protocol) {
    return (
      <div className="loading-screen">
        <div className="loading-text">Carregando...</div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => {
          const assigneeId = protocol?.assignee?.id;
          if (assigneeId) {
            navigate(`/trainer/students/${assigneeId}`);
          } else {
            navigate('/trainer/students');
          }
        }}
        className="btn-back"
      >
        <ArrowLeft size={16} strokeWidth={1.6} /> {assigneeLabel}
      </button>

      <div className="card card--mb">
        <div className="card-header">
          <h1 className="page-title" style={{ marginBottom: 0 }}>
            {protocol.name}
          </h1>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleOpenEditProtocol}
          >
            Editar
          </button>
        </div>
        <div className="grid-2col text-sm">
          <div>
            <span className="info-label info-inline">Aluno:</span>
            <span className="info-value">{assigneeLabel}</span>
          </div>
          <div>
            <span className="info-label info-inline">Status:</span>
            <span className="info-value">{getStatusLabel(protocol.status)}</span>
          </div>
          <div>
            <span className="info-label info-inline">Data de Início:</span>
            <span className="info-value">
              {formatDateForDisplay(protocol.startDate)}
            </span>
          </div>
          <div>
            <span className="info-label info-inline">Data de Término:</span>
            <span className="info-value">
              {formatDateForDisplay(protocol.expirationDate || protocol.endDate)}
            </span>
          </div>
          <div>
            <span className="info-label info-inline">Treinos:</span>
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

      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <h2 className="card-title" style={{ marginBottom: 0 }}>Treinos</h2>
          {reorderingTrainings && (
            <span className="text-sm text-light">Salvando ordem…</span>
          )}
        </div>
        <button onClick={() => setShowTrainingForm(true)} className="btn-primary">
          + Adicionar Treino
        </button>
      </div>

      {showTrainingForm && (
        <div className="overlay" onClick={resetTrainingForm}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-header">
              <h2 className="bottom-sheet-title">
                {editingTrainingId ? 'Editar Treino' : 'Adicionar Novo Treino'}
              </h2>
              <button
                className="bottom-sheet-close"
                onClick={resetTrainingForm}
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            <div className="bottom-sheet-body">
              <form onSubmit={handleTrainingSubmit} className="form">
                {!editingTrainingId && (
                  <div>
                    <label className="form-label">Importar treino único</label>
                    <select
                      value={trainingFormData.trainingTemplateId}
                      onChange={(e) =>
                        setTrainingFormData({ ...trainingFormData, trainingTemplateId: e.target.value })
                      }
                      className="form-select"
                    >
                      <option value="">-- Selecione um treino --</option>
                      {trainingTemplates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="form-label">Nome</label>
                  <input
                    type="text"
                    value={trainingFormData.name}
                    onChange={(e) =>
                      setTrainingFormData({ ...trainingFormData, name: e.target.value })
                    }
                    className="form-input"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Descrição</label>
                  <textarea
                    value={trainingFormData.description}
                    onChange={(e) =>
                      setTrainingFormData({ ...trainingFormData, description: e.target.value })
                    }
                    rows={3}
                    className="form-textarea"
                  />
                </div>

                <div className="grid-responsive-2col">
                  <div>
                    <label className="form-label">Categoria</label>
                    <select
                      value={trainingFormData.category}
                      onChange={(e) =>
                        setTrainingFormData({ ...trainingFormData, category: e.target.value })
                      }
                      className="form-select"
                      required
                    >
                      <option value="">Selecione...</option>
                      <option value="strength">Força</option>
                      <option value="cardio">Cardio</option>
                      <option value="flexibility">Flexibilidade</option>
                      <option value="functional">Funcional</option>
                      <option value="mobility">Mobilidade</option>
                      <option value="rest">Descanso</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Segmento Corporal</label>
                    <select
                      value={trainingFormData.bodySegment}
                      onChange={(e) =>
                        setTrainingFormData({ ...trainingFormData, bodySegment: e.target.value })
                      }
                      className="form-select"
                    >
                      <option value="">Selecione...</option>
                      <option value="upper">Superior</option>
                      <option value="lower">Inferior</option>
                      <option value="core">Core</option>
                      <option value="full_body">Corpo Inteiro</option>
                    </select>
                  </div>
                </div>

                <div className="grid-responsive-2col">
                  <div>
                    <label className="form-label">Dia da Semana</label>
                    <select
                      value={trainingFormData.weekDay}
                      onChange={(e) =>
                        setTrainingFormData({ ...trainingFormData, weekDay: e.target.value })
                      }
                      className="form-select"
                    >
                      <option value="">— Sem dia definido —</option>
                      {WEEK_DAY_OPTIONS.map((d) => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Ordem</label>
                    <input
                      type="number"
                      min="1"
                      value={trainingFormData.order}
                      onChange={(e) =>
                        setTrainingFormData({ ...trainingFormData, order: parseInt(e.target.value) })
                      }
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Observações</label>
                  <textarea
                    value={trainingFormData.notes}
                    onChange={(e) =>
                      setTrainingFormData({ ...trainingFormData, notes: e.target.value })
                    }
                    rows={2}
                    className="form-textarea"
                    placeholder="Orientações adicionais para este treino"
                  />
                </div>

                <div className="btn-group">
                  <button type="submit" disabled={loading} className="btn-primary">
                    {loading ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button type="button" onClick={resetTrainingForm} className="btn-secondary">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleTrainingDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext
          items={trainings.map((t) => String(t.id))}
          strategy={verticalListSortingStrategy}
        >
          <div className="stack-md">
            {trainings.map((training) => {
              const exercises = exercisesMap[training.id] || [];
              return (
                <SortableTrainingCard
                  key={training.id}
                  training={training}
                  onEdit={handleEditTraining}
                  onDelete={handleDeleteTraining}
                >
                  <div className="training-card-exercises">
                    <div className="training-card-exercises-header">
                      <span className="training-card-exercises-label">Exercícios</span>
                      <button
                        type="button"
                        className="btn-schedule-sm"
                        onClick={() => openAddExerciseSheet(training.id)}
                        aria-label={`Adicionar exercício ao treino ${training.name}`}
                      >
                        + Adicionar exercício
                      </button>
                    </div>

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
                                  <span className="training-card-exercise-meta">· {meta}</span>
                                )}
                                {exercise.notes && (
                                  <p className="training-card-exercise-notes">{exercise.notes}</p>
                                )}
                              </div>
                              <RowMenu
                                ariaLabel={`Ações do exercício ${exercise.name}`}
                                onEdit={() => handleEditExercise(exercise, training.id)}
                                onDelete={() => handleDeleteExercise(exercise.id, training.id)}
                                deleteLabel="Remover"
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </SortableTrainingCard>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      {trainings.length === 0 && (
        <div className="empty-state">
          <p className="empty-state-title">Nenhum treino ainda</p>
          <p>Adicione treinos a esta rotina</p>
        </div>
      )}

      {addExerciseTrainingId !== null && (
        <div className="overlay" onClick={closeAddExerciseSheet}>
          <div className="bottom-sheet bottom-sheet--large" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-header">
              <h2 className="bottom-sheet-title">Adicionar Exercício</h2>
              <button
                className="bottom-sheet-close"
                onClick={closeAddExerciseSheet}
                aria-label="Fechar"
                type="button"
              >
                ✕
              </button>
            </div>
            <div className="bottom-sheet-body">
              {addExerciseMode === 'create' ? (
                <ExerciseForm
                  trainingId={addExerciseTrainingId}
                  onSuccess={() => {
                    fetchExercisesForTraining(addExerciseTrainingId);
                    closeAddExerciseSheet();
                  }}
                  onCancel={closeAddExerciseSheet}
                  headerContent={segmentedToggle}
                />
              ) : (
                <>
                  {segmentedToggle}
                  <form onSubmit={handleAddExerciseFromTemplate} className="form">
                    <div>
                      <label className="form-label" htmlFor="add-exercise-template">Exercício</label>
                      <select
                        id="add-exercise-template"
                        value={addExerciseTemplateId}
                        onChange={(e) => setAddExerciseTemplateId(e.target.value)}
                        className="form-select"
                        required
                      >
                        <option value="">Selecione um exercício...</option>
                        {exerciseTemplates.map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="btn-group">
                      <button type="submit" disabled={addingExercise} className="btn-primary">
                        {addingExercise ? 'Adicionando...' : 'Adicionar'}
                      </button>
                      <button type="button" onClick={closeAddExerciseSheet} className="btn-secondary">
                        Cancelar
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showEditExerciseModal && (
        <CreateExerciseModal
          open={showEditExerciseModal}
          trainingId={editingExerciseTrainingId}
          exercise={editingExercise}
          onClose={closeEditExerciseModal}
          onSuccess={() => {
            if (editingExerciseTrainingId) fetchExercisesForTraining(editingExerciseTrainingId);
            closeEditExerciseModal();
          }}
        />
      )}

      {showEditProtocolForm && (
        <div className="overlay" onClick={() => setShowEditProtocolForm(false)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-header">
              <h2 className="bottom-sheet-title">Editar Rotina</h2>
              <button
                className="bottom-sheet-close"
                onClick={() => setShowEditProtocolForm(false)}
                aria-label="Fechar"
                type="button"
              >
                ✕
              </button>
            </div>
            <div className="bottom-sheet-body">
              <form onSubmit={handleEditProtocolSubmit} className="form">
                <div className="form-group">
                  <label className="form-label" htmlFor="edit-protocol-name">Nome</label>
                  <input
                    id="edit-protocol-name"
                    type="text"
                    value={editProtocolData.name}
                    onChange={(e) => setEditProtocolData({ ...editProtocolData, name: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>

                <div className="grid-responsive-2col">
                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-protocol-start-date">Data de Início</label>
                    <input
                      id="edit-protocol-start-date"
                      type="date"
                      value={editProtocolData.startDate}
                      onChange={(e) => setEditProtocolData({ ...editProtocolData, startDate: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="edit-protocol-expiration-date">Data de Término</label>
                    <input
                      id="edit-protocol-expiration-date"
                      type="date"
                      value={editProtocolData.expirationDate}
                      onChange={(e) => setEditProtocolData({ ...editProtocolData, expirationDate: e.target.value })}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="edit-protocol-type">Tipo</label>
                  <select
                    id="edit-protocol-type"
                    value={editProtocolData.type}
                    onChange={(e) => setEditProtocolData({ ...editProtocolData, type: e.target.value })}
                    className="form-select"
                  >
                    <option value="">— Sem tipo —</option>
                    {PROTOCOL_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="edit-protocol-status">Status</label>
                  <select
                    id="edit-protocol-status"
                    value={editProtocolData.status}
                    onChange={(e) => setEditProtocolData({ ...editProtocolData, status: e.target.value })}
                    className="form-select"
                  >
                    <option value="ACTIVE">Ativo</option>
                    <option value="COMPLETED">Concluído</option>
                    <option value="CANCELLED">Cancelado</option>
                  </select>
                </div>

                <div className="btn-group">
                  <button type="submit" disabled={editLoading} className="btn-primary">
                    {editLoading ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditProtocolForm(false)}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="overlay" onClick={() => setConfirmDialog(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-dialog-message">{confirmDialog.message}</p>
            <div className="btn-group">
              <button onClick={confirmDialog.onConfirm} className="btn-danger" style={{ flex: 1 }}>
                Confirmar
              </button>
              <button onClick={() => setConfirmDialog(null)} className="btn-secondary" style={{ flex: 1 }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProtocolDetail;
