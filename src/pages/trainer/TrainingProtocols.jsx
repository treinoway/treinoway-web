import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import DateInput from '../../components/DateInput';

const TrainingProtocols = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('protocols');
  const [protocols, setProtocols] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [trainingTemplates, setTrainingTemplates] = useState([]);
  const [loading, setLoading] = useState(false);

  // Protocol form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    assigneeId: '',
    name: '',
    description: '',
    availableWeekDays: [],
    defaultDurationWeeks: 12,
    genderOrdination: '',
    trainingLevel: '',
    trainings: [],
    startDate: '',
    endDate: '',
    templateId: '',
  });

  const [confirmDialog, setConfirmDialog] = useState(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentSearchResults, setStudentSearchResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchingStudents, setSearchingStudents] = useState(false);

  // Template form state
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    description: '',
    availableWeekDays: [],
    defaultDurationWeeks: 12,
    genderOrdination: '',
    trainingLevel: '',
    trainings: [],
  });

  // Inline Training Template creation modal
  const [showTrainingTemplateModal, setShowTrainingTemplateModal] = useState(false);
  const [creatingForIndex, setCreatingForIndex] = useState(null);
  const [trainingTemplateModalContext, setTrainingTemplateModalContext] = useState('template');
  const [savingTrainingTemplate, setSavingTrainingTemplate] = useState(false);
  const [pendingProtocolTrainingTemplates, setPendingProtocolTrainingTemplates] = useState([]);
  const [trainingTemplateFormData, setTrainingTemplateFormData] = useState({
    name: '',
    description: '',
    category: '',
    bodySegment: '',
    isPublic: false,
  });

  useEffect(() => {
    fetchProtocols();
    fetchTemplates();
    fetchTrainingTemplates();
  }, []);

  useEffect(() => {
    if (editingId || selectedStudent || studentSearchQuery.trim().length < 2) {
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
  }, [studentSearchQuery, editingId, selectedStudent]);

  const fetchProtocols = async () => {
    try {
      const response = await api.get('/trainer/protocols');
      setProtocols(response.data);
    } catch (error) {
      console.error('Failed to fetch protocols:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/trainer/protocol-templates');
      setTemplates(response.data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
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

  const buildProtocolPayload = (data, { includeAssignee = false } = {}) => {
    const payload = {
      name: data.name,
      description: data.description,
      availableWeekDays: data.availableWeekDays,
      defaultDurationWeeks: data.defaultDurationWeeks,
      startDate: data.startDate,
      endDate: data.endDate,
      expirationDate: data.endDate,
      ...(data.genderOrdination && { genderOrdination: data.genderOrdination }),
      ...(data.trainingLevel && { trainingLevel: data.trainingLevel }),
    };

    if (includeAssignee) {
      payload.assigneeId = data.assigneeId;
    }

    return payload;
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

  const handleProtocolWeekdayChange = (day, checked) => {
    setFormData((prev) => ({
      ...prev,
      availableWeekDays: checked
        ? [...prev.availableWeekDays, day]
        : prev.availableWeekDays.filter((selectedDay) => selectedDay !== day),
    }));
  };

  const handleProtocolTemplateChange = (e) => {
    const templateId = e.target.value;
    const selectedTemplate = templates.find((template) => String(template.id) === templateId);

    if (!selectedTemplate) {
      setFormData((prev) => ({ ...prev, templateId }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      templateId,
      name: selectedTemplate.name || '',
      description: selectedTemplate.description || '',
      availableWeekDays: selectedTemplate.availableWeekDays || [],
      defaultDurationWeeks: selectedTemplate.defaultDurationWeeks || prev.defaultDurationWeeks,
      genderOrdination: selectedTemplate.genderOrdination || '',
      trainingLevel: selectedTemplate.trainingLevel || '',
    }));
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

  const handleAddProtocolTraining = () => {
    setFormData((prev) => ({
      ...prev,
      trainings: [
        ...prev.trainings,
        { order: prev.trainings.length + 1, templateId: '' },
      ],
    }));
  };

  const handleProtocolTrainingChange = (index, field, value) => {
    setFormData((prev) => {
      const nextTrainings = [...prev.trainings];
      nextTrainings[index] = { ...nextTrainings[index], [field]: value };

      return {
        ...prev,
        trainings: nextTrainings,
      };
    });
  };

  const handleRemoveProtocolTraining = (index) => {
    setFormData((prev) => ({
      ...prev,
      trainings: prev.trainings.filter((_, currentIndex) => currentIndex !== index),
    }));
  };

  const persistPendingProtocolTrainingTemplates = async () => {
    const createdTemplateIdByTempId = {};

    for (const pendingTemplate of pendingProtocolTrainingTemplates) {
      const response = await api.post('/trainer/training-templates', pendingTemplate.data);
      createdTemplateIdByTempId[pendingTemplate.tempId] = response.data?.id;
    }

    return createdTemplateIdByTempId;
  };

  const createProtocolTrainings = async (protocolId, trainings, createdTemplateIdByTempId) => {
    if (!protocolId || trainings.length === 0) {
      return;
    }

    for (const training of trainings) {
      const resolvedTemplateId = createdTemplateIdByTempId[training.templateId] || training.templateId;
      const existingTemplate = trainingTemplates.find((template) => String(template.id) === String(resolvedTemplateId));
      const pendingTemplate = pendingProtocolTrainingTemplates.find((template) => template.tempId === training.templateId);

      await api.post(`/trainer/protocols/${protocolId}/trainings`, {
        name: existingTemplate?.name || pendingTemplate?.data.name || 'Treino',
        description: existingTemplate?.description || pendingTemplate?.data.description || '',
        order: Number(training.order) || 1,
        ...(resolvedTemplateId && { templateId: resolvedTemplateId }),
      });
    }
  };

  const ensureImportedTemplateTrainings = async (protocolId, templateId) => {
    if (!protocolId || !templateId) {
      return 0;
    }

    const [templateResponse, trainingsResponse] = await Promise.all([
      api.get(`/trainer/protocol-templates/${templateId}`),
      api.get(`/trainer/protocols/${protocolId}/trainings`),
    ]);

    const scheduleTemplates = templateResponse.data?.scheduleTemplates || [];
    const protocolTrainings = trainingsResponse.data || [];

    if (scheduleTemplates.length === 0 || protocolTrainings.length > 0) {
      return 0;
    }

    let createdCount = 0;
    for (const [index, scheduleTemplate] of scheduleTemplates.entries()) {
      const trainingTemplate = scheduleTemplate.trainingTemplate || {};
      const trainingTemplateId = trainingTemplate.id || scheduleTemplate.trainingTemplateId;

      await api.post(`/trainer/protocols/${protocolId}/trainings`, {
        templateId: trainingTemplateId,
        name: trainingTemplate.name || `Treino ${index + 1}`,
        description: trainingTemplate.description || '',
        order: scheduleTemplate.order || index + 1,
      });
      createdCount += 1;
    }

    return createdCount;
  };

  // Protocol handlers
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!editingId && !formData.assigneeId) {
      showToast('Selecione um aluno para continuar.', 'error');
      return;
    }

    setLoading(true);

    try {
      if (editingId) {
        const updateData = buildProtocolPayload(formData);
        await api.patch(`/trainer/protocols/${editingId}`, updateData);
        showToast('Rotina atualizada com sucesso!', 'success');
      } else if (formData.templateId) {
        const createdTemplateIdByTempId = await persistPendingProtocolTrainingTemplates();
        const importData = buildProtocolPayload(formData, { includeAssignee: true });
        const response = await api.post('/trainer/protocols/import-from-template', {
          templateId: formData.templateId,
          ...importData,
        });
        const syncedTemplateTrainingsCount = await ensureImportedTemplateTrainings(response.data?.id, formData.templateId);
        await createProtocolTrainings(response.data?.id, formData.trainings, createdTemplateIdByTempId);
        if (syncedTemplateTrainingsCount > 0) {
          showToast('Treinos do modelo sincronizados automaticamente.', 'success');
        }
        showToast('Rotina criada com sucesso!', 'success');
      } else {
        const createdTemplateIdByTempId = await persistPendingProtocolTrainingTemplates();
        const createData = buildProtocolPayload(formData, { includeAssignee: true });
        const response = await api.post('/trainer/protocols', createData);
        await createProtocolTrainings(response.data?.id, formData.trainings, createdTemplateIdByTempId);
        showToast('Rotina criada com sucesso!', 'success');
      }
      await fetchTrainingTemplates();
      fetchProtocols();
      resetForm();
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (protocol) => {
    const protocolEndDate = protocol.endDate || protocol.expirationDate;

    setFormData({
      assigneeId: protocol.assignee?.id || '',
      name: protocol.name || '',
      description: protocol.description || '',
      availableWeekDays: protocol.availableWeekDays || [],
      defaultDurationWeeks: protocol.defaultDurationWeeks || 12,
      genderOrdination: protocol.genderOrdination || '',
      trainingLevel: protocol.trainingLevel || '',
      trainings: [],
      startDate: protocol.startDate?.split('T')[0] || '',
      endDate: protocolEndDate?.split('T')[0] || '',
      templateId: '',
    });
    setSelectedStudent(protocol.assignee || null);
    setStudentSearchQuery('');
    setStudentSearchResults([]);
    setEditingId(protocol.id);
    setActiveTab('protocols');
    setPendingProtocolTrainingTemplates([]);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      message: 'Tem certeza que deseja excluir esta rotina? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/trainer/protocols/${id}`);
          showToast('Rotina excluída com sucesso!', 'success');
          fetchProtocols();
        } catch (error) {
          showToast(error.userMessage || translateError(error), 'error');
        }
      },
    });
  };

  const resetForm = () => {
    setFormData({
      assigneeId: '',
      name: '',
      description: '',
      availableWeekDays: [],
      defaultDurationWeeks: 12,
      genderOrdination: '',
      trainingLevel: '',
      trainings: [],
      startDate: '',
      endDate: '',
      templateId: '',
    });
    setEditingId(null);
    setSelectedStudent(null);
    setStudentSearchQuery('');
    setStudentSearchResults([]);
    setPendingProtocolTrainingTemplates([]);
    setShowForm(false);
  };

  // Template handlers
  const handleTemplateSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingTemplateId) {
        await api.patch(`/trainer/protocol-templates/${editingTemplateId}`, templateFormData);
        showToast('Modelo atualizado com sucesso!', 'success');
      } else {
        await api.post('/trainer/protocol-templates', templateFormData);
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
    setEditingTemplateId(template.id);
    setActiveTab('templates');
    setShowTemplateForm(true);

    try {
      const response = await api.get(`/trainer/protocol-templates/${template.id}`);
      const full = response.data;
      setTemplateFormData({
        name: full.name,
        description: full.description || '',
        availableWeekDays: full.availableWeekDays || [],
        defaultDurationWeeks: full.defaultDurationWeeks || 12,
        genderOrdination: full.genderOrdination || '',
        trainingLevel: full.trainingLevel || '',
        trainings: (full.scheduleTemplates || []).map((st) => ({
          trainingTemplateId: st.trainingTemplate?.id || st.trainingTemplateId,
          weekDay: st.weekDay,
          order: st.order,
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
      availableWeekDays: [],
      defaultDurationWeeks: 12,
      genderOrdination: '',
      trainingLevel: '',
      trainings: [],
    });
    setEditingTemplateId(null);
    setShowTemplateForm(false);
  };

  const openTrainingTemplateModal = (index, context = 'template') => {
    setTrainingTemplateModalContext(context);
    setCreatingForIndex(index);
    setTrainingTemplateFormData({
      name: '',
      description: '',
      category: '',
      bodySegment: '',
      isPublic: false,
    });
    setShowTrainingTemplateModal(true);
  };

  const closeTrainingTemplateModal = () => {
    setShowTrainingTemplateModal(false);
    setCreatingForIndex(null);
    setTrainingTemplateModalContext('template');
  };

  const handleTrainingTemplateCreate = async (e) => {
    e.preventDefault();

    if (trainingTemplateModalContext === 'protocol') {
      const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      setPendingProtocolTrainingTemplates((prev) => [
        ...prev,
        { tempId, data: { ...trainingTemplateFormData } },
      ]);

      setFormData((prev) => ({
        ...prev,
        trainings: [
          ...prev.trainings,
          { templateId: tempId, order: prev.trainings.length + 1 },
        ],
      }));

      closeTrainingTemplateModal();
      return;
    }

    setSavingTrainingTemplate(true);

    try {
      const response = await api.post('/trainer/training-templates', trainingTemplateFormData);
      const created = response.data;
      showToast('Modelo de treino criado com sucesso!', 'success');

      await fetchTrainingTemplates();

      if (creatingForIndex !== null) {
        const updated = [...templateFormData.trainings];
        updated[creatingForIndex] = { ...updated[creatingForIndex], trainingTemplateId: created.id };
        setTemplateFormData({ ...templateFormData, trainings: updated });
      }

      closeTrainingTemplateModal();
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setSavingTrainingTemplate(false);
    }
  };

  const handleAddExistingTraining = () => {
    setTemplateFormData({
      ...templateFormData,
      trainings: [
        ...templateFormData.trainings,
        { trainingTemplateId: '', weekDay: '', order: templateFormData.trainings.length + 1 },
      ],
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'ACTIVE': return 'badge badge-green';
      case 'COMPLETED': return 'badge badge-blue';
      case 'CANCELLED': return 'badge badge-red';
      default: return 'badge badge-gray';
    }
  };

  const handleNewProtocol = () => {
    resetTemplateForm();
    setActiveTab('protocols');
    setShowForm(true);
  };

  const handleNewTemplate = () => {
    resetForm();
    setActiveTab('templates');
    setShowTemplateForm(true);
  };

  const weekdayAbbreviations = {
    monday: 'Seg',
    tuesday: 'Ter',
    wednesday: 'Qua',
    thursday: 'Qui',
    friday: 'Sex',
    saturday: 'Sáb',
    sunday: 'Dom',
  };
  const weekDayOptions = [
    { value: 'monday', label: 'Segunda' },
    { value: 'tuesday', label: 'Terça' },
    { value: 'wednesday', label: 'Quarta' },
    { value: 'thursday', label: 'Quinta' },
    { value: 'friday', label: 'Sexta' },
    { value: 'saturday', label: 'Sábado' },
    { value: 'sunday', label: 'Domingo' },
  ];
  const protocolTrainingTemplateOptions = [
    ...trainingTemplates.map((template) => ({
      value: String(template.id),
      label: template.name,
    })),
    ...pendingProtocolTrainingTemplates.map((template) => ({
      value: template.tempId,
      label: `${template.data.name} (novo)`,
    })),
  ];

  return (
    <div>
      <div className="page-header">
        <h1>Rotinas de Treino</h1>
        <div className="btn-group">
          {!showForm && activeTab === 'protocols' && (
            <button onClick={handleNewProtocol} className="btn-primary">
              + Nova Rotina
            </button>
          )}
          {!showTemplateForm && activeTab === 'templates' && (
            <button onClick={handleNewTemplate} className="btn-primary">
              + Novo Modelo
            </button>
          )}
        </div>
      </div>

      <div className="tabs-container">
        <button
          className={`tab-button ${activeTab === 'protocols' ? 'tab-button--active' : ''}`}
          onClick={() => { setActiveTab('protocols'); resetTemplateForm(); }}
        >
          Rotinas
        </button>
        <button
          className={`tab-button ${activeTab === 'templates' ? 'tab-button--active' : ''}`}
          onClick={() => { setActiveTab('templates'); resetForm(); }}
        >
          Modelos
        </button>
      </div>

      {/* === TAB: Protocolos === */}
      {activeTab === 'protocols' && (
        <>
          {showForm && (
            <div className="card card--mb">
              <h2 className="card-title mb-md">
                {editingId ? 'Editar Rotina' : 'Criar Nova Rotina'}
              </h2>
              <form onSubmit={handleSubmit} className="form">
                {!editingId && (
                  <>
                    <div>
                      <label className="form-label" htmlFor="protocol-assignee-search">Aluno</label>
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
                          </div>
                          <div className="btn-group protocol-student-selected-actions">
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={handleStudentClear}
                            >
                              Trocar aluno
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="protocol-student-search">
                          <input
                            id="protocol-assignee-search"
                            type="text"
                            value={studentSearchQuery}
                            onChange={(e) => setStudentSearchQuery(e.target.value)}
                            className="form-input"
                            placeholder="Busque por nome ou e-mail"
                            autoComplete="off"
                            required={!formData.assigneeId}
                          />
                          {searchingStudents && (
                            <div className="protocol-student-search-status">
                              Buscando alunos...
                            </div>
                          )}
                          {studentSearchResults.length > 0 && (
                            <div className="protocol-student-results">
                              {studentSearchResults.map((student) => (
                                <button
                                  key={student.id}
                                  type="button"
                                  className="protocol-student-result-item"
                                  onClick={() => handleStudentSelect(student)}
                                >
                                  <div className="protocol-student-avatar">
                                    {getStudentAvatarInitial(student)}
                                  </div>
                                  <div className="protocol-student-result-meta">
                                    <span className="protocol-student-name">{getStudentDisplayName(student)}</span>
                                    {getStudentSecondaryInfo(student) && (
                                      <span className="protocol-student-email">{getStudentSecondaryInfo(student)}</span>
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                          {studentSearchQuery.trim().length >= 2 && !searchingStudents && studentSearchResults.length === 0 && (
                            <div className="protocol-student-search-status">
                              Nenhum aluno encontrado.
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="form-label" htmlFor="protocol-template-id">Importar de Modelo (opcional)</label>
                      <select
                        id="protocol-template-id"
                        name="templateId"
                        value={formData.templateId}
                        onChange={handleProtocolTemplateChange}
                        className="form-select"
                      >
                        <option value="">-- Selecione um modelo --</option>
                        {templates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name} ({template.defaultDurationWeeks} semanas)
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {editingId && selectedStudent && (
                  <div>
                    <label className="form-label">Aluno vinculado</label>
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
                      </div>
                    </div>
                  </div>
                )}

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

                <div>
                  <label className="form-label">Dias Disponíveis</label>
                  <div className="weekday-grid">
                    {weekDayOptions.map((day) => (
                      <label key={day.value}>
                        <input
                          type="checkbox"
                          checked={formData.availableWeekDays.includes(day.value)}
                          onChange={(e) => handleProtocolWeekdayChange(day.value, e.target.checked)}
                        />
                        <span className="text-sm">{day.label}</span>
                      </label>
                    ))}
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

                <div>
                  <div className="schedule-template-section-header">
                    <label className="form-label" style={{ margin: 0 }}>Treinos da Rotina</label>
                  </div>

                  {formData.trainings.length === 0 && (
                    <div className="training-actions-empty">
                      <button
                        type="button"
                        className="training-action-card"
                        onClick={handleAddProtocolTraining}
                      >
                        <span className="training-action-card-title">Adicionar treino</span>
                        <span className="training-action-card-description">
                          Selecione um modelo de treino existente.
                        </span>
                      </button>
                      <button
                        type="button"
                        className="training-action-card training-action-card--primary"
                        onClick={() => openTrainingTemplateModal(null, 'protocol')}
                      >
                        <span className="training-action-card-title">Criar treino</span>
                        <span className="training-action-card-description">
                          Abra o modal para criar um novo modelo de treino.
                        </span>
                      </button>
                    </div>
                  )}

                  {formData.trainings.length > 0 && (
                    <>
                      <div className="schedule-template-list">
                        {formData.trainings.map((training, index) => (
                          <div key={index} className="schedule-template-row">
                            <div className="schedule-template-fields">
                              <select
                                aria-label={`Modelo de treino ${index + 1}`}
                                value={training.templateId}
                                onChange={(e) => handleProtocolTrainingChange(index, 'templateId', e.target.value)}
                                className="form-select"
                                required
                              >
                                <option value="">Modelo de treino...</option>
                                {protocolTrainingTemplateOptions.map((templateOption) => (
                                  <option key={templateOption.value} value={templateOption.value}>
                                    {templateOption.label}
                                  </option>
                                ))}
                              </select>

                              <input
                                type="number"
                                min="1"
                                aria-label={`Ordem do treino ${index + 1}`}
                                value={training.order}
                                onChange={(e) => handleProtocolTrainingChange(index, 'order', parseInt(e.target.value, 10) || 1)}
                                className="form-input schedule-template-order"
                                placeholder="Ordem"
                                required
                              />
                            </div>

                            <button
                              type="button"
                              className="btn-delete-sm"
                              onClick={() => handleRemoveProtocolTraining(index)}
                              aria-label="Remover treino da rotina"
                            >
                              Remover
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="schedule-template-actions">
                        <button
                          type="button"
                          className="btn-secondary schedule-template-add-btn"
                          onClick={handleAddProtocolTraining}
                        >
                          + Adicionar treino
                        </button>
                        <button
                          type="button"
                          className="btn-primary schedule-template-add-btn"
                          onClick={() => openTrainingTemplateModal(null, 'protocol')}
                        >
                          + Criar treino
                        </button>
                      </div>
                    </>
                  )}
                </div>

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

                <div className="btn-group">
                  <button type="submit" disabled={loading} className="btn-primary">
                    {loading ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button type="button" onClick={resetForm} className="btn-secondary">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {!showForm && <div className="grid-cards">
            {protocols.map((protocol) => (
              <Link
                key={protocol.id}
                to={`/trainer/protocols/${protocol.id}`}
                className="card-link"
              >
                <div className="card-header-start">
                  <h3 className="card-subtitle">
                    {protocol.assignee?.name || protocol.assignee?.email}
                  </h3>
                  <span className={getStatusBadgeClass(protocol.status)}>
                    {protocol.status}
                  </span>
                </div>
                <div className="protocol-meta">
                  <div>Início: {new Date(protocol.startDate).toLocaleDateString('pt-BR')}</div>
                  <div>Término: {new Date(protocol.endDate).toLocaleDateString('pt-BR')}</div>
                </div>
                <div className="btn-group">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleEdit(protocol);
                    }}
                    className="btn-edit"
                  >
                    Editar
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete(protocol.id);
                    }}
                    className="btn-delete"
                  >
                    Excluir
                  </button>
                </div>
              </Link>
            ))}
          </div>}

          {protocols.length === 0 && !showForm && (
            <div className="empty-state">
              <p className="empty-state-title">Nenhuma rotina de treino ainda</p>
              <p>Crie sua primeira rotina para atribuir a um aluno</p>
            </div>
          )}
        </>
      )}

      {/* === TAB: Modelos === */}
      {activeTab === 'templates' && (
        <>
          {!showTemplateForm && (
            <div className="alert alert-info" style={{ marginBottom: 'var(--spacing-md)' }}>
              <strong>O que é um modelo?</strong> Um modelo é uma estrutura de rotina pré-definida — com treinos, dias da semana e duração — que você pode reutilizar para criar rotinas rapidamente sem precisar montar tudo do zero.
            </div>
          )}

          {showTemplateForm && (
            <div className="card card--mb">
              <h2 className="card-title mb-md">
                {editingTemplateId ? 'Editar Modelo' : 'Criar Novo Modelo'}
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

                <div>
                  <label className="form-label">Dias Disponíveis</label>
                  <div className="weekday-grid">
                    {weekDayOptions.map(day => (
                      <label key={day.value}>
                        <input
                          type="checkbox"
                          checked={templateFormData.availableWeekDays.includes(day.value)}
                          onChange={(e) => {
                            const newDays = e.target.checked
                              ? [...templateFormData.availableWeekDays, day.value]
                              : templateFormData.availableWeekDays.filter(d => d !== day.value);
                            setTemplateFormData({ ...templateFormData, availableWeekDays: newDays });
                          }}
                        />
                        <span className="text-sm">{day.label}</span>
                      </label>
                    ))}
                  </div>
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
                    onChange={(e) => setTemplateFormData({ ...templateFormData, defaultDurationWeeks: parseInt(e.target.value) })}
                    className="form-input"
                    required
                  />
                </div>

                <div>
                  <div className="schedule-template-section-header">
                    <label className="form-label" style={{ margin: 0 }}>Treinos do Modelo</label>
                    {templateFormData.trainings.length > 0 && (
                      <button
                        type="button"
                        className="btn-primary schedule-template-add-btn"
                        onClick={() => openTrainingTemplateModal(null)}
                        aria-label="Criar novo modelo de treino"
                      >
                        + Criar novo modelo de treino
                      </button>
                    )}
                  </div>

                  {templateFormData.trainings.length === 0 && (
                    <div className="training-actions-empty">
                      <button
                        type="button"
                        className="training-action-card"
                        onClick={handleAddExistingTraining}
                      >
                        <span className="training-action-card-title">Selecionar existente</span>
                        <span className="training-action-card-description">
                          Escolha um modelo de treino ja cadastrado.
                        </span>
                      </button>
                      <button
                        type="button"
                        className="training-action-card training-action-card--primary"
                        onClick={() => openTrainingTemplateModal(null)}
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
                      <div className="schedule-template-list">
                        {templateFormData.trainings.map((training, index) => {
                          const invalidDay = training.weekDay && !templateFormData.availableWeekDays.includes(training.weekDay);
                          return (
                            <div key={index} className="schedule-template-row">
                              <div className="schedule-template-fields">
                                <select
                                  value={training.trainingTemplateId}
                                  onChange={(e) => {
                                    const updated = [...templateFormData.trainings];
                                    updated[index] = { ...updated[index], trainingTemplateId: e.target.value };
                                    setTemplateFormData({ ...templateFormData, trainings: updated });
                                  }}
                                  className="form-select"
                                  required
                                >
                                  <option value="">Modelo de treino...</option>
                                  {trainingTemplates.map((tt) => (
                                    <option key={tt.id} value={tt.id}>{tt.name}</option>
                                  ))}
                                </select>

                                <div>
                                  <select
                                    value={training.weekDay}
                                    onChange={(e) => {
                                      const updated = [...templateFormData.trainings];
                                      updated[index] = { ...updated[index], weekDay: e.target.value };
                                      setTemplateFormData({ ...templateFormData, trainings: updated });
                                    }}
                                    className={`form-select${invalidDay ? ' form-select--error' : ''}`}
                                    required
                                  >
                                    <option value="">Dia da semana...</option>
                                    {[
                                      { value: 'monday', label: 'Segunda' },
                                      { value: 'tuesday', label: 'Terça' },
                                      { value: 'wednesday', label: 'Quarta' },
                                      { value: 'thursday', label: 'Quinta' },
                                      { value: 'friday', label: 'Sexta' },
                                      { value: 'saturday', label: 'Sábado' },
                                      { value: 'sunday', label: 'Domingo' },
                                    ].map((day) => (
                                      <option
                                        key={day.value}
                                        value={day.value}
                                        disabled={!templateFormData.availableWeekDays.includes(day.value)}
                                      >
                                        {day.label}
                                        {!templateFormData.availableWeekDays.includes(day.value) ? ' (indisponível)' : ''}
                                      </option>
                                    ))}
                                  </select>
                                  {invalidDay && (
                                    <span className="schedule-template-error">
                                      Este dia não está nos dias disponíveis do modelo.
                                    </span>
                                  )}
                                </div>

                                <input
                                  type="number"
                                  min="1"
                                  value={training.order}
                                  onChange={(e) => {
                                    const updated = [...templateFormData.trainings];
                                    updated[index] = { ...updated[index], order: parseInt(e.target.value) || 1 };
                                    setTemplateFormData({ ...templateFormData, trainings: updated });
                                  }}
                                  className="form-input schedule-template-order"
                                  placeholder="Ordem"
                                  required
                                />
                              </div>

                              <button
                                type="button"
                                className="btn-delete-sm"
                                onClick={() => {
                                  const updated = templateFormData.trainings.filter((_, i) => i !== index);
                                  setTemplateFormData({ ...templateFormData, trainings: updated });
                                }}
                                aria-label="Remover treino"
                              >
                                Remover
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <div className="schedule-template-actions">
                        <button
                          type="button"
                          className="btn-secondary schedule-template-add-btn"
                          onClick={handleAddExistingTraining}
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

          {!showTemplateForm && <div className="grid-cards">
            {templates.map((template) => (
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
                    <strong>Treinos:</strong> {template.scheduleTemplatesCount || 0}
                  </div>
                  {template.availableWeekDays && template.availableWeekDays.length > 0 && (
                    <div className="text-sm text-light">
                      <strong>Dias:</strong> {template.availableWeekDays.map(day =>
                        weekdayAbbreviations[day] || day
                      ).join(', ')}
                    </div>
                  )}
                  {template.genderOrdination && (
                    <div className="text-sm text-light">
                      <strong>Classificação:</strong> {{
                        male: 'Masculino',
                        female: 'Feminino',
                        other: 'Outro'
                      }[template.genderOrdination] || template.genderOrdination}
                    </div>
                  )}
                  {template.trainingLevel && (
                    <div className="text-sm text-light">
                      <strong>Nível:</strong> {{
                        beginner: 'Iniciante',
                        intermediate: 'Intermediário',
                        advanced: 'Avançado',
                        athlete: 'Atleta'
                      }[template.trainingLevel] || template.trainingLevel}
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
            ))}
          </div>}

          {templates.length === 0 && !showTemplateForm && (
            <div className="empty-state">
              <p className="empty-state-title">Nenhum modelo de rotina ainda</p>
              <p>Crie seu primeiro modelo e use-o como base ao atribuir rotinas aos alunos</p>
            </div>
          )}
        </>
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

      {showTrainingTemplateModal && (
        <div className="overlay" onClick={closeTrainingTemplateModal}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-header">
              <h2 className="bottom-sheet-title">
                {trainingTemplateModalContext === 'protocol' ? 'Criar Treino' : 'Criar Modelo de Treino'}
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
              <form onSubmit={handleTrainingTemplateCreate} className="form">
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

                <div className="btn-group">
                  <button type="submit" disabled={savingTrainingTemplate} className="btn-primary">
                    {trainingTemplateModalContext === 'protocol'
                      ? 'Adicionar à rotina'
                      : (savingTrainingTemplate ? 'Salvando...' : 'Criar Modelo de Treino')}
                  </button>
                  <button type="button" onClick={closeTrainingTemplateModal} className="btn-secondary">
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

export default TrainingProtocols;
