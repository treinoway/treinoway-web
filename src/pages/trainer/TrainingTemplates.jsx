import { useState, useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { getErrorMessage } from '../../utils/errorMessages';
import api from '../../api/axios';

const TrainingTemplates = () => {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: false,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/trainer/training-templates');
      setTemplates(response.data);
    } catch (error) {
      console.error('Failed to fetch training templates:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingId) {
        await api.patch(`/trainer/training-templates/${editingId}`, formData);
        showToast('Modelo de treino atualizado com sucesso!', 'success');
      } else {
        await api.post('/trainer/training-templates', formData);
        showToast('Modelo de treino criado com sucesso!', 'success');
      }
      fetchTemplates();
      resetForm();
    } catch (error) {
      showToast(error.userMessage || getErrorMessage(error, 'Falha ao salvar modelo de treino.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template) => {
    setFormData({
      name: template.name,
      description: template.description || '',
      isPublic: template.isPublic || false,
    });
    setEditingId(template.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este modelo de treino?')) return;

    try {
      await api.delete(`/trainer/training-templates/${id}`);
      showToast('Modelo de treino excluído com sucesso!', 'success');
      fetchTemplates();
    } catch (error) {
      showToast(error.userMessage || getErrorMessage(error, 'Falha ao excluir modelo de treino.'), 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      isPublic: false,
    });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Modelos de Treino</h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Novo Modelo de Treino
          </button>
        )}
      </div>

      {showForm && (
        <div className="card card--mb">
          <h2 className="card-title mb-md">
            {editingId ? 'Editar Modelo de Treino' : 'Criar Novo Modelo de Treino'}
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

            <div className="form-checkbox-row">
              <input
                type="checkbox"
                id="isPublic"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
              />
              <label htmlFor="isPublic" className="form-label mb-0">
                Tornar este modelo público
              </label>
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
            <div className="card-header-start">
              <h3 className="card-subtitle">{template.name}</h3>
              {template.isPublic && (
                <span className="badge badge-green">Público</span>
              )}
            </div>
            <p className="card-description mb-md">{template.description}</p>
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
          <p className="empty-state-title">Nenhum modelo de treino ainda</p>
          <p>Crie seu primeiro modelo de treino para começar</p>
        </div>
      )}
    </div>
  );
};

export default TrainingTemplates;
