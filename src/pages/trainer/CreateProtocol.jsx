import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GripVertical } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import DateInput from '../../components/DateInput';
import CreateExerciseModal from '../../components/CreateExerciseModal';
import { WEEK_DAY_OPTIONS, getWeekDayLabel } from '../../constants/weekDays';
import { PROTOCOL_TYPE_OPTIONS } from '../../constants/protocolTypes';
import { EXERCISE_TYPE_OPTIONS } from '../../constants/exerciseTypes';
import { formatExerciseMeta } from '../../utils/exerciseMeta';

const categoryLabels = {
  strength: 'Força', cardio: 'Cardio', flexibility: 'Flexibilidade',
  functional: 'Funcional', mobility: 'Mobilidade', rest: 'Descanso',
};

const segmentLabels = {
  upper: 'Superior', lower: 'Inferior', core: 'Core', full_body: 'Corpo Inteiro',
};

const badgeStyle = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-outline-variant)',
  color: 'var(--color-on-surface-variant)',
};

const SortableTrainingRow = ({ id, training, index, exercises, onRemove, onAddExercise }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
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
        <span style={{ fontWeight: 600, flex: 1 }}>
          {training.name || `Treino ${index + 1}`}
        </span>
        <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
          {training.category && (
            <span className="badge" style={{ ...badgeStyle, color: 'var(--color-primary)' }}>
              {categoryLabels[training.category] || training.category}
            </span>
          )}
          {training.bodySegment && (
            <span className="badge" style={badgeStyle}>
              {segmentLabels[training.bodySegment] || training.bodySegment}
            </span>
          )}
          {dayLabel && (
            <span className="badge badge-blue">{dayLabel}</span>
          )}
          <span className="badge" style={badgeStyle}>Ordem: {training.order}</span>
        </div>
        {exercises.length > 0 && (
          <div className="training-row-exercises">
            {exercises.map((exercise) => {
              const meta = formatExerciseMeta(exercise);
              return (
                <div key={exercise._id || exercise.id} className="training-row-exercise-item">
                  <span className="training-row-exercise-name">{exercise.name}</span>
                  {meta && <span className="training-row-exercise-meta"> · {meta}</span>}
                </div>
              );
            })}
          </div>
        )}
        {!training.fromTemplate && onAddExercise && (
          <button
            type="button"
            className="btn-schedule-sm"
            onClick={() => onAddExercise(index)}
            style={{ alignSelf: 'flex-start', marginTop: 'var(--spacing-xs)' }}
          >
            + Adicionar exercício
          </button>
        )}
      </div>
      <button
        type="button"
        className="btn-delete-sm"
        onClick={() => onRemove(index)}
        aria-label={`Remover treino ${index + 1}`}
      >
        Remover
      </button>
    </div>
  );
};

SortableTrainingRow.propTypes = {
  id: PropTypes.string.isRequired,
  training: PropTypes.shape({
    name: PropTypes.string,
    category: PropTypes.string,
    bodySegment: PropTypes.string,
    weekDay: PropTypes.string,
    order: PropTypes.number,
    fromTemplate: PropTypes.bool,
    inlineExercises: PropTypes.array,
  }).isRequired,
  index: PropTypes.number.isRequired,
  exercises: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
  })).isRequired,
  onRemove: PropTypes.func.isRequired,
  onAddExercise: PropTypes.func,
};

