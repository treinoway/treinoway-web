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

  // Template form state
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    description: '',
    availableWeekDays: [],
    defaultDurationWeeks: 12,
  });

  useEffect(() => {
    fetchProtocols();
    fetchTemplates();
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

  // Protocol handlers
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingId) {
        const { assigneeEmail: _assigneeEmail, templateId: _templateId, ...updateData } = formData;
        await api.patch(`/trainer/protocols/${editingId}`, updateData);
        showToast('Protocolo atualizado com sucesso!', 'success');
      } else {
        await api.post('/trainer/protocols', formData);
        showToast('Protocolo criado com sucesso!', 'success');
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

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este protocolo?')) return;

    try {
      await api.delete(`/trainer/protocols/${id}`);
      showToast('Protocolo excluído com sucesso!', 'success');
      fetchProtocols();
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    }
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

  const handleTemplateEdit = (template) => {
    setTemplateFormData({
      name: template.name,
      description: template.description || '',
      availableWeekDays: template.availableWeekDays || [],
      defaultDurationWeeks: template.defaultDurationWeeks || 12,
    });
    setEditingTemplateId(template.id);
    setActiveTab('templates');
    setShowTemplateForm(true);
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
        <h1>Protocolos de Treino</h1>
        <div className="btn-group">
          {!showForm && activeTab === 'protocols' && (
            <button onClick={handleNewProtocol} className="btn-primary">
              + Novo Protocolo
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
          onClick={() => setActiveTab('protocols')}
        >
          Protocolos
        </button>
        <button
          className={`tab-button ${activeTab === 'templates' ? 'tab-button--active' : ''}`}
          onClick={() => setActiveTab('templates')}
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
                {editingId ? 'Editar Protocolo' : 'Criar Novo Protocolo'}
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

          <div className="grid-cards">
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
          </div>

          {protocols.length === 0 && !showForm && (
            <div className="empty-state">
              <p className="empty-state-title">Nenhum protocolo de treino ainda</p>
              <p>Crie seu primeiro protocolo para atribuir a um aluno</p>
            </div>
          )}
        </>
      )}

      {/* === TAB: Modelos === */}
      {activeTab === 'templates' && (
        <>
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

          <div className="grid-cards">
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
                  {template.availableWeekDays && template.availableWeekDays.length > 0 && (
                    <div className="text-sm text-light">
                      <strong>Dias:</strong> {template.availableWeekDays.map(day =>
                        weekdayAbbreviations[day] || day
                      ).join(', ')}
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
          </div>

          {templates.length === 0 && !showTemplateForm && (
            <div className="empty-state">
              <p className="empty-state-title">Nenhum modelo de protocolo ainda</p>
              <p>Crie seu primeiro modelo para começar</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TrainingProtocols;
