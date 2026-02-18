import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

const TrainingProtocols = () => {
  const [protocols, setProtocols] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    assigneeEmail: '',
    startDate: '',
    endDate: '',
    templateId: '',
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (editingId) {
        const { assigneeEmail, templateId, ...updateData } = formData;
        await api.patch(`/trainer/protocols/${editingId}`, updateData);
        setMessage({ type: 'success', text: 'Protocolo atualizado com sucesso!' });
      } else {
        await api.post('/trainer/protocols', formData);
        setMessage({ type: 'success', text: 'Protocolo criado com sucesso!' });
      }
      fetchProtocols();
      resetForm();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Falha ao salvar protocolo',
      });
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
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este protocolo?')) return;

    try {
      await api.delete(`/trainer/protocols/${id}`);
      setMessage({ type: 'success', text: 'Protocolo excluido com sucesso!' });
      fetchProtocols();
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Falha ao excluir protocolo',
      });
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

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'ACTIVE': return 'badge badge-green';
      case 'COMPLETED': return 'badge badge-blue';
      case 'CANCELLED': return 'badge badge-red';
      default: return 'badge badge-gray';
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Protocolos de Treino</h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Novo Protocolo
          </button>
        )}
      </div>

      {message.text && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <div className="card card--mb">
          <h2 className="card-title" style={{ marginBottom: '1rem' }}>
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
                        {template.name} ({template.durationWeeks} semanas)
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="form-label">Data de Inicio</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="form-label">Data de Termino</label>
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
              <div>Inicio: {new Date(protocol.startDate).toLocaleDateString('pt-BR')}</div>
              <div>Termino: {new Date(protocol.endDate).toLocaleDateString('pt-BR')}</div>
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
    </div>
  );
};

export default TrainingProtocols;
