import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { GripVertical, LayoutGrid, List, MoreVertical } from 'lucide-react';
import CreateExerciseTemplateModal from '../../components/CreateExerciseTemplateModal';
import usePersistedViewMode, { VIEW_MODE_KEYS } from '../../hooks/usePersistedViewMode';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import { WEEK_DAY_OPTIONS, getWeekDayLabel } from '../../constants/weekDays';
import { formatExerciseMeta } from '../../utils/exerciseMeta';

const scheduleBadgeStyle = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-outline-variant)',
};

const TemplateRowMenu = ({ onEdit, onDelete, ariaLabel, deleteLabel = 'Excluir' }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div className="row-menu" ref={menuRef}>
      <button
        type="button"
        className="row-menu-trigger"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <MoreVertical size={18} strokeWidth={1.6} />
      </button>
      {open && (
        <div className="row-menu-dropdown">
          {onEdit && (
            <button type="button" className="row-menu-item" onClick={() => { setOpen(false); onEdit(); }}>
              Editar
            </button>
          )}
          <button type="button" className="row-menu-item row-menu-item--danger" onClick={() => { setOpen(false); onDelete(); }}>
            {deleteLabel}
          </button>
        </div>
      )}
    </div>
  );
};

const SortableScheduleRow = ({ id, training, trainingTemplates, exercises, onRemove, onEdit }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const templateName = trainingTemplates.find(
    (t) => String(t.id) === String(training.trainingTemplateId)
  )?.name || '—';
  const dayLabel = getWeekDayLabel(training.weekDay);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`schedule-template-row${isDragging ? ' schedule-template-row--dragging' : ''}`}
    >
      <span className="drag-handle" {...attributes} {...listeners} aria-label="Arrastar para reordenar">
        <GripVertical size={16} strokeWidth={1.8} />
      </span>
      <div className="schedule-template-fields" style={{ alignItems: 'center' }}>
        <span style={{ fontWeight: 600, flex: 1 }}>{templateName}</span>
        <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
          {dayLabel && (
            <span className="badge badge-blue" style={scheduleBadgeStyle}>
              {dayLabel}
            </span>
          )}
          <span className="badge" style={{ ...scheduleBadgeStyle, color: 'var(--color-on-surface-variant)' }}>
            Ordem: {training.order}
          </span>
        </div>
        {exercises.length > 0 && (
          <div className="training-row-exercises">
            {exercises.map((exercise) => {
              const meta = formatExerciseMeta(exercise);
              return (
                <div key={exercise.id} className="training-row-exercise-item">
                  <span className="training-row-exercise-name">{exercise.name}</span>
                  {meta && <span className="training-row-exercise-meta"> · {meta}</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <TemplateRowMenu
        ariaLabel={`Ações do treino ${templateName}`}
        onEdit={onEdit}
        onDelete={onRemove}
        deleteLabel="Remover"
      />
    </div>
  );
};

TemplateRowMenu.propTypes = {
  onEdit: PropTypes.func,
  onDelete: PropTypes.func.isRequired,
  ariaLabel: PropTypes.string.isRequired,
  deleteLabel: PropTypes.string,
};

SortableScheduleRow.propTypes = {
  id: PropTypes.string.isRequired,
  training: PropTypes.shape({
    trainingTemplateId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    weekDay: PropTypes.string,
    order: PropTypes.number,
  }).isRequired,
  trainingTemplates: PropTypes.array.isRequired,
  exercises: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
  })).isRequired,
  onRemove: PropTypes.func.isRequired,
  onEdit: PropTypes.func,
};

const ExerciseRow = ({ name, meta, onEdit, onRemove }) => (
  <div className="schedule-template-row">
    <div className="schedule-template-fields" style={{ alignItems: 'center' }}>
      <span style={{ fontWeight: 600, flex: 1 }}>{name}</span>
      {meta && (
        <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
          <span className="badge" style={{ ...scheduleBadgeStyle, color: 'var(--color-on-surface-variant)' }}>
            {meta}
          </span>
        </div>
      )}
    </div>
    <TemplateRowMenu
      ariaLabel={`Ações do exercício ${name}`}
      onEdit={onEdit}
      onDelete={onRemove}
      deleteLabel="Remover"
    />
  </div>
);

ExerciseRow.propTypes = {
  name: PropTypes.string.isRequired,
  meta: PropTypes.string,
  onEdit: PropTypes.func,
  onRemove: PropTypes.func.isRequired,
};

const ProtocolTemplates = () => {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [trainingTemplates, setTrainingTemplates] = useState([]);
  const [exerciseTemplates, setExerciseTemplates] = useState([]);
  const [exerciseIdsByTemplateId, setExerciseIdsByTemplateId] = useState({});
  const [exercisePickerValue, setExercisePickerValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [showTrainingTemplateModal, setShowTrainingTemplateModal] = useState(false);
  const [creatingForIndex, setCreatingForIndex] = useState(null);
  const [savingTrainingTemplate, setSavingTrainingTemplate] = useState(false);
  const [showAddTrainingModal, setShowAddTrainingModal] = useState(false);
  const [showExerciseTemplateModal, setShowExerciseTemplateModal] = useState(false);
  const [editingExerciseTemplate, setEditingExerciseTemplate] = useState(null);
  const [editingTrainingTemplateId, setEditingTrainingTemplateId] = useState(null);
  const [loadingTrainingTemplateEdit, setLoadingTrainingTemplateEdit] = useState(false);
  const [viewMode, setViewMode] = usePersistedViewMode(VIEW_MODE_KEYS.protocolTemplates);
  const [addTrainingModalData, setAddTrainingModalData] = useState({
    trainingTemplateId: '',
    weekDay: '',
    order: 1,
  });

  const dndSensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  }));

  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    description: '',
    defaultDurationWeeks: 12,
    genderOrdination: '',
    trainingLevel: '',
    trainings: [],
  });

  const [trainingTemplateFormData, setTrainingTemplateFormData] = useState({
    name: '',
    description: '',
    category: '',
    bodySegment: '',
    isPublic: false,
    exerciseTemplateIds: [],
  });

  useEffect(() => {
    fetchTemplates();
    fetchTrainingTemplates();
    fetchExerciseTemplates();
  }, []);

  const fetchTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const response = await api.get('/trainer/protocol-templates');
      setTemplates(response.data);
    } catch (error) {
      console.error('Failed to fetch protocol templates:', error);
    } finally {
      setTemplatesLoading(false);
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

  const getExerciseTemplateIdsFromTemplate = (template) => {
    if (template.exerciseTemplateIds && Array.isArray(template.exerciseTemplateIds)) {
      return template.exerciseTemplateIds;
    }
    const junctionList = template.trainingTemplateExerciseTemplates;
    if (Array.isArray(junctionList)) {
      return junctionList
        .map((e) => e.exerciseTemplateId ?? e.exerciseTemplate?.id)
        .filter((id) => id != null);
    }
    const list = template.exerciseTemplates;
    if (!Array.isArray(list)) return [];
    return list.map((e) => e.exerciseTemplateId ?? e.id ?? e.exerciseTemplate?.id).filter((id) => id != null);
  };

  const fetchExercisesForTemplate = async (trainingTemplateId) => {
    if (!trainingTemplateId || exerciseIdsByTemplateId[trainingTemplateId]) return;
    try {
      const response = await api.get(`/trainer/training-templates/${trainingTemplateId}`);
      const ids = getExerciseTemplateIdsFromTemplate(response.data);
      setExerciseIdsByTemplateId((prev) => ({ ...prev, [trainingTemplateId]: ids }));
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    const templateIds = templateFormData.trainings
      .map((t) => t.trainingTemplateId)
      .filter((id) => id && !exerciseIdsByTemplateId[id]);
    const uniqueIds = [...new Set(templateIds)];
    uniqueIds.forEach(fetchExercisesForTemplate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateFormData.trainings]);

  const getExercisesForTraining = (training) => {
    if (!training.trainingTemplateId) return [];
    const ids = exerciseIdsByTemplateId[training.trainingTemplateId];
    if (!ids) return [];
    return ids
      .map((id) => exerciseTemplates.find((et) => String(et.id) === String(id)))
      .filter(Boolean);
  };

  const handleTemplateSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      name: templateFormData.name,
      description: templateFormData.description,
      defaultDurationWeeks: templateFormData.defaultDurationWeeks,
      genderOrdination: templateFormData.genderOrdination,
      trainingLevel: templateFormData.trainingLevel,
      // eslint-disable-next-line no-unused-vars
      trainings: templateFormData.trainings.map(({ _id, weekDay, ...t }) => ({
        ...t,
        ...(weekDay && { weekDay: weekDay.toLowerCase() }),
      })),
    };

    try {
      if (editingId) {
        await api.patch(`/trainer/protocol-templates/${editingId}`, payload);
        showToast('Modelo atualizado com sucesso!', 'success');
      } else {
        await api.post('/trainer/protocol-templates', payload);
        showToast('Modelo criado com sucesso!', 'success');
      }
      await fetchTemplates();
      resetTemplateForm();
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateEdit = async (template) => {
    setEditingId(template.id);
    setShowForm(true);

    try {
      const response = await api.get(`/trainer/protocol-templates/${template.id}`);
      const full = response.data;
      const scheduleItems = full?.scheduleTemplates || full?.trainings || [];
      setTemplateFormData({
        name: full.name,
        description: full.description || '',
        defaultDurationWeeks: full.defaultDurationWeeks || 12,
        genderOrdination: full.genderOrdination?.toLowerCase() || '',
        trainingLevel: full.trainingLevel?.toLowerCase() || '',
        trainings: scheduleItems.map((item) => ({
          trainingTemplateId: item.trainingTemplate?.id || item.trainingTemplateId,
          weekDay: (item.weekDay || '').toLowerCase() || '',
          order: item.order,
          _id: crypto.randomUUID(),
        })),
      });
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    }
  };

  const handleTemplateDelete = (id) => {
    setConfirmDialog({
      message: 'Tem certeza que deseja excluir este modelo? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/trainer/protocol-templates/${id}`);
          showToast('Modelo excluído com sucesso!', 'success');
          await fetchTemplates();
        } catch (error) {
          showToast(error.userMessage || translateError(error), 'error');
        }
      },
    });
  };

  const resetTemplateForm = () => {
    setTemplateFormData({
      name: '',
      description: '',
      defaultDurationWeeks: 12,
      genderOrdination: '',
      trainingLevel: '',
      trainings: [],
    });
    setEditingId(null);
    setShowForm(false);
  };

  const openTrainingTemplateModal = (index = null) => {
    setCreatingForIndex(index);
    setEditingTrainingTemplateId(null);
    setTrainingTemplateFormData({
      name: '',
      description: '',
      category: '',
      bodySegment: '',
      isPublic: false,
      exerciseTemplateIds: [],
    });
    setExercisePickerValue('');
    setShowTrainingTemplateModal(true);
  };

  const openEditTrainingTemplateModal = async (trainingTemplateId) => {
    setEditingTrainingTemplateId(trainingTemplateId);
    setLoadingTrainingTemplateEdit(true);
    setShowTrainingTemplateModal(true);
    try {
      const response = await api.get(`/trainer/training-templates/${trainingTemplateId}`);
      const template = response.data;
      const ids = getExerciseTemplateIdsFromTemplate(template);
      setTrainingTemplateFormData({
        name: template.name || '',
        description: template.description || '',
        category: template.category || '',
        bodySegment: template.bodySegment || '',
        isPublic: template.isPublic || false,
        exerciseTemplateIds: ids,
      });
      setExercisePickerValue('');
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
      closeTrainingTemplateModal();
    } finally {
      setLoadingTrainingTemplateEdit(false);
    }
  };

  const closeTrainingTemplateModal = () => {
    setShowTrainingTemplateModal(false);
    setCreatingForIndex(null);
    setEditingTrainingTemplateId(null);
  };

  const handleExercisePickerAdd = () => {
    if (!exercisePickerValue) return;
    if (trainingTemplateFormData.exerciseTemplateIds.includes(exercisePickerValue)) return;
    setTrainingTemplateFormData((prev) => ({
      ...prev,
      exerciseTemplateIds: [...prev.exerciseTemplateIds, exercisePickerValue],
    }));
    setExercisePickerValue('');
  };

  const handleExercisePickerRemove = (templateId) => {
    setTrainingTemplateFormData((prev) => ({
      ...prev,
      exerciseTemplateIds: prev.exerciseTemplateIds.filter((id) => id !== templateId),
    }));
  };

  const normalizeExerciseTemplateIds = (ids) =>
    (ids || []).map((id) => (typeof id === 'number' ? id : Number.isNaN(Number(id)) ? id : Number(id)));

  const handleTrainingTemplateSubmit = async (e) => {
    e.preventDefault();
    setSavingTrainingTemplate(true);

    try {
      const { exerciseTemplateIds, ...rest } = trainingTemplateFormData;
      const normalizedIds = normalizeExerciseTemplateIds(exerciseTemplateIds);
      const payload = { ...rest, ...(normalizedIds.length > 0 && { exerciseTemplateIds: normalizedIds }) };

      if (editingTrainingTemplateId) {
        await api.patch(`/trainer/training-templates/${editingTrainingTemplateId}`, payload);
        showToast('Modelo de treino atualizado com sucesso!', 'success');
        await fetchTrainingTemplates();
        setExerciseIdsByTemplateId((prev) => ({ ...prev, [editingTrainingTemplateId]: normalizedIds }));
      } else {
        const response = await api.post('/trainer/training-templates', payload);
        const created = response.data;
        showToast('Modelo de treino criado com sucesso!', 'success');
        await fetchTrainingTemplates();

        if (creatingForIndex !== null) {
          const updated = [...templateFormData.trainings];
          updated[creatingForIndex] = { ...updated[creatingForIndex], trainingTemplateId: created.id };
          setTemplateFormData({ ...templateFormData, trainings: updated });
        }
      }

      closeTrainingTemplateModal();
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setSavingTrainingTemplate(false);
    }
  };

  const openAddTrainingModal = () => {
    setAddTrainingModalData({
      trainingTemplateId: '',
      weekDay: '',
      order: templateFormData.trainings.length + 1,
    });
    setShowAddTrainingModal(true);
  };

  const closeAddTrainingModal = () => {
    setShowAddTrainingModal(false);
  };

  const handleAddTrainingModalSubmit = (e) => {
    e.preventDefault();
    setTemplateFormData({
      ...templateFormData,
      trainings: [...templateFormData.trainings, { ...addTrainingModalData, _id: crypto.randomUUID() }],
    });
    closeAddTrainingModal();
  };

  const handleScheduleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const trainings = templateFormData.trainings;
    const oldIndex = trainings.findIndex((t) => t._id === active.id);
    const newIndex = trainings.findIndex((t) => t._id === over.id);
    const reordered = arrayMove(trainings, oldIndex, newIndex);
    setTemplateFormData({
      ...templateFormData,
      trainings: reordered.map((t, i) => ({ ...t, order: i + 1 })),
    });
  };

  return (
    <div>
      {templatesLoading && !showForm && (
        <div className="loading-screen">
          <span className="loading-text">Carregando...</span>
        </div>
      )}

      <div className="page-header">
        <h1>Modelos de Rotina</h1>
        <div className="page-header-actions">
          {!showForm && (
            <div className="view-toggle-group">
              <button
                type="button"
                className={`view-toggle-btn${viewMode === 'card' ? ' view-toggle-btn--active' : ''}`}
                onClick={() => setViewMode('card')}
                aria-pressed={viewMode === 'card'}
                aria-label="Visualização em cards"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                type="button"
                className={`view-toggle-btn${viewMode === 'list' ? ' view-toggle-btn--active' : ''}`}
                onClick={() => setViewMode('list')}
                aria-pressed={viewMode === 'list'}
                aria-label="Visualização em lista"
              >
                <List size={16} />
              </button>
            </div>
          )}
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="btn-primary">
              + Novo Modelo
            </button>
          )}
        </div>
      </div>

      {!showForm && !templatesLoading && templates.length === 0 && (
        <div className="alert alert-info" style={{ marginBottom: 'var(--spacing-md)' }}>
          <strong>O que é um modelo?</strong> Um modelo é uma estrutura de rotina pré-definida com
          treinos, dias da semana e duração para reutilização rápida.
        </div>
      )}

      {showForm && (
        <div className="card card--mb">
          <h2 className="card-title mb-md">
            {editingId ? 'Editar Modelo' : 'Criar Novo Modelo'}
          </h2>
          <form onSubmit={handleTemplateSubmit} className="form">
            <div>
              <label className="form-label">Nome</label>
              <input
                type="text"
                value={templateFormData.name}
                onChange={(e) => setTemplateFormData({ ...templateFormData, name: e.target.value })}
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="form-label">Descrição</label>
              <textarea
                value={templateFormData.description}
                onChange={(e) => setTemplateFormData({ ...templateFormData, description: e.target.value })}
                rows={3}
                className="form-textarea"
              />
            </div>

            <div className="grid-responsive-2col">
              <div>
                <label className="form-label">Classificação</label>
                <select
                  value={templateFormData.genderOrdination}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, genderOrdination: e.target.value })}
                  className="form-select"
                >
                  <option value="">Selecione...</option>
                  <option value="male">Masculino</option>
                  <option value="female">Feminino</option>
                  <option value="other">Outro</option>
                </select>
              </div>

              <div>
                <label className="form-label">Nível de Treino</label>
                <select
                  value={templateFormData.trainingLevel}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, trainingLevel: e.target.value })}
                  className="form-select"
                >
                  <option value="">Selecione...</option>
                  <option value="beginner">Iniciante</option>
                  <option value="intermediate">Intermediário</option>
                  <option value="advanced">Avançado</option>
                  <option value="athlete">Atleta</option>
                </select>
              </div>
            </div>

            <div>
              <label className="form-label">Duração Padrão (semanas)</label>
              <input
                type="number"
                min="1"
                value={templateFormData.defaultDurationWeeks}
                onChange={(e) => setTemplateFormData({
                  ...templateFormData,
                  defaultDurationWeeks: parseInt(e.target.value, 10) || 1,
                })}
                className="form-input"
                required
              />
            </div>

            <div className="form-section">
              <div className="form-section-header">
                <h3 className="form-section-title">Modelos de Treino</h3>
                {templateFormData.trainings.length > 0 && (
                  <button
                    type="button"
                    className="btn-primary schedule-template-add-btn"
                    onClick={() => openTrainingTemplateModal()}
                    aria-label="Criar novo modelo de treino"
                  >
                    + Criar novo
                  </button>
                )}
              </div>

              {templateFormData.trainings.length === 0 && (
                <div className="training-actions-empty">
                  <button
                    type="button"
                    className="training-action-card"
                    onClick={openAddTrainingModal}
                  >
                    <span className="training-action-card-title">Selecionar existente</span>
                    <span className="training-action-card-description">
                      Escolha um modelo de treino já cadastrado.
                    </span>
                  </button>
                  <button
                    type="button"
                    className="training-action-card training-action-card--primary"
                    onClick={() => openTrainingTemplateModal()}
                    aria-label="Criar novo modelo de treino"
                  >
                    <span className="training-action-card-title">Criar novo modelo de treino</span>
                    <span className="training-action-card-description">
                      Cadastre um novo modelo sem sair desta tela.
                    </span>
                  </button>
                </div>
              )}

              {templateFormData.trainings.length > 0 && (
                <>
                  <DndContext
                    sensors={dndSensors}
                    collisionDetection={closestCenter}
                    modifiers={[restrictToVerticalAxis]}
                    onDragEnd={handleScheduleDragEnd}
                  >
                    <SortableContext
                      items={templateFormData.trainings.map((t) => t._id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="schedule-template-list">
                        {templateFormData.trainings.map((training) => (
                          <SortableScheduleRow
                            key={training._id}
                            id={training._id}
                            training={training}
                            trainingTemplates={trainingTemplates}
                            exercises={getExercisesForTraining(training)}
                            onRemove={() => {
                              const updated = templateFormData.trainings.filter((t) => t._id !== training._id);
                              setTemplateFormData({ ...templateFormData, trainings: updated });
                            }}
                            onEdit={training.trainingTemplateId ? () => openEditTrainingTemplateModal(training.trainingTemplateId) : undefined}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                  <div className="schedule-template-actions">
                    <button
                      type="button"
                      className="btn-secondary schedule-template-add-btn"
                      onClick={openAddTrainingModal}
                    >
                      + Adicionar treino
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="btn-group">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
              <button type="button" onClick={resetTemplateForm} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {!showForm && !templatesLoading && templates.length > 0 && viewMode === 'card' && (
        <div className="grid-cards">
          {templates.map((template) => {
            const genderLabel = { male: 'Masculino', female: 'Feminino', other: 'Outro' }[template.genderOrdination];
            const levelLabel = { beginner: 'Iniciante', intermediate: 'Intermediário', advanced: 'Avançado', athlete: 'Atleta' }[template.trainingLevel];
            return (
              <div key={template.id} className="card">
                <div className="mb-md">
                  <h3 className="card-subtitle mb-xs">
                    {template.name}
                  </h3>
                  {template.description && (
                    <p className="card-description mb-md text-clamp-2">
                      {template.description}
                    </p>
                  )}
                </div>

                <div className="info-list mb-md" style={{ paddingTop: 'var(--spacing-sm)', borderTop: '1px solid var(--color-outline-variant)' }}>
                  <div className="text-sm text-light">
                    <strong>Duração:</strong> {template.defaultDurationWeeks} semanas
                  </div>
                  <div className="text-sm text-light">
                    <strong>Treinos:</strong> {template.scheduleTemplatesCount ?? template.trainingsCount ?? 0}
                  </div>
                  {genderLabel && (
                    <div className="text-sm text-light">
                      <strong>Classificação:</strong> {genderLabel}
                    </div>
                  )}
                  {levelLabel && (
                    <div className="text-sm text-light">
                      <strong>Nível:</strong> {levelLabel}
                    </div>
                  )}
                </div>

                <div className="btn-group">
                  <button onClick={() => handleTemplateEdit(template)} className="btn-edit">
                    Editar
                  </button>
                  <button onClick={() => handleTemplateDelete(template.id)} className="btn-delete">
                    Excluir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!showForm && !templatesLoading && templates.length > 0 && viewMode === 'list' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th className="table-col-desktop-only">Duração</th>
                <th className="table-col-desktop-only">Treinos</th>
                <th className="table-col-desktop-only">Nível</th>
                <th style={{ width: '48px' }} />
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => {
                const levelLabel = { beginner: 'Iniciante', intermediate: 'Intermediário', advanced: 'Avançado', athlete: 'Atleta' }[template.trainingLevel];
                const trainingsCount = template.scheduleTemplatesCount ?? template.trainingsCount ?? 0;
                return (
                  <tr key={template.id}>
                    <td>
                      <span style={{ fontWeight: 600 }}>{template.name}</span>
                      <span className="table-col-mobile-only" style={{ display: 'block', fontSize: 'var(--font-caption-size)', color: 'var(--color-on-surface-variant)', marginTop: '2px' }}>
                        {[
                          `${template.defaultDurationWeeks} sem.`,
                          `${trainingsCount} treinos`,
                          levelLabel,
                        ].filter(Boolean).join(' · ')}
                      </span>
                    </td>
                    <td className="table-col-desktop-only" style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--font-body-small-size)' }}>
                      {template.defaultDurationWeeks} semanas
                    </td>
                    <td className="table-col-desktop-only" style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--font-body-small-size)' }}>
                      {trainingsCount}
                    </td>
                    <td className="table-col-desktop-only" style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--font-body-small-size)' }}>
                      {levelLabel || '—'}
                    </td>
                    <td>
                      <TemplateRowMenu
                        ariaLabel={`Ações do modelo ${template.name}`}
                        onEdit={() => handleTemplateEdit(template)}
                        onDelete={() => handleTemplateDelete(template.id)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {templates.length === 0 && !showForm && !templatesLoading && (
        <div className="empty-state">
          <p className="empty-state-title">Nenhum modelo de rotina ainda</p>
          <p>Crie seu primeiro modelo e use-o como base ao atribuir rotinas aos alunos</p>
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

      {showAddTrainingModal && (
        <div className="overlay" onClick={closeAddTrainingModal}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-header">
              <h2 className="bottom-sheet-title">Adicionar Treino ao Modelo</h2>
              <button
                className="bottom-sheet-close"
                onClick={closeAddTrainingModal}
                aria-label="Fechar"
                type="button"
              >
                ✕
              </button>
            </div>
            <div className="bottom-sheet-body">
              <form onSubmit={handleAddTrainingModalSubmit} className="form">
                <div>
                  <label className="form-label" htmlFor="add-training-template">Modelo de Treino</label>
                  <select
                    id="add-training-template"
                    value={addTrainingModalData.trainingTemplateId}
                    onChange={(e) =>
                      setAddTrainingModalData({ ...addTrainingModalData, trainingTemplateId: e.target.value })
                    }
                    className="form-select"
                    required
                  >
                    <option value="">Selecione um modelo...</option>
                    {trainingTemplates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label" htmlFor="add-training-weekday">Dia da Semana (opcional)</label>
                  <select
                    id="add-training-weekday"
                    value={addTrainingModalData.weekDay}
                    onChange={(e) =>
                      setAddTrainingModalData({ ...addTrainingModalData, weekDay: e.target.value })
                    }
                    className="form-select"
                  >
                    <option value="">— Sem dia definido —</option>
                    {WEEK_DAY_OPTIONS.map((day) => (
                      <option key={day.value} value={day.value}>
                        {day.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label" htmlFor="add-training-order">Ordem</label>
                  <input
                    id="add-training-order"
                    type="number"
                    min="1"
                    value={addTrainingModalData.order}
                    onChange={(e) =>
                      setAddTrainingModalData({ ...addTrainingModalData, order: parseInt(e.target.value, 10) || 1 })
                    }
                    className="form-input"
                    required
                  />
                </div>

                <div className="btn-group">
                  <button type="submit" className="btn-primary">
                    Adicionar
                  </button>
                  <button type="button" onClick={closeAddTrainingModal} className="btn-secondary">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showTrainingTemplateModal && (
        <div className="overlay" onClick={closeTrainingTemplateModal}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-header">
              <h2 className="bottom-sheet-title">
                {editingTrainingTemplateId ? 'Editar Modelo de Treino' : 'Criar Modelo de Treino'}
              </h2>
              <button
                className="bottom-sheet-close"
                onClick={closeTrainingTemplateModal}
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            <div className="bottom-sheet-body">
              {loadingTrainingTemplateEdit ? (
                <div className="loading-screen"><span className="loading-text">Carregando...</span></div>
              ) : (
              <form onSubmit={handleTrainingTemplateSubmit} className="form">
                <div>
                  <label className="form-label" htmlFor="tt-modal-name">Nome</label>
                  <input
                    id="tt-modal-name"
                    type="text"
                    value={trainingTemplateFormData.name}
                    onChange={(e) => setTrainingTemplateFormData({ ...trainingTemplateFormData, name: e.target.value })}
                    className="form-input"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="form-label" htmlFor="tt-modal-description">Descrição</label>
                  <textarea
                    id="tt-modal-description"
                    value={trainingTemplateFormData.description}
                    onChange={(e) => setTrainingTemplateFormData({ ...trainingTemplateFormData, description: e.target.value })}
                    rows={3}
                    className="form-textarea"
                  />
                </div>

                <div className="grid-responsive-2col">
                  <div>
                    <label className="form-label" htmlFor="tt-modal-category">Categoria</label>
                    <select
                      id="tt-modal-category"
                      value={trainingTemplateFormData.category}
                      onChange={(e) => setTrainingTemplateFormData({ ...trainingTemplateFormData, category: e.target.value })}
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
                    <label className="form-label" htmlFor="tt-modal-bodySegment">Segmento Corporal</label>
                    <select
                      id="tt-modal-bodySegment"
                      value={trainingTemplateFormData.bodySegment}
                      onChange={(e) => setTrainingTemplateFormData({ ...trainingTemplateFormData, bodySegment: e.target.value })}
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

                <div className="form-checkbox-row">
                  <input
                    type="checkbox"
                    id="trainingTemplateIsPublic"
                    checked={trainingTemplateFormData.isPublic}
                    onChange={(e) => setTrainingTemplateFormData({ ...trainingTemplateFormData, isPublic: e.target.checked })}
                  />
                  <label htmlFor="trainingTemplateIsPublic" className="form-label mb-0">
                    Tornar este modelo público
                  </label>
                </div>

                <div className="form-section" style={{ marginTop: 'var(--spacing-md)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-outline-variant)' }}>
                  <div className="form-section-header">
                    <h3 className="form-section-title">Exercícios do modelo</h3>
                  </div>

                  <div className="exercise-picker-row">
                    <div className="form-group">
                      <label className="form-label" htmlFor="pt-exercise-picker">Selecionar exercício existente</label>
                      <select
                        id="pt-exercise-picker"
                        value={exercisePickerValue}
                        onChange={(e) => setExercisePickerValue(e.target.value)}
                        className="form-select"
                      >
                        <option value="">Selecione um modelo...</option>
                        {exerciseTemplates.map((et) => (
                          <option key={et.id} value={et.id}>{et.name}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleExercisePickerAdd}
                      disabled={!exercisePickerValue}
                      aria-label="Adicionar exercício ao modelo"
                    >
                      Adicionar
                    </button>
                  </div>

                  {trainingTemplateFormData.exerciseTemplateIds.length > 0 && (
                    <div className="exercise-list">
                      {trainingTemplateFormData.exerciseTemplateIds.map((etId) => {
                        const et = exerciseTemplates.find((t) => String(t.id) === String(etId));
                        const name = et?.name || String(etId);
                        const meta = et ? formatExerciseMeta(et) : null;
                        return (
                          <ExerciseRow
                            key={etId}
                            name={name}
                            meta={meta}
                            onEdit={et ? () => setEditingExerciseTemplate(et) : undefined}
                            onRemove={() => handleExercisePickerRemove(etId)}
                          />
                        );
                      })}
                    </div>
                  )}

                  <div className="exercise-list-actions">
                    <button
                      type="button"
                      className="btn-schedule-sm"
                      onClick={() => setShowExerciseTemplateModal(true)}
                      aria-label="Criar novo modelo de exercício"
                    >
                      + Criar novo modelo de exercício
                    </button>
                  </div>
                </div>

                <div className="btn-group">
                  <button type="submit" disabled={savingTrainingTemplate} className="btn-primary">
                    {savingTrainingTemplate ? 'Salvando...' : editingTrainingTemplateId ? 'Salvar' : 'Criar Modelo de Treino'}
                  </button>
                  <button type="button" onClick={closeTrainingTemplateModal} className="btn-secondary">
                    Cancelar
                  </button>
                </div>
              </form>
              )}
            </div>
          </div>
        </div>
      )}

      {(showExerciseTemplateModal || editingExerciseTemplate) && (
        <CreateExerciseTemplateModal
          open
          exerciseTemplate={editingExerciseTemplate}
          onClose={() => {
            setShowExerciseTemplateModal(false);
            setEditingExerciseTemplate(null);
          }}
          onSuccess={(result) => {
            const wasEditing = !!editingExerciseTemplate;
            setShowExerciseTemplateModal(false);
            setEditingExerciseTemplate(null);
            fetchExerciseTemplates();
            if (!wasEditing && result?.id != null) {
              setTrainingTemplateFormData((prev) => ({
                ...prev,
                exerciseTemplateIds: [...prev.exerciseTemplateIds, result.id],
              }));
            }
          }}
        />
      )}
    </div>
  );
};

export default ProtocolTemplates;
