import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import DateInput from '../../components/DateInput';

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

  const weekDayOptions = [
    { value: 'monday', label: 'Segunda' },
    { value: 'tuesday', label: 'Terça' },
    { value: 'wednesday', label: 'Quarta' },
    { value: 'thursday', label: 'Quinta' },
    { value: 'friday', label: 'Sexta' },
    { value: 'saturday', label: 'Sábado' },
    { value: 'sunday', label: 'Domingo' },
  ];

  useEffect(() => {
    fetchTemplates();
    fetchTrainingTemplates();
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

  const handleProtocolWeekdayChange = (day, checked) => {
    setFormData((prev) => ({
      ...prev,
      availableWeekDays: checked
        ? [...prev.availableWeekDays, day]
        : prev.availableWeekDays.filter((selectedDay) => selectedDay !== day),
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
      availableWeekDays: (selectedTemplate.availableWeekDays || []).map((day) => day.toLowerCase()),
      defaultDurationWeeks: selectedTemplate.defaultDurationWeeks || prev.defaultDurationWeeks,
      genderOrdination: selectedTemplate.genderOrdination?.toLowerCase() || '',
      trainingLevel: selectedTemplate.trainingLevel?.toLowerCase() || '',
    }));

    try {
      const response = await api.get(`/trainer/protocol-templates/${templateId}`);
      const scheduleTemplates = response.data?.scheduleTemplates || [];
      const templateTrainings = scheduleTemplates.map((st, index) => {
        const tt = st.trainingTemplate || {};
        return {
          name: tt.name || '',
          description: tt.description || '',
          category: tt.category || '',
          bodySegment: tt.bodySegment || '',
          order: st.order || index + 1,
          trainingTemplateId: tt.id || st.trainingTemplateId || '',
          fromTemplate: true,
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

  const handleAddProtocolTraining = () => {
    setFormData((prev) => ({
      ...prev,
      trainings: [
        ...prev.trainings,
        { name: '', description: '', category: '', bodySegment: '', order: prev.trainings.length + 1, trainingTemplateId: '' },
      ],
    }));
  };

  const handleProtocolTrainingChange = (index, field, value) => {
    setFormData((prev) => {
      const nextTrainings = [...prev.trainings];
      nextTrainings[index] = { ...nextTrainings[index], [field]: value };
      return { ...prev, trainings: nextTrainings };
    });
  };

  const handleTrainingTemplateSelect = (index, templateId) => {
    const template = trainingTemplates.find((t) => String(t.id) === templateId);
    setFormData((prev) => {
      const nextTrainings = [...prev.trainings];
      nextTrainings[index] = {
        ...nextTrainings[index],
        trainingTemplateId: templateId,
        name: template?.name || nextTrainings[index].name,
        description: template?.description || nextTrainings[index].description,
        category: template?.category || nextTrainings[index].category,
        bodySegment: template?.bodySegment || nextTrainings[index].bodySegment,
      };
      return { ...prev, trainings: nextTrainings };
    });
  };

  const handleRemoveProtocolTraining = (index) => {
    setFormData((prev) => ({
      ...prev,
      trainings: prev.trainings.filter((_, currentIndex) => currentIndex !== index),
    }));
  };

  const createProtocolTrainings = async (protocolId, trainings) => {
    if (!protocolId || trainings.length === 0) return;

    for (const training of trainings) {
      await api.post(`/trainer/protocols/${protocolId}/trainings`, {
        name: training.name || 'Treino',
        description: training.description || '',
        category: training.category,
        order: Number(training.order) || 1,
        ...(training.bodySegment && { bodySegment: training.bodySegment }),
        ...(training.trainingTemplateId && { trainingTemplateId: training.trainingTemplateId }),
      });
    }
  };

  const buildProtocolPayload = (data) => ({
    assigneeId: data.assigneeId,
    name: data.name,
    description: data.description,
    availableWeekDays: data.availableWeekDays,
    startDate: data.startDate,
    expirationDate: data.endDate,
    ...(data.genderOrdination && { genderOrdination: data.genderOrdination }),
    ...(data.trainingLevel && { trainingLevel: data.trainingLevel }),
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
              {formData.trainings.length > 0 && (
                <button
                  type="button"
                  className="btn-schedule-sm"
                  onClick={handleAddProtocolTraining}
                >
                  + Adicionar treino
                </button>
              )}
            </div>

            {formData.trainings.length === 0 && (
              <div className="training-actions-empty" style={{ gridTemplateColumns: '1fr' }}>
                <p style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--font-body-small-size)', margin: 0 }}>
                  Nenhum treino adicionado. Os treinos definem o conteúdo de cada dia de treino da rotina.
                </p>
                <button
                  type="button"
                  className="btn-schedule-sm"
                  onClick={handleAddProtocolTraining}
                  style={{ alignSelf: 'flex-start' }}
                >
                  + Adicionar treino
                </button>
              </div>
            )}

            {formData.trainings.length > 0 && (
              <div className="schedule-template-list">
                {formData.trainings.map((training, index) => (
                  <div key={index} className="card">
                    <div className="card-header" style={{ marginBottom: 'var(--spacing-md)' }}>
                      <h3 className="card-subtitle">Treino {index + 1}</h3>
                      <button
                        type="button"
                        className="btn-delete-sm"
                        onClick={() => handleRemoveProtocolTraining(index)}
                        aria-label={`Remover treino ${index + 1}`}
                      >
                        Remover
                      </button>
                    </div>

                    <div className="form">
                      {trainingTemplates.length > 0 && (
                        <div>
                          <label className="form-label" htmlFor={`training-template-${index}`}>
                            Modelo de treino <span style={{ fontWeight: 400, color: 'var(--color-on-surface-variant)' }}>(opcional — pré-preenche os campos)</span>
                          </label>
                          <select
                            id={`training-template-${index}`}
                            aria-label={`Modelo de treino para treino ${index + 1}`}
                            value={training.trainingTemplateId || ''}
                            onChange={(e) => handleTrainingTemplateSelect(index, e.target.value)}
                            className="form-select"
                          >
                            <option value="">-- Nenhum --</option>
                            {trainingTemplates.map((t) => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="grid-responsive-2col">
                        <div>
                          <label className="form-label" htmlFor={`training-name-${index}`}>Nome</label>
                          <input
                            id={`training-name-${index}`}
                            type="text"
                            aria-label={`Nome do treino ${index + 1}`}
                            value={training.name}
                            onChange={(e) => handleProtocolTrainingChange(index, 'name', e.target.value)}
                            className="form-input"
                            placeholder="Ex: Treino A — Peito e Tríceps"
                            required
                          />
                        </div>

                        <div>
                          <label className="form-label" htmlFor={`training-order-${index}`}>Ordem</label>
                          <input
                            id={`training-order-${index}`}
                            type="number"
                            min="1"
                            aria-label={`Ordem do treino ${index + 1}`}
                            value={training.order}
                            onChange={(e) => handleProtocolTrainingChange(index, 'order', parseInt(e.target.value, 10) || 1)}
                            className="form-input"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid-responsive-2col">
                        <div>
                          <label className="form-label" htmlFor={`training-category-${index}`}>Categoria</label>
                          <select
                            id={`training-category-${index}`}
                            aria-label={`Categoria do treino ${index + 1}`}
                            value={training.category}
                            onChange={(e) => handleProtocolTrainingChange(index, 'category', e.target.value)}
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
                          <label className="form-label" htmlFor={`training-bodySegment-${index}`}>Segmento Corporal</label>
                          <select
                            id={`training-bodySegment-${index}`}
                            aria-label={`Segmento corporal do treino ${index + 1}`}
                            value={training.bodySegment || ''}
                            onChange={(e) => handleProtocolTrainingChange(index, 'bodySegment', e.target.value)}
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
                    </div>
                  </div>
                ))}
              </div>
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
    </div>
  );
};

export default CreateProtocol;