const CreateProtocol = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get('studentId');

  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [trainingTemplates, setTrainingTemplates] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentSearchResults, setStudentSearchResults] = useState([]);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [exerciseTemplates, setExerciseTemplates] = useState([]);
  const [exerciseIdsByTemplateId, setExerciseIdsByTemplateId] = useState({});
  const [showAddTrainingModal, setShowAddTrainingModal] = useState(false);
  const [addTrainingModalData, setAddTrainingModalData] = useState({
    trainingTemplateId: '',
    name: '',
    description: '',
    category: '',
    bodySegment: '',
    order: 1,
    weekDay: '',
    inlineExercises: [],
  });
  // inlineExerciseContext: null (closed) | { type: 'modal' } | { type: 'row', trainingIndex: number }
  const [inlineExerciseContext, setInlineExerciseContext] = useState(null);
  const [inlineExerciseMode, setInlineExerciseMode] = useState('create'); // 'create' | 'fromTemplate'
  const [inlineExerciseTemplateId, setInlineExerciseTemplateId] = useState('');
  const [inlineExerciseTemplateFields, setInlineExerciseTemplateFields] = useState({
    name: '', type: '', videoUrl: '', sets: '', repetitionsMin: '', repetitionsMax: '',
    duration: '', hasLoad: false, suggestedLoad: '', notes: '',
  });

  const dndSensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  }));

  const [formData, setFormData] = useState({
    assigneeId: '',
    name: '',
    description: '',
    defaultDurationWeeks: 12,
    genderOrdination: '',
    trainingLevel: '',
    type: '',
    trainings: [],
    startDate: '',
    endDate: '',
    templateId: '',
  });

  useEffect(() => {
    fetchTemplates();
    fetchTrainingTemplates();
    fetchExerciseTemplates();
    if (studentId) {
      fetchStudentById(studentId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  useEffect(() => {
    if (studentId || selectedStudent || studentSearchQuery.trim().length < 2) {
      setStudentSearchResults([]);
      setSearchingStudents(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setSearchingStudents(true);
      try {
        const response = await api.get('/trainer/students/search', {
          params: { q: studentSearchQuery.trim(), limit: 10 },
        });
        setStudentSearchResults(response.data || []);
      } catch {
        setStudentSearchResults([]);
      } finally {
        setSearchingStudents(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [studentSearchQuery, studentId, selectedStudent]);

  useEffect(() => {
    const templateIds = formData.trainings
      .map((t) => t.trainingTemplateId)
      .filter((id) => id && !exerciseIdsByTemplateId[id]);
    const uniqueIds = [...new Set(templateIds)];
    uniqueIds.forEach(fetchExercisesForTemplate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.trainings]);

  const getExercisesForTraining = (training) => {
    const fromModel = training.trainingTemplateId
      ? (exerciseIdsByTemplateId[training.trainingTemplateId] || [])
      : [];
    return [...fromModel, ...(training.inlineExercises || [])];
  };

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/trainer/protocol-templates');
      setTemplates(response.data || []);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    }
  };

  const fetchTrainingTemplates = async () => {
    try {
      const response = await api.get('/trainer/training-templates');
      setTrainingTemplates(response.data || []);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    }
  };

  const fetchExerciseTemplates = async () => {
    try {
      const response = await api.get('/trainer/exercise-templates');
      setExerciseTemplates(response.data || []);
    } catch {
      // non-critical — exercises are supplementary info
    }
  };

  const fetchExercisesForTemplate = async (trainingTemplateId) => {
    if (!trainingTemplateId || exerciseIdsByTemplateId[trainingTemplateId]) return;
    try {
      const response = await api.get(`/trainer/training-templates/${trainingTemplateId}`);
      const junctionList = response.data?.trainingTemplateExerciseTemplates || [];
      const exercises = junctionList
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((e) => e.exerciseTemplate)
        .filter(Boolean);
      setExerciseIdsByTemplateId((prev) => ({ ...prev, [trainingTemplateId]: exercises }));
    } catch {
      // silently fail
    }
  };

  const fetchStudentById = async (id) => {
    setStudentLoading(true);
    try {
      const response = await api.get('/trainer/students');
      const foundStudent = (response.data || []).find((student) => String(student.id) === String(id));
      if (!foundStudent) {
        showToast('Aluno não encontrado para criar rotina.', 'error');
        return;
      }

      setSelectedStudent(foundStudent);
      setFormData((prev) => ({ ...prev, assigneeId: foundStudent.id }));
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setStudentLoading(false);
    }
  };

  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    setFormData((prev) => ({ ...prev, assigneeId: student.id }));
    setStudentSearchQuery('');
    setStudentSearchResults([]);
  };

  const handleStudentClear = () => {
    setSelectedStudent(null);
    setFormData((prev) => ({ ...prev, assigneeId: '' }));
    setStudentSearchQuery('');
    setStudentSearchResults([]);
  };

  const getStudentFullName = (student) => {
    if (!student) return '';
    return [student.firstName, student.lastName].filter(Boolean).join(' ');
  };

  const getStudentDisplayName = (student) => {
    const fullName = getStudentFullName(student);
    return fullName || student?.email || '';
  };

  const getStudentSecondaryInfo = (student) => {
    const fullName = getStudentFullName(student);
    return fullName ? student?.email || '' : '';
  };

  const getStudentAvatarInitial = (student) => {
    const displayName = getStudentDisplayName(student);
    return displayName ? displayName.charAt(0).toUpperCase() : '?';
  };

  const handleProtocolInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProtocolDurationChange = (e) => {
    const parsedValue = parseInt(e.target.value, 10);
    setFormData((prev) => ({
      ...prev,
      defaultDurationWeeks: Number.isNaN(parsedValue) ? 1 : parsedValue,
    }));
  };

  const handleProtocolTemplateChange = async (e) => {
    const templateId = e.target.value;
    const selectedTemplate = templates.find((template) => String(template.id) === templateId);

    if (!selectedTemplate) {
      setFormData((prev) => ({
        ...prev,
        templateId,
        trainings: prev.trainings.filter((t) => !t.fromTemplate),
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      templateId,
      name: selectedTemplate.name || '',
      description: selectedTemplate.description || '',
      defaultDurationWeeks: selectedTemplate.defaultDurationWeeks || prev.defaultDurationWeeks,
      genderOrdination: selectedTemplate.genderOrdination?.toLowerCase() || '',
      trainingLevel: selectedTemplate.trainingLevel?.toLowerCase() || '',
      type: selectedTemplate.type?.toLowerCase() || '',
    }));

    try {
      const response = await api.get(`/trainer/protocol-templates/${templateId}`);
      const full = response.data;
      const scheduleItems = full?.scheduleTemplates || full?.trainings || [];
      const templateTrainings = scheduleItems.map((st, index) => {
        const tt = st.trainingTemplate || {};
        const weekDay = (st.weekDay || '').toLowerCase() || '';
        return {
          name: tt.name || '',
          description: tt.description || '',
          category: tt.category || '',
          bodySegment: tt.bodySegment || '',
          order: st.order ?? index + 1,
          weekDay: weekDay || '',
          trainingTemplateId: tt.id || st.trainingTemplateId || '',
          fromTemplate: true,
          _id: crypto.randomUUID(),
        };
      });
      setFormData((prev) => ({
        ...prev,
        trainings: [
          ...templateTrainings,
          ...prev.trainings.filter((t) => !t.fromTemplate),
        ],
      }));
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    }
  };

  const openAddTrainingModal = () => {
    setAddTrainingModalData({
      trainingTemplateId: '',
      name: '',
      description: '',
      category: '',
      bodySegment: '',
      order: formData.trainings.length + 1,
      weekDay: '',
      inlineExercises: [],
    });
    setShowAddTrainingModal(true);
  };

  const closeAddTrainingModal = () => {
    setShowAddTrainingModal(false);
  };

  const openInlineExerciseForModal = () => {
    setInlineExerciseContext({ type: 'modal' });
  };

  const openInlineExerciseForRow = (trainingIndex) => {
    setInlineExerciseContext({ type: 'row', trainingIndex });
  };

  const closeInlineExerciseModal = () => {
    setInlineExerciseContext(null);
    setInlineExerciseMode('create');
    setInlineExerciseTemplateId('');
    setInlineExerciseTemplateFields({
      name: '', type: '', videoUrl: '', sets: '', repetitionsMin: '', repetitionsMax: '',
      duration: '', hasLoad: false, suggestedLoad: '', notes: '',
    });
  };

  const handleInlineExerciseSuccess = (payload) => {
    const exercise = { ...payload, _id: crypto.randomUUID() };
    if (inlineExerciseContext) {
      if (inlineExerciseContext.type === 'modal') {
        setAddTrainingModalData((prev) => ({
          ...prev,
          inlineExercises: [...prev.inlineExercises, exercise],
        }));
      } else {
        const index = inlineExerciseContext.trainingIndex;
        setFormData((prev) => {
          const trainings = [...prev.trainings];
          trainings[index] = {
            ...trainings[index],
            inlineExercises: [...(trainings[index].inlineExercises || []), exercise],
          };
          return { ...prev, trainings };
        });
      }
    }
    closeInlineExerciseModal();
  };

  const handleInlineExerciseTemplateSelect = (templateId) => {
    setInlineExerciseTemplateId(templateId);
    const template = exerciseTemplates.find((t) => String(t.id) === templateId);
    if (!template) {
      setInlineExerciseTemplateFields({
        name: '', type: '', videoUrl: '', sets: '', repetitionsMin: '', repetitionsMax: '',
        duration: '', hasLoad: false, suggestedLoad: '', notes: '',
      });
      return;
    }
    setInlineExerciseTemplateFields({
      name: template.name || '',
      type: template.type || '',
      videoUrl: template.videoUrl || '',
      sets: template.sets ?? '',
      repetitionsMin: template.repetitions?.min ?? '',
      repetitionsMax: template.repetitions?.max ?? '',
      duration: template.duration ?? '',
      hasLoad: template.hasLoad || false,
      suggestedLoad: template.suggestedLoad ?? '',
      notes: template.notes || '',
    });
  };

  const handleInlineExerciseFromTemplate = (e) => {
    e.preventDefault();
    if (!inlineExerciseTemplateId) return;
    const f = inlineExerciseTemplateFields;
    const payload = { name: f.name, type: f.type, hasLoad: f.hasLoad };
    if (f.videoUrl?.trim()) payload.videoUrl = f.videoUrl.trim();
    if (f.sets !== '' && f.sets != null) payload.sets = parseInt(f.sets, 10);
    if (f.repetitionsMin !== '' && f.repetitionsMin != null && f.repetitionsMax !== '' && f.repetitionsMax != null) {
      payload.repetitions = { min: parseInt(f.repetitionsMin, 10), max: parseInt(f.repetitionsMax, 10) };
    }
    if (f.duration !== '' && f.duration != null) payload.duration = parseInt(f.duration, 10);
    if (f.hasLoad && f.suggestedLoad !== '' && f.suggestedLoad != null) payload.suggestedLoad = parseFloat(f.suggestedLoad);
    if (f.notes?.trim()) payload.notes = f.notes.trim();

    handleInlineExerciseSuccess(payload);
  };

  const removeInlineExerciseFromModal = (exerciseId) => {
    setAddTrainingModalData((prev) => ({
      ...prev,
      inlineExercises: prev.inlineExercises.filter((ex) => ex._id !== exerciseId),
    }));
  };

  const handleAddTrainingModalTemplateSelect = (templateId) => {
    const template = trainingTemplates.find((t) => String(t.id) === templateId);
    if (template && templateId && !exerciseIdsByTemplateId[templateId]) {
      const junctionList = template.trainingTemplateExerciseTemplates || [];
      const exercises = junctionList
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((e) => e.exerciseTemplate)
        .filter(Boolean);
      setExerciseIdsByTemplateId((prev) => ({ ...prev, [templateId]: exercises }));
    }
    setAddTrainingModalData((prev) => ({
      ...prev,
      trainingTemplateId: templateId,
      name: template?.name || prev.name,
      description: template?.description || prev.description,
      category: template?.category || prev.category,
      bodySegment: template?.bodySegment || prev.bodySegment,
    }));
  };

  const handleAddTrainingModalSubmit = (e) => {
    e.preventDefault();
    setFormData((prev) => ({
      ...prev,
      trainings: [
        ...prev.trainings,
        { ...addTrainingModalData, _id: crypto.randomUUID() },
      ],
    }));
    closeAddTrainingModal();
  };

  const handleRemoveProtocolTraining = (index) => {
    setFormData((prev) => {
      const updated = prev.trainings.filter((_, currentIndex) => currentIndex !== index);
      return { ...prev, trainings: updated.map((t, i) => ({ ...t, order: i + 1 })) };
    });
  };

  const handleTrainingDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    setFormData((prev) => {
      const oldIndex = prev.trainings.findIndex((t) => t._id === active.id);
      const newIndex = prev.trainings.findIndex((t) => t._id === over.id);
      const reordered = arrayMove(prev.trainings, oldIndex, newIndex);
      return { ...prev, trainings: reordered.map((t, i) => ({ ...t, order: i + 1 })) };
    });
  };

  const createProtocolTrainings = async (protocolId, trainings) => {
    if (!protocolId || trainings.length === 0) return;

    for (const training of trainings) {
      const res = await api.post(`/trainer/protocols/${protocolId}/trainings`, {
        name: training.name || 'Treino',
        description: training.description || '',
        category: training.category,
        order: Number(training.order) || 1,
        ...(training.bodySegment && { bodySegment: training.bodySegment }),
        ...(training.trainingTemplateId && { trainingTemplateId: training.trainingTemplateId }),
      });

      const createdTrainingId = res.data?.id;
      if (!createdTrainingId) continue;

      if (training.trainingTemplateId) {
        const templateExercises = exerciseIdsByTemplateId[training.trainingTemplateId] || [];
        for (const exercise of templateExercises) {
          await api.post('/trainer/exercises/from-template', { trainingId: createdTrainingId, templateId: exercise.id });
        }
      }

      if (training.inlineExercises?.length > 0) {
        for (const exercise of training.inlineExercises) {
          const { _id, ...payload } = exercise;
          await api.post(`/trainer/trainings/${createdTrainingId}/exercises`, payload);
        }
      }
    }
  };

  const buildProtocolPayload = (data) => ({
    assigneeId: data.assigneeId,
    name: data.name,
    description: data.description,
    startDate: data.startDate,
    expirationDate: data.endDate,
    ...(data.genderOrdination && { genderOrdination: data.genderOrdination }),
    ...(data.trainingLevel && { trainingLevel: data.trainingLevel }),
    ...(data.type && { type: data.type }),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.assigneeId) {
      showToast('Selecione um aluno para continuar.', 'error');
      return;
    }

    setLoading(true);
    try {
      let protocolResponse;

      if (formData.templateId) {
        const importData = buildProtocolPayload(formData);
        protocolResponse = await api.post('/trainer/protocols/import-from-template', {
          templateId: formData.templateId,
          ...importData,
        });
      } else {
        const createData = buildProtocolPayload(formData);
        protocolResponse = await api.post('/trainer/protocols', createData);
      }

      await createProtocolTrainings(
        protocolResponse.data?.id,
        formData.trainings.filter((t) => !t.fromTemplate)
      );

      showToast('Rotina criada com sucesso!', 'success');
      navigate(`/trainer/protocols/${protocolResponse.data?.id}`);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div>
      {studentLoading && (
        <div className="loading-screen">
          <span className="loading-text">Carregando...</span>
        </div>
      )}

      {!studentLoading && (
        <>
      <div className="page-header">
        <h1>Criar Rotina</h1>
      </div>

      {studentId && !selectedStudent && (
        <div className="alert alert-error" style={{ marginBottom: 'var(--spacing-md)' }}>
          Não foi possível carregar o aluno selecionado.
        </div>
      )}

      <div className="card card--mb">
        <h2 className="card-title mb-md">Nova Rotina</h2>
        <form onSubmit={handleSubmit} className="form">
          <div>
            <label className="form-label" htmlFor="student-search">Aluno</label>
            {selectedStudent ? (
              <div className="protocol-student-selected">
                <div className="protocol-student-selected-header">
                  <div className="protocol-student-avatar">
                    {getStudentAvatarInitial(selectedStudent)}
                  </div>
                  <div className="protocol-student-selected-meta">
                    <div className="protocol-student-name">{getStudentDisplayName(selectedStudent)}</div>
                    {getStudentSecondaryInfo(selectedStudent) && (
                      <div className="protocol-student-email">{getStudentSecondaryInfo(selectedStudent)}</div>
                    )}
                  </div>
                  {!studentId && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleStudentClear}
                      style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}
                    >
                      Trocar aluno
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <input
                  id="student-search"
                  type="text"
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  className="form-input"
                  placeholder="Buscar por nome ou e-mail..."
                  autoComplete="off"
                />
                {searchingStudents && (
                  <div className="student-search-dropdown">
                    <div className="student-search-item student-search-item--loading">
                      Buscando...
                    </div>
                  </div>
                )}
                {!searchingStudents && studentSearchResults.length > 0 && (
                  <div className="student-search-dropdown">
                    {studentSearchResults.map((student) => (
                      <button
                        key={student.id}
                        type="button"
                        className="student-search-item"
                        onClick={() => handleStudentSelect(student)}
                      >
                        <div className="student-search-item-name">{getStudentDisplayName(student)}</div>
                        {getStudentSecondaryInfo(student) && (
                          <div className="student-search-item-email">{getStudentSecondaryInfo(student)}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {!searchingStudents && studentSearchQuery.trim().length >= 2 && studentSearchResults.length === 0 && (
                  <div className="student-search-dropdown">
                    <div className="student-search-item student-search-item--empty">
                      Nenhum aluno encontrado.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="form-label" htmlFor="protocol-template-id">Importar rotina</label>
            <select
              id="protocol-template-id"
              name="templateId"
              value={formData.templateId}
              onChange={handleProtocolTemplateChange}
              className="form-select"
            >
              <option value="">-- Selecione uma rotina --</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.defaultDurationWeeks} semanas)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" htmlFor="protocol-name">Nome da Rotina</label>
            <input
              id="protocol-name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleProtocolInputChange}
              className="form-input"
              required
            />
          </div>

          <div>
            <label className="form-label" htmlFor="protocol-description">Descrição</label>
            <textarea
              id="protocol-description"
              name="description"
              value={formData.description}
              onChange={handleProtocolInputChange}
              rows={3}
              className="form-textarea"
            />
          </div>

          <div className="grid-2col">
            <div>
              <label className="form-label" htmlFor="protocol-start-date">Data de Início</label>
              <DateInput
                id="protocol-start-date"
                value={formData.startDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="form-label" htmlFor="protocol-end-date">Data de Término</label>
              <DateInput
                id="protocol-end-date"
                value={formData.endDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                className="form-input"
                required
              />
            </div>
          </div>

          <div className="grid-responsive-2col">
            <div>
              <label className="form-label" htmlFor="protocol-gender-ordination">Classificação</label>
              <select
                id="protocol-gender-ordination"
                name="genderOrdination"
                value={formData.genderOrdination}
                onChange={handleProtocolInputChange}
                className="form-select"
              >
                <option value="">Selecione...</option>
                <option value="male">Masculino</option>
                <option value="female">Feminino</option>
                <option value="other">Outro</option>
              </select>
            </div>

            <div>
              <label className="form-label" htmlFor="protocol-training-level">Nível de Treino</label>
              <select
                id="protocol-training-level"
                name="trainingLevel"
                value={formData.trainingLevel}
                onChange={handleProtocolInputChange}
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
            <label className="form-label" htmlFor="protocol-type">Tipo de Protocolo</label>
            <select
              id="protocol-type"
              name="type"
              value={formData.type}
              onChange={handleProtocolInputChange}
              className="form-select"
            >
              <option value="">Selecione...</option>
              {PROTOCOL_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" htmlFor="protocol-default-duration-weeks">Duração Padrão (semanas)</label>
            <input
              id="protocol-default-duration-weeks"
              type="number"
              min="1"
              value={formData.defaultDurationWeeks}
              onChange={handleProtocolDurationChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-section">
            <div className="form-section-header">
              <h3 className="form-section-title">Treinos</h3>
            </div>

            {formData.trainings.length === 0 && (
              <div className="empty-state-inline" style={{ border: 'none', background: 'transparent' }}>
                <p>Nenhum treino adicionado. Adicione treinos para definir o conteúdo de cada dia da rotina.</p>
                <button type="button" className="btn-primary" onClick={openAddTrainingModal}>
                  + Adicionar treino
                </button>
              </div>
            )}

            {formData.trainings.length > 0 && (
              <>
                <DndContext
                  sensors={dndSensors}
                  collisionDetection={closestCenter}
                  modifiers={[restrictToVerticalAxis]}
                  onDragEnd={handleTrainingDragEnd}
                >
                  <SortableContext
                    items={formData.trainings.map((t) => t._id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="schedule-template-list">
                      {formData.trainings.map((training, index) => (
                        <SortableTrainingRow
                          key={training._id}
                          id={training._id}
                          training={training}
                          index={index}
                          exercises={getExercisesForTraining(training)}
                          onRemove={handleRemoveProtocolTraining}
                          onAddExercise={openInlineExerciseForRow}
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
            <button
              type="submit"
              disabled={loading || !selectedStudent}
              className="btn-primary"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/trainer/students')}
              className="btn-secondary"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>

        </>
      )}

      {showAddTrainingModal && (
        <div className="overlay" onClick={closeAddTrainingModal}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-header">
              <h2 className="bottom-sheet-title">Adicionar Treino</h2>
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
                {trainingTemplates.length > 0 && (
                  <div>
                    <label className="form-label" htmlFor="add-training-template-id">
                      Importar treino único{' '}
                      <span style={{ fontWeight: 400, color: 'var(--color-on-surface-variant)' }}>
                        (pré-preenche os campos)
                      </span>
                    </label>
                    <select
                      id="add-training-template-id"
                      value={addTrainingModalData.trainingTemplateId}
                      onChange={(e) => handleAddTrainingModalTemplateSelect(e.target.value)}
                      className="form-select"
                    >
                      <option value="">-- Nenhum --</option>
                      {trainingTemplates.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {addTrainingModalData.trainingTemplateId && (() => {
                  const exercises = exerciseIdsByTemplateId[addTrainingModalData.trainingTemplateId] || [];
                  if (exercises.length === 0) return null;
                  return (
                    <div>
                      <p className="form-label">Exercícios inclusos</p>
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
                    </div>
                  );
                })()}

                <div>
                  <label className="form-label" htmlFor="add-training-name">Nome</label>
                  <input
                    id="add-training-name"
                    type="text"
                    value={addTrainingModalData.name}
                    onChange={(e) => setAddTrainingModalData((prev) => ({ ...prev, name: e.target.value }))}
                    className="form-input"
                    placeholder="Ex: Treino A — Peito e Tríceps"
                    required
                    autoFocus
                  />
                </div>

                <div className="grid-responsive-2col">
                  <div>
                    <label className="form-label" htmlFor="add-training-category">Categoria</label>
                    <select
                      id="add-training-category"
                      value={addTrainingModalData.category}
                      onChange={(e) => setAddTrainingModalData((prev) => ({ ...prev, category: e.target.value }))}
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
                    <label className="form-label" htmlFor="add-training-body-segment">Segmento Corporal</label>
                    <select
                      id="add-training-body-segment"
                      value={addTrainingModalData.bodySegment}
                      onChange={(e) => setAddTrainingModalData((prev) => ({ ...prev, bodySegment: e.target.value }))}
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
                    <label className="form-label" htmlFor="add-training-weekday">Dia da Semana</label>
                    <select
                      id="add-training-weekday"
                      value={addTrainingModalData.weekDay}
                      onChange={(e) => setAddTrainingModalData((prev) => ({ ...prev, weekDay: e.target.value }))}
                      className="form-select"
                    >
                      <option value="">— Sem dia definido —</option>
                      {WEEK_DAY_OPTIONS.map((day) => (
                        <option key={day.value} value={day.value}>{day.label}</option>
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
                      onChange={(e) => setAddTrainingModalData((prev) => ({ ...prev, order: parseInt(e.target.value, 10) || 1 }))}
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div className="form-section">
                  <div className="form-section-header">
                    <h3 className="form-section-title">Exercícios</h3>
                  </div>
                  {addTrainingModalData.inlineExercises.length > 0 && (
                    <div className="schedule-template-list" style={{ marginBottom: 'var(--spacing-sm)' }}>
                      {addTrainingModalData.inlineExercises.map((ex) => {
                        const meta = formatExerciseMeta(ex);
                        return (
                          <div key={ex._id} className="schedule-template-row" style={{ alignItems: 'center' }}>
                            <div className="schedule-template-fields" style={{ alignItems: 'center' }}>
                              <span style={{ fontWeight: 600, flex: 1 }}>{ex.name}</span>
                              {meta && <span className="text-sm text-light">{meta}</span>}
                            </div>
                            <button
                              type="button"
                              className="btn-delete-sm"
                              onClick={() => removeInlineExerciseFromModal(ex._id)}
                              aria-label={`Remover exercício ${ex.name}`}
                            >
                              Remover
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <button
                    type="button"
                    className="btn-schedule-sm"
                    onClick={openInlineExerciseForModal}
                  >
                    + Criar exercício
                  </button>
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

      <CreateExerciseModal
        open={inlineExerciseContext !== null && inlineExerciseMode === 'create'}
        onClose={closeInlineExerciseModal}
        onSuccess={handleInlineExerciseSuccess}
        headerContent={
          <div className="segmented-toggle">
            <button type="button" className="segmented-toggle-btn segmented-toggle-btn--active">
              Criar novo
            </button>
            <button
              type="button"
              className="segmented-toggle-btn"
              onClick={() => setInlineExerciseMode('fromTemplate')}
            >
              Importar exercício
            </button>
          </div>
        }
      />

      {inlineExerciseContext !== null && inlineExerciseMode === 'fromTemplate' && (
        <div className="overlay" onClick={closeInlineExerciseModal}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-header">
              <h2 className="bottom-sheet-title">Adicionar Exercício</h2>
              <button
                className="bottom-sheet-close"
                onClick={closeInlineExerciseModal}
                aria-label="Fechar"
                type="button"
              >
                ✕
              </button>
            </div>
            <div className="bottom-sheet-body">
              <div className="segmented-toggle">
                <button
                  type="button"
                  className="segmented-toggle-btn"
                  onClick={() => setInlineExerciseMode('create')}
                >
                  Criar novo
                </button>
                <button type="button" className="segmented-toggle-btn segmented-toggle-btn--active">
                  Importar exercício
                </button>
              </div>
              <form onSubmit={handleInlineExerciseFromTemplate} className="form">
                <div>
                  <label className="form-label" htmlFor="inline-exercise-template">Modelo de exercício</label>
                  <select
                    id="inline-exercise-template"
                    value={inlineExerciseTemplateId}
                    onChange={(e) => handleInlineExerciseTemplateSelect(e.target.value)}
                    className="form-select"
                    required
                  >
                    <option value="">Selecione um exercício...</option>
                    {exerciseTemplates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                {inlineExerciseTemplateId && (
                  <>
                    <div>
                      <label className="form-label" htmlFor="ietf-name">Nome</label>
                      <input
                        id="ietf-name"
                        type="text"
                        className="form-input"
                        value={inlineExerciseTemplateFields.name}
                        onChange={(e) => setInlineExerciseTemplateFields((prev) => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label" htmlFor="ietf-type">Tipo</label>
                      <select
                        id="ietf-type"
                        className="form-select"
                        value={inlineExerciseTemplateFields.type}
                        onChange={(e) => setInlineExerciseTemplateFields((prev) => ({ ...prev, type: e.target.value }))}
                        required
                      >
                        <option value="">Selecione...</option>
                        {EXERCISE_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid-2col">
                      <div>
                        <label className="form-label" htmlFor="ietf-sets">Séries</label>
                        <input
                          id="ietf-sets"
                          type="number"
                          min="1"
                          className="form-input"
                          value={inlineExerciseTemplateFields.sets}
                          onChange={(e) => setInlineExerciseTemplateFields((prev) => ({ ...prev, sets: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="form-label" htmlFor="ietf-duration">Duração (s)</label>
                        <input
                          id="ietf-duration"
                          type="number"
                          min="1"
                          className="form-input"
                          value={inlineExerciseTemplateFields.duration}
                          onChange={(e) => setInlineExerciseTemplateFields((prev) => ({ ...prev, duration: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="grid-2col">
                      <div>
                        <label className="form-label" htmlFor="ietf-rep-min">Rep. mín.</label>
                        <input
                          id="ietf-rep-min"
                          type="number"
                          min="1"
                          className="form-input"
                          value={inlineExerciseTemplateFields.repetitionsMin}
                          onChange={(e) => setInlineExerciseTemplateFields((prev) => ({ ...prev, repetitionsMin: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="form-label" htmlFor="ietf-rep-max">Rep. máx.</label>
                        <input
                          id="ietf-rep-max"
                          type="number"
                          min="1"
                          className="form-input"
                          value={inlineExerciseTemplateFields.repetitionsMax}
                          onChange={(e) => setInlineExerciseTemplateFields((prev) => ({ ...prev, repetitionsMax: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                      <input
                        id="ietf-hasload"
                        type="checkbox"
                        checked={inlineExerciseTemplateFields.hasLoad}
                        onChange={(e) => setInlineExerciseTemplateFields((prev) => ({ ...prev, hasLoad: e.target.checked }))}
                      />
                      <label htmlFor="ietf-hasload" className="form-label" style={{ margin: 0 }}>Usa carga</label>
                    </div>
                    {inlineExerciseTemplateFields.hasLoad && (
                      <div>
                        <label className="form-label" htmlFor="ietf-load">Carga sugerida (kg)</label>
                        <input
                          id="ietf-load"
                          type="number"
                          min="0"
                          step="0.5"
                          className="form-input"
                          value={inlineExerciseTemplateFields.suggestedLoad}
                          onChange={(e) => setInlineExerciseTemplateFields((prev) => ({ ...prev, suggestedLoad: e.target.value }))}
                        />
                      </div>
                    )}
                    <div>
                      <label className="form-label" htmlFor="ietf-notes">Observações</label>
                      <textarea
                        id="ietf-notes"
                        className="form-textarea"
                        value={inlineExerciseTemplateFields.notes}
                        onChange={(e) => setInlineExerciseTemplateFields((prev) => ({ ...prev, notes: e.target.value }))}
                        rows={2}
                      />
                    </div>
                  </>
                )}
                <div className="btn-group">
                  <button type="submit" className="btn-primary">Adicionar</button>
                  <button type="button" onClick={closeInlineExerciseModal} className="btn-secondary">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateProtocol;
