import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Copy, ClipboardList, Info } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import RowMenu from '../../components/RowMenu';

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
  const [copyingId, setCopyingId] = useState(null);

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

  const handleCopy = async (anamnesis) => {
    setCopyingId(anamnesis.id);
    try {
      const response = await api.post(`/trainer/anamneses/${anamnesis.id}/copy`);
      showToast('Anamnese copiada com sucesso!', 'success');
      navigate(`/trainer/anamneses/${response.data.id}`);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setCopyingId(null);
    }
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
        <h1>Anamneses</h1>
        {!showForm && anamneses.length > 0 && (
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
              <label className="form-label" htmlFor="anamnesis-name">Nome <span aria-hidden="true" style={{ color: 'var(--color-error)' }}>*</span></label>
              <input
                id="anamnesis-name"
                type="text"
                value={formData.title}
                onChange={handleFormChange('title')}
                className="form-input"
                placeholder="Ex: Anamnese inicial"
                required
                disabled={saving}
                autoFocus
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
            <p className="text-sm text-muted">
              Após salvar, você poderá adicionar seções e perguntas à anamnese.
            </p>
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
        <div className="info-banner">
          <span className="info-banner-icon"><Info size={16} strokeWidth={1.6} /></span>
          <span><strong>O que é uma anamnese?</strong> Uma anamnese é um questionário de saúde aplicado ao aluno para coletar informações sobre histórico médico, objetivos e limitações físicas.</span>
        </div>
      )}

      {!showForm && anamneses.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">
            <ClipboardList size={48} strokeWidth={1.2} />
          </div>
          <p className="empty-state-title">Nenhuma anamnese ainda</p>
          <p>Crie sua primeira anamnese para aplicar aos seus alunos</p>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            + Nova Anamnese
          </button>
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
                  {anamnesis.version > 1 && <span className="badge badge-gray">v{anamnesis.version}</span>}
                  {anamnesis.isGeneral && <span className="badge badge-blue">Geral</span>}
                  {anamnesis.isGeneral && (
                    <button
                      type="button"
                      className="btn-schedule-sm"
                      onClick={() => handleCopy(anamnesis)}
                      disabled={copyingId === anamnesis.id}
                      aria-label={`Copiar ${anamnesis.title}`}
                    >
                      <Copy size={14} strokeWidth={1.6} />
                      {copyingId === anamnesis.id ? 'Copiando...' : 'Copiar'}
                    </button>
                  )}
                  {!anamnesis.isGeneral && (
                    <RowMenu
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
                {`${anamnesis.sections?.length ?? 0} ${(anamnesis.sections?.length ?? 0) === 1 ? 'seção' : 'seções'}`}
              </p>
            </div>
          ))}
        </div>
      )}

      {confirmDialog && (
        <div className="overlay">
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
