import { useState, useEffect } from 'react';
import api from '../../api/axios';

const ProtocolTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    availableWeekDays: [],
    defaultDurationWeeks: 12,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/trainer/protocol-templates');
      setTemplates(response.data);
    } catch (error) {
      console.error('Failed to fetch protocol templates:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      if (editingId) {
        await api.patch(`/trainer/protocol-templates/${editingId}`, formData);
        setMessage({ type: 'success', text: 'Modelo atualizado com sucesso!' });
      } else {
        await api.post('/trainer/protocol-templates', formData);
        setMessage({ type: 'success', text: 'Modelo criado com sucesso!' });
      }
      await fetchTemplates(); // Force refresh
      resetForm();
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Falha ao salvar modelo',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template) => {
    setFormData({
      name: template.name,
      description: template.description || '',
      availableWeekDays: template.availableWeekDays || [],
      defaultDurationWeeks: template.defaultDurationWeeks || 12,
    });
    setEditingId(template.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este modelo?')) return;

    try {
      await api.delete(`/trainer/protocol-templates/${id}`);
      setMessage({ type: 'success', text: 'Modelo excluído com sucesso!' });
      await fetchTemplates(); // Force refresh
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 3000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Falha ao excluir modelo',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      availableWeekDays: [],
      defaultDurationWeeks: 12,
    });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Modelos de Protocolo</h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Novo Modelo
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
            {editingId ? 'Editar Modelo' : 'Criar Novo Modelo'}
          </h2>
          <form onSubmit={handleSubmit} className="form">
            <div>
              <label className="form-label">Nome</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="form-label">Descrição</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="form-textarea"
              />
            </div>

            <div>
              <label className="form-label">Dias Disponíveis</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem', marginTop: '0.5rem' }}>
                {[
                  { value: 'monday', label: 'Segunda' },
                  { value: 'tuesday', label: 'Terça' },
                  { value: 'wednesday', label: 'Quarta' },
                  { value: 'thursday', label: 'Quinta' },
                  { value: 'friday', label: 'Sexta' },
                  { value: 'saturday', label: 'Sábado' },
                  { value: 'sunday', label: 'Domingo' },
                ].map(day => (
                  <label key={day.value} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.availableWeekDays.includes(day.value)}
                      onChange={(e) => {
                        const newDays = e.target.checked
                          ? [...formData.availableWeekDays, day.value]
                          : formData.availableWeekDays.filter(d => d !== day.value);
                        setFormData({ ...formData, availableWeekDays: newDays });
                      }}
                      style={{ cursor: 'pointer' }}
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
                value={formData.defaultDurationWeeks}
                onChange={(e) => setFormData({ ...formData, defaultDurationWeeks: parseInt(e.target.value) })}
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
        {templates.map((template) => (
          <div key={template.id} className="card">
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <h3 className="card-subtitle" style={{ marginBottom: 'var(--spacing-xs)' }}>
                {template.name}
              </h3>
              {template.description && (
                <p className="card-description" style={{ 
                  marginBottom: 'var(--spacing-md)',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {template.description}
                </p>
              )}
            </div>
            
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: 'var(--spacing-xs)',
              marginBottom: 'var(--spacing-md)',
              paddingTop: 'var(--spacing-sm)',
              borderTop: '1px solid var(--color-outline-variant)'
            }}>
              <div className="text-sm text-light">
                <strong>Duração:</strong> {template.defaultDurationWeeks} semanas
              </div>
              {template.availableWeekDays && template.availableWeekDays.length > 0 && (
                <div className="text-sm text-light">
                  <strong>Dias:</strong> {template.availableWeekDays.map(day => {
                    const dias = {
                      monday: 'Seg',
                      tuesday: 'Ter',
                      wednesday: 'Qua',
                      thursday: 'Qui',
                      friday: 'Sex',
                      saturday: 'Sáb',
                      sunday: 'Dom'
                    };
                    return dias[day] || day;
                  }).join(', ')}
                </div>
              )}
            </div>
            
            <div className="btn-group">
              <button onClick={() => handleEdit(template)} className="btn-edit">
                Editar
              </button>
              <button onClick={() => handleDelete(template.id)} className="btn-delete">
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      {templates.length === 0 && !showForm && (
        <div className="empty-state">
          <p className="empty-state-title">Nenhum modelo de protocolo ainda</p>
          <p>Crie seu primeiro modelo para começar</p>
        </div>
      )}
    </div>
  );
};

export default ProtocolTemplates;
