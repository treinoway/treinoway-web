import { useState, useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';

const ProtocolTemplates = () => {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    availableWeekDays: [],
    defaultDurationWeeks: 12,
    genderOrdination: '',
    trainingLevel: '',
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

    try {
      if (editingId) {
        await api.patch(`/trainer/protocol-templates/${editingId}`, formData);
        showToast('Modelo atualizado com sucesso!', 'success');
      } else {
        await api.post('/trainer/protocol-templates', formData);
        showToast('Modelo criado com sucesso!', 'success');
      }
      await fetchTemplates();
      resetForm();
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
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
      genderOrdination: template.genderOrdination || '',
      trainingLevel: template.trainingLevel || '',
    });
    setEditingId(template.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este modelo?')) return;

    try {
      await api.delete(`/trainer/protocol-templates/${id}`);
      showToast('Modelo excluído com sucesso!', 'success');
      await fetchTemplates();
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      availableWeekDays: [],
      defaultDurationWeeks: 12,
      genderOrdination: '',
      trainingLevel: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Modelos de Rotina</h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Novo Modelo
          </button>
        )}
      </div>

      {showForm && (
        <div className="card card--mb">
          <h2 className="card-title mb-md">
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
                      checked={formData.availableWeekDays.includes(day.value)}
                      onChange={(e) => {
                        const newDays = e.target.checked
                          ? [...formData.availableWeekDays, day.value]
                          : formData.availableWeekDays.filter(d => d !== day.value);
                        setFormData({ ...formData, availableWeekDays: newDays });
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
                  value={formData.genderOrdination}
                  onChange={(e) => setFormData({ ...formData, genderOrdination: e.target.value })}
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
                  value={formData.trainingLevel}
                  onChange={(e) => setFormData({ ...formData, trainingLevel: e.target.value })}
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
          <p className="empty-state-title">Nenhum modelo de rotina ainda</p>
          <p>Crie seu primeiro modelo para começar</p>
        </div>
      )}
    </div>
  );
};

export default ProtocolTemplates;
