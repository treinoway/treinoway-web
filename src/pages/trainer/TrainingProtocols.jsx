import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';

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
    assigneeEmail: '',
    startDate: '',
    endDate: '',
    templateId: '',
  });

  const [confirmDialog, setConfirmDialog] = useState(null);

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

  useEffect(() => {
    fetchProtocols();
    fetchTemplates();
    fetchTrainingTemplates();
  }, []);

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

  // Protocol handlers
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingId) {
        const { assigneeEmail: _assigneeEmail, templateId: _templateId, ...updateData } = formData;
        await api.patch(`/trainer/protocols/${editingId}`, updateData);
        showToast('Rotina atualizada com sucesso!', 'success');
      } else if (formData.templateId) {
        await api.post('/trainer/protocols/import-from-template', {
          templateId: formData.templateId,
          assigneeEmail: formData.assigneeEmail,
          startDate: formData.startDate,
          expirationDate: formData.endDate,
        });
        showToast('Rotina criada com sucesso!', 'success');
      } else {
        const { templateId: _templateId, ...createData } = formData;
        await api.post('/trainer/protocols', createData);
        showToast('Rotina criada com sucesso!', 'success');
      }
      fetchProtocols();
      resetForm();
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (protocol) => {
    setFormData({
      assigneeEmail: protocol.assignee?.email || '',
      startDate: protocol.startDate?.split('T')[0] || '',
      endDate: protocol.endDate?.split('T')[0] || '',
      templateId: '',
    });
    setEditingId(protocol.id);
    setActiveTab('protocols');
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
      assigneeEmail: '',
      startDate: '',
      endDate: '',
      templateId: '',
    });
    setEditingId(null);
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

  const handleTemplateDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este modelo?')) return;

    try {
      await api.delete(`/trainer/protocol-templates/${id}`);
      showToast('Modelo excluído com sucesso!', 'success');
      await fetchTemplates();
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    }
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
                      <label className="form-label">E-mail do Aluno</label>
                      <input
                        type="email"
                        value={formData.assigneeEmail}
                        onChange={(e) => setFormData({ ...formData, assigneeEmail: e.target.value })}
                        className="form-input"
                        required
                      />
                    </div>

                    <div>
                      <label className="form-label">Importar de Modelo (opcional)</label>
                      <select
                        value={formData.templateId}
                        onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
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

                <div>
                  <label className="form-label">Data de Início</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Data de Término</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
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
                    {[
                      { value: 'monday', label: 'Segunda' },
                      { value: 'tuesday', label: 'Terça' },
                      { value: 'wednesday', label: 'Quarta' },
                      { value: 'thursday', label: 'Quinta' },
                      { value: 'friday', label: 'Sexta' },
                      { value: 'saturday', label: 'Sábado' },
                      { value: 'sunday', label: 'Domingo' },
                    ].map(day => (
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
                    <button
                      type="button"
                      className="btn-edit-sm"
                      onClick={() =>
                        setTemplateFormData({
                          ...templateFormData,
                          trainings: [
                            ...templateFormData.trainings,
                            { trainingTemplateId: '', weekDay: '', order: templateFormData.trainings.length + 1 },
                          ],
                        })
                      }
                    >
                      + Adicionar
                    </button>
                  </div>

                  {templateFormData.trainings.length === 0 && (
                    <p className="text-sm text-light" style={{ marginTop: 'var(--spacing-xs)' }}>
                      Nenhum treino adicionado. Clique em &quot;+ Adicionar&quot; para incluir.
                    </p>
                  )}

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
    </div>
  );
};

export default TrainingProtocols;
