import { useState, useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';

const TrainingTemplates = () => {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    bodySegment: '',
    isPublic: false,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const response = await api.get('/trainer/training-templates');
      setTemplates(response.data);
    } catch (error) {
      console.error('Failed to fetch training templates:', error);
    } finally {
      setTemplatesLoading(false);
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
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template) => {
    setFormData({
      name: template.name,
      description: template.description || '',
      category: template.category || '',
      bodySegment: template.bodySegment || '',
      isPublic: template.isPublic || false,
    });
    setEditingId(template.id);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      message: 'Tem certeza que deseja excluir este modelo de treino? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/trainer/training-templates/${id}`);
          showToast('Modelo de treino excluído com sucesso!', 'success');
          fetchTemplates();
        } catch (error) {
          showToast(error.userMessage || translateError(error), 'error');
        }
      },
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      bodySegment: '',
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

            <div className="grid-responsive-2col">
              <div>
                <label className="form-label">Categoria</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="form-select"
                  required
                >
                  <option value="">Selecione...</option>
                  <option value="strength">Força</option>
                  <option value="cardio">Cardio</option>
                </select>
              </div>

              <div>
                <label className="form-label">Segmento Corporal</label>
                <select
                  value={formData.bodySegment}
                  onChange={(e) => setFormData({ ...formData, bodySegment: e.target.value })}
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

      {templatesLoading && !showForm && (
        <div className="loading-screen">
          <span className="loading-text">Carregando...</span>
        </div>
      )}

      {!showForm && !templatesLoading && <div className="grid-cards">
        {templates.map((template) => (
          <div key={template.id} className="card">
            <div className="card-header-start">
              <h3 className="card-subtitle">{template.name}</h3>
              {template.isPublic && (
                <span className="badge badge-green">Público</span>
              )}
            </div>
            {template.description && (
              <p className="card-description mb-md">{template.description}</p>
            )}
            <div className="info-list mb-md" style={{ paddingTop: 'var(--spacing-sm)', borderTop: '1px solid var(--color-outline-variant)' }}>
              {template.category && (
                <div className="text-sm text-light">
                  <strong>Categoria:</strong> {{ strength: 'Força', cardio: 'Cardio' }[template.category] || template.category}
                </div>
              )}
              {template.bodySegment && (
                <div className="text-sm text-light">
                  <strong>Segmento:</strong> {{ upper: 'Superior', lower: 'Inferior', full_body: 'Corpo Inteiro' }[template.bodySegment] || template.bodySegment}
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
      </div>}

      {!showForm && !templatesLoading && templates.length === 0 && (
        <>
          <div className="alert alert-info" style={{ marginBottom: 'var(--spacing-md)' }}>
            <strong>O que é um modelo de treino?</strong> Um modelo de treino é uma ficha pré-configurada
            com categoria e segmento corporal que pode ser reutilizada em diferentes rotinas, agilizando
            a montagem dos treinos dos seus alunos.
          </div>
          <div className="empty-state">
            <p className="empty-state-title">Nenhum modelo de treino ainda</p>
            <p>Crie seu primeiro modelo de treino para começar</p>
          </div>
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

export default TrainingTemplates;
