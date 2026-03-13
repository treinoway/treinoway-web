import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import { TemplateRowMenu } from './TrainingTemplates';

const TrainerAnamneses = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [anamneses, setAnamneses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingAnamnesis, setEditingAnamnesis] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const [formData, setFormData] = useState({ title: '', description: '' });

  const fetchAnamneses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/trainer/anamneses');
      setAnamneses(response.data);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAnamneses();
  }, [fetchAnamneses]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await api.post('/trainer/anamneses', formData);
      showToast('Anamnese criada com sucesso!', 'success');
      setShowForm(false);
      setFormData({ title: '', description: '' });
      navigate(`/trainer/anamneses/${response.data.id}`);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/trainer/anamneses/${editingAnamnesis.id}`, formData);
      showToast('Anamnese atualizada com sucesso!', 'success');
      fetchAnamneses();
      resetForm();
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (anamnesis) => {
    setEditingAnamnesis(anamnesis);
    setFormData({ title: anamnesis.title, description: anamnesis.description || '' });
    setShowForm(true);
  };

  const handleDelete = (anamnesis) => {
    setConfirmDialog({
      message: `Excluir "${anamnesis.title}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/trainer/anamneses/${anamnesis.id}`);
          showToast('Anamnese excluída com sucesso!', 'success');
          fetchAnamneses();
        } catch (error) {
          showToast(error.userMessage || translateError(error), 'error');
        }
      },
    });
  };

  const resetForm = () => {
    setFormData({ title: '', description: '' });
    setEditingAnamnesis(null);
    setShowForm(false);
  };

  const handleFormChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="loading-text">Carregando...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" style={{ marginBottom: 0 }}>Anamneses</h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Nova Anamnese
          </button>
        )}
      </div>

      {showForm && (
        <div className="card card--mb">
          <h2 className="card-title mb-md">
            {editingAnamnesis ? 'Editar anamnese' : 'Nova anamnese'}
          </h2>
          <form onSubmit={editingAnamnesis ? handleUpdate : handleCreate} className="form">
            <div>
              <label className="form-label" htmlFor="anamnesis-title">Título</label>
              <input
                id="anamnesis-title"
                type="text"
                value={formData.title}
                onChange={handleFormChange('title')}
                className="form-input"
                placeholder="Ex: Anamnese de saúde geral"
                required
                disabled={saving}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="anamnesis-description">Descrição</label>
              <textarea
                id="anamnesis-description"
                value={formData.description}
                onChange={handleFormChange('description')}
                className="form-textarea"
                rows={3}
                placeholder="Descrição opcional"
                disabled={saving}
              />
            </div>
            <div className="btn-group">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary" disabled={saving}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {!showForm && anamneses.length === 0 && (
        <div className="empty-state">
          <p className="empty-state-title">Nenhuma anamnese ainda</p>
          <p>Crie sua primeira anamnese para aplicar aos seus alunos</p>
        </div>
      )}

      {!showForm && anamneses.length > 0 && (
        <div className="grid-cards">
          {anamneses.map((anamnesis) => (
            <div key={anamnesis.id} className="card">
              <div className="card-header">
                <Link to={`/trainer/anamneses/${anamnesis.id}`} className="card-title" style={{ marginBottom: 0 }}>
                  {anamnesis.title}
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                  {anamnesis.isGeneral && <span className="badge badge-blue">Geral</span>}
                  {!anamnesis.isGeneral && (
                    <TemplateRowMenu
                      ariaLabel={`Opções de ${anamnesis.title}`}
                      onEdit={() => handleEditClick(anamnesis)}
                      onDelete={() => handleDelete(anamnesis)}
                    />
                  )}
                </div>
              </div>
              {anamnesis.description && (
                <p className="card-description">{anamnesis.description}</p>
              )}
              <p className="text-sm text-muted" style={{ marginTop: 'var(--spacing-xs)' }}>
                {anamnesis.sections?.length ?? 0} seção(ões)
              </p>
            </div>
          ))}
        </div>
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

export default TrainerAnamneses;
