import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Salad, X } from 'lucide-react';
import RowMenu from '../../components/RowMenu';
import Select from '../../components/Select';
import api from '../../api/axios';
import { translateError } from '../../i18n';
import { useToast } from '../../contexts/ToastContext';
import {
  DIET_TYPE_OPTIONS,
  DIET_TYPE_LABEL,
  GOAL_TYPE_OPTIONS,
  GOAL_TYPE_LABEL,
} from '../../constants/diet';

/* ─── CreateTemplateSheet ────────────────────────────────────────────────── */

const CreateTemplateSheet = ({ onClose, onSuccess, editing }) => {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: editing?.name ?? '',
    description: editing?.description ?? '',
    dietType: editing?.dietType ?? '',
    goalType: editing?.goalType ?? '',
  });

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        ...(form.description && { description: form.description.trim() }),
        ...(form.dietType && { dietType: form.dietType }),
        ...(form.goalType && { goalType: form.goalType }),
      };

      if (editing) {
        const res = await api.patch(
          `/nutritionist/diet-protocol-templates/${editing.id}`,
          payload,
        );
        onSuccess(res.data, 'updated');
      } else {
        const res = await api.post('/nutritionist/diet-protocol-templates', payload);
        onSuccess(res.data, 'created');
      }
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="bottom-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-sheet-title"
      >
        <div className="bottom-sheet-header">
          <h2 id="template-sheet-title" className="bottom-sheet-title">
            {editing ? 'Editar modelo' : 'Criar modelo'}
          </h2>
          <button type="button" className="bottom-sheet-close" aria-label="Fechar" onClick={onClose}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="bottom-sheet-body">
          <form onSubmit={handleSubmit} className="form">
            <div className="form-group">
              <label className="form-label" htmlFor="template-name">Nome</label>
              <input
                id="template-name"
                type="text"
                className="form-input"
                value={form.name}
                onChange={handleChange('name')}
                required
                autoFocus
                disabled={saving}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="template-description">Descrição</label>
              <textarea
                id="template-description"
                className="form-textarea"
                value={form.description}
                onChange={handleChange('description')}
                rows={2}
                disabled={saving}
              />
            </div>

            <div className="grid-responsive-2col">
              <div className="form-group">
                <label className="form-label" htmlFor="template-diet-type">Tipo de dieta</label>
                <Select
                  id="template-diet-type"
                  value={form.dietType}
                  onChange={handleChange('dietType')}
                  disabled={saving}
                >
                  <option value="">Selecione…</option>
                  {DIET_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="template-goal-type">Objetivo</label>
                <Select
                  id="template-goal-type"
                  value={form.goalType}
                  onChange={handleChange('goalType')}
                  disabled={saving}
                >
                  <option value="">Selecione…</option>
                  {GOAL_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="btn-group" style={{ marginTop: 'var(--spacing-xl)' }}>
              <button
                type="submit"
                className="btn-primary"
                style={{ flex: 1 }}
                disabled={saving || !form.name.trim()}
              >
                {saving ? 'Salvando…' : editing ? 'Salvar' : 'Criar'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1 }}
                onClick={onClose}
                disabled={saving}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

CreateTemplateSheet.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
  editing: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string,
    description: PropTypes.string,
    dietType: PropTypes.string,
    goalType: PropTypes.string,
  }),
};

CreateTemplateSheet.defaultProps = {
  editing: null,
};

/* ─── DietTemplates ──────────────────────────────────────────────────────── */

const DietTemplates = () => {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSheet, setShowSheet] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/nutritionist/diet-protocol-templates');
      setTemplates(res.data);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleSheetSuccess = (result, action) => {
    if (action === 'created') {
      setTemplates((prev) => [result, ...prev]);
      showToast('Modelo criado com sucesso', 'success');
    } else {
      setTemplates((prev) =>
        prev.map((t) => (t.id === result.id ? result : t)),
      );
      showToast('Modelo atualizado', 'success');
    }
    setShowSheet(false);
    setEditing(null);
  };

  const handleEdit = (template) => {
    setEditing(template);
    setShowSheet(true);
  };

  const handleDelete = (template) => {
    setConfirmDialog({
      message: `Excluir o modelo "${template.name}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/nutritionist/diet-protocol-templates/${template.id}`);
          setTemplates((prev) => prev.filter((t) => t.id !== template.id));
          showToast('Modelo excluído', 'success');
        } catch (error) {
          showToast(error.userMessage || translateError(error), 'error');
        }
      },
    });
  };

  const handleCloseSheet = () => {
    setShowSheet(false);
    setEditing(null);
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
        <div className="page-header-title-row">
          <Salad size={24} className="page-header-title-icon" />
          <h1>Modelos de Dieta</h1>
        </div>
        <div className="page-header-actions">
          {templates.length > 0 && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => { setEditing(null); setShowSheet(true); }}
            >
              + Novo modelo
            </button>
          )}
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon empty-state-icon--accent">
            <Salad size={32} strokeWidth={1.2} />
          </div>
          <p className="empty-state-title">Nenhum modelo criado ainda</p>
          <p>Crie modelos de dieta reutilizáveis para agilizar a prescrição.</p>
          <button
            className="btn-primary"
            onClick={() => { setEditing(null); setShowSheet(true); }}
          >
            + Criar primeiro modelo
          </button>
        </div>
      ) : (
        <div className="grid-cards">
          {templates.map((template) => {
            const dietLabel = DIET_TYPE_LABEL[template.dietType];
            const goalLabel = GOAL_TYPE_LABEL[template.goalType];
            return (
              <div key={template.id} className="card">
                <div className="card-header-row">
                  <h3 className="card-subtitle">{template.name}</h3>
                  <RowMenu
                    ariaLabel={`Ações do modelo ${template.name}`}
                    onEdit={() => handleEdit(template)}
                    onDelete={() => handleDelete(template)}
                  />
                </div>
                <div className="card-badges">
                  {dietLabel && <span className="badge badge-blue">{dietLabel}</span>}
                  {goalLabel && <span className="badge badge-gray">{goalLabel}</span>}
                  {template.mealsCount > 0 && (
                    <span className="badge badge-gray">{template.mealsCount} refeições</span>
                  )}
                </div>
                {template.description && (
                  <p className="card-description text-clamp-2">{template.description}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showSheet && (
        <CreateTemplateSheet
          onClose={handleCloseSheet}
          onSuccess={handleSheetSuccess}
          editing={editing}
        />
      )}

      {confirmDialog && (
        <div className="overlay" onClick={() => setConfirmDialog(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-dialog-message">{confirmDialog.message}</p>
            <div className="btn-group">
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="btn-danger"
                style={{ flex: 1 }}
              >
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="btn-secondary"
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DietTemplates;
