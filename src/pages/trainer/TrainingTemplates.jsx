import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { LayoutGrid, List, Dumbbell, Info } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import CreateExerciseTemplateModal from '../../components/CreateExerciseTemplateModal';
import RowMenu from '../../components/RowMenu';
import usePersistedViewMode, { VIEW_MODE_KEYS } from '../../hooks/usePersistedViewMode';
import { formatExerciseMeta } from '../../utils/exerciseMeta';

/** @deprecated Use RowMenu from '../../components/RowMenu' instead */
export const TemplateRowMenu = RowMenu;

const CATEGORY_LABEL = { strength: 'Força', cardio: 'Cardio' };
const BODY_SEGMENT_LABEL = { upper: 'Superior', lower: 'Inferior', full_body: 'Corpo Inteiro' };

const exerciseBadgeStyle = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-outline-variant)',
  color: 'var(--color-on-surface-variant)',
};

const ExerciseRow = ({ name, meta, onEdit, onRemove }) => (
  <div className="schedule-template-row">
    <div className="schedule-template-fields" style={{ alignItems: 'center' }}>
      <span style={{ fontWeight: 600, flex: 1 }}>{name}</span>
      {meta && (
        <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
          <span className="badge" style={exerciseBadgeStyle}>
            {meta}
          </span>
        </div>
      )}
    </div>
    <TemplateRowMenu
      ariaLabel={`Ações do exercício ${name}`}
      onEdit={onEdit}
      onDelete={onRemove}
      deleteLabel="Remover"
    />
  </div>
);

ExerciseRow.propTypes = {
  name: PropTypes.string.isRequired,
  meta: PropTypes.string,
  onEdit: PropTypes.func,
  onRemove: PropTypes.func.isRequired,
};

const TrainingTemplates = () => {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [showExerciseTemplateModal, setShowExerciseTemplateModal] = useState(false);
  const [editingExerciseTemplate, setEditingExerciseTemplate] = useState(null);
  const [exerciseTemplates, setExerciseTemplates] = useState([]);
  const [exercisePickerValue, setExercisePickerValue] = useState('');
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [viewMode, setViewMode] = usePersistedViewMode(VIEW_MODE_KEYS.trainingTemplates);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    bodySegment: '',
    isPublic: false,
    exerciseTemplateIds: [],
  });

  useEffect(() => {
    fetchTemplates();
    fetchExerciseTemplates();
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

  const fetchExerciseTemplates = async () => {
    try {
      const response = await api.get('/trainer/exercise-templates');
      setExerciseTemplates(response.data || []);
    } catch (error) {
      console.error('Failed to fetch exercise templates:', error);
    }
  };

  const normalizeExerciseTemplateIds = (ids) =>
    (ids || []).map((id) => (typeof id === 'number' ? id : Number.isNaN(Number(id)) ? id : Number(id)));

  /** Extract exercise template IDs from API response (handles exerciseTemplateIds, exerciseTemplates, or trainingTemplateExerciseTemplates) */
  const getExerciseTemplateIdsFromTemplate = (template) => {
    if (template.exerciseTemplateIds && Array.isArray(template.exerciseTemplateIds)) {
      return template.exerciseTemplateIds;
    }
    const junctionList = template.trainingTemplateExerciseTemplates;
    if (Array.isArray(junctionList)) {
      return junctionList
        .map((e) => e.exerciseTemplateId ?? e.exerciseTemplate?.id)
        .filter((id) => id != null);
    }
    const list = template.exerciseTemplates;
    if (!Array.isArray(list)) return [];
    return list.map((e) => e.exerciseTemplateId ?? e.id ?? e.exerciseTemplate?.id).filter((id) => id != null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { exerciseTemplateIds, ...rest } = formData;
      const normalizedIds = normalizeExerciseTemplateIds(exerciseTemplateIds);
      const payload = { ...rest, ...(normalizedIds.length > 0 && { exerciseTemplateIds: normalizedIds }) };
      if (editingId) {
        await api.patch(`/trainer/training-templates/${editingId}`, payload);
        showToast('Treino único atualizado com sucesso!', 'success');
      } else {
        await api.post('/trainer/training-templates', payload);
        showToast('Treino único criado com sucesso!', 'success');
      }
      fetchTemplates();
      resetForm();
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (template) => {
    setEditingId(template.id);
    setLoadingEdit(true);
    setShowForm(true);
    try {
      const response = await api.get(`/trainer/training-templates/${template.id}`);
      const full = response.data;
      setFormData({
        name: full.name,
        description: full.description || '',
        category: full.category || '',
        bodySegment: full.bodySegment || '',
        isPublic: full.isPublic || false,
        exerciseTemplateIds: getExerciseTemplateIdsFromTemplate(full),
      });
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
      setShowForm(false);
      setEditingId(null);
    } finally {
      setLoadingEdit(false);
    }
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      message: 'Tem certeza que deseja excluir este treino único? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/trainer/training-templates/${id}`);
          showToast('Treino único excluído com sucesso!', 'success');
          fetchTemplates();
        } catch (error) {
          showToast(error.userMessage || translateError(error), 'error');
        }
      },
    });
  };

  const handleExercisePickerAdd = () => {
    if (!exercisePickerValue) return;
    if (formData.exerciseTemplateIds.includes(exercisePickerValue)) return;
    setFormData((prev) => ({
      ...prev,
      exerciseTemplateIds: [...prev.exerciseTemplateIds, exercisePickerValue],
    }));
    setExercisePickerValue('');
  };

  const handleExercisePickerRemove = (templateId) => {
    setFormData((prev) => ({
      ...prev,
      exerciseTemplateIds: prev.exerciseTemplateIds.filter((id) => id !== templateId),
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      bodySegment: '',
      isPublic: false,
      exerciseTemplateIds: [],
    });
    setExercisePickerValue('');
    setEditingId(null);
    setShowForm(false);
  };

  const normalizedQuery = searchQuery.toLowerCase().trim();
  const filteredTemplates = normalizedQuery
    ? templates.filter((t) => t.name.toLowerCase().includes(normalizedQuery))
    : templates;

  return (
    <div>
      <div className="page-header">
        <h1>Treinos únicos</h1>
        <div className="page-header-actions">
          {!showForm && (
            <div className="view-toggle-group">
              <button
                type="button"
                className={`view-toggle-btn${viewMode === 'card' ? ' view-toggle-btn--active' : ''}`}
                onClick={() => setViewMode('card')}
                aria-pressed={viewMode === 'card'}
                aria-label="Visualização em cards"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                type="button"
                className={`view-toggle-btn${viewMode === 'list' ? ' view-toggle-btn--active' : ''}`}
                onClick={() => setViewMode('list')}
                aria-pressed={viewMode === 'list'}
                aria-label="Visualização em lista"
              >
                <List size={16} />
              </button>
            </div>
          )}
          {!showForm && templates.length > 0 && (
            <button onClick={() => setShowForm(true)} className="btn-primary">
              + Novo treino único
            </button>
          )}
        </div>
      </div>

      {!showForm && !templatesLoading && templates.length > 0 && (
        <div style={{ marginBottom: 'var(--spacing-md)' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input"
            placeholder="Buscar treino por nome..."
            aria-label="Buscar treinos"
          />
        </div>
      )}

      {showForm && (
        <div className="card card--mb">
          <h2 className="card-title mb-md">
            {editingId ? 'Editar treino único' : 'Criar novo treino único'}
          </h2>
          {loadingEdit ? (
            <div className="loading-screen" style={{ minHeight: 120 }}>
              <span className="loading-text">Carregando...</span>
            </div>
          ) : (
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

            <div className="form-section" style={{ marginTop: 'var(--spacing-md)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-outline-variant)' }}>
              <div className="form-section-header">
                <h3 className="form-section-title">Exercícios do treino</h3>
              </div>

              <div className="exercise-picker-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="tt-exercise-picker">Selecionar exercício existente</label>
                  <select
                    id="tt-exercise-picker"
                    value={exercisePickerValue}
                    onChange={(e) => setExercisePickerValue(e.target.value)}
                    className="form-select"
                  >
                    <option value="">Selecione um exercício...</option>
                    {exerciseTemplates.map((et) => (
                      <option key={et.id} value={et.id}>{et.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleExercisePickerAdd}
                  disabled={!exercisePickerValue}
                  aria-label="Adicionar exercício ao treino"
                >
                  Adicionar
                </button>
              </div>

              {formData.exerciseTemplateIds.length > 0 && (
                <div className="exercise-list">
                  {formData.exerciseTemplateIds.map((etId) => {
                    const et = exerciseTemplates.find((t) => String(t.id) === String(etId));
                    const name = et?.name || String(etId);
                    const meta = et ? formatExerciseMeta(et) : null;
                    return (
                      <ExerciseRow
                        key={etId}
                        name={name}
                        meta={meta}
                        onEdit={et ? () => setEditingExerciseTemplate(et) : undefined}
                        onRemove={() => handleExercisePickerRemove(etId)}
                      />
                    );
                  })}
                </div>
              )}

              <div className="exercise-list-actions">
                <button
                  type="button"
                  className="btn-schedule-sm"
                  onClick={() => setShowExerciseTemplateModal(true)}
                  aria-label="Criar novo exercício"
                >
                  + Criar novo exercício
                </button>
              </div>
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
          )}
        </div>
      )}

      {templatesLoading && !showForm && (
        <div className="loading-screen">
          <span className="loading-text">Carregando...</span>
        </div>
      )}

      {!showForm && !templatesLoading && filteredTemplates.length > 0 && viewMode === 'card' && (
        <div className="grid-cards">
          {filteredTemplates.map((template) => (
            <div key={template.id} className="card">
              <div className="card-header">
                <h3 className="card-subtitle" style={{ marginBottom: 0 }}>{template.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
                  {template.isPublic && (
                    <span className="badge badge-green">Público</span>
                  )}
                  <RowMenu
                    ariaLabel={`Ações do modelo ${template.name}`}
                    onEdit={() => handleEdit(template)}
                    onDelete={() => handleDelete(template.id)}
                  />
                </div>
              </div>
              {template.description && (
                <p className="card-description mb-md">{template.description}</p>
              )}
              <div className="info-list mb-md" style={{ paddingTop: 'var(--spacing-sm)', borderTop: '1px solid var(--color-outline-variant)' }}>
                {template.category && (
                  <div className="text-sm text-light">
                    <strong>Categoria:</strong> {CATEGORY_LABEL[template.category] || template.category}
                  </div>
                )}
                {template.bodySegment && (
                  <div className="text-sm text-light">
                    <strong>Segmento:</strong> {BODY_SEGMENT_LABEL[template.bodySegment] || template.bodySegment}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!showForm && !templatesLoading && filteredTemplates.length > 0 && viewMode === 'list' && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th className="table-col-desktop-only">Categoria</th>
                <th className="table-col-desktop-only">Segmento</th>
                <th style={{ width: '48px' }} />
              </tr>
            </thead>
            <tbody>
              {filteredTemplates.map((template) => (
                <tr key={template.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600 }}>{template.name}</span>
                      {template.isPublic && <span className="badge badge-green">Público</span>}
                    </div>
                    <span className="table-col-mobile-only" style={{ display: 'block', fontSize: 'var(--font-caption-size)', color: 'var(--color-on-surface-variant)', marginTop: '2px' }}>
                      {[
                        template.category && (CATEGORY_LABEL[template.category] || template.category),
                        template.bodySegment && (BODY_SEGMENT_LABEL[template.bodySegment] || template.bodySegment),
                      ].filter(Boolean).join(' · ') || '—'}
                    </span>
                  </td>
                  <td className="table-col-desktop-only" style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--font-body-small-size)' }}>
                    {CATEGORY_LABEL[template.category] || template.category || '—'}
                  </td>
                  <td className="table-col-desktop-only" style={{ color: 'var(--color-on-surface-variant)', fontSize: 'var(--font-body-small-size)' }}>
                    {BODY_SEGMENT_LABEL[template.bodySegment] || template.bodySegment || '—'}
                  </td>
                  <td>
                    <TemplateRowMenu
                      ariaLabel={`Ações do modelo ${template.name}`}
                      onEdit={() => handleEdit(template)}
                      onDelete={() => handleDelete(template.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!showForm && !templatesLoading && templates.length > 0 && filteredTemplates.length === 0 && (
        <div className="empty-state">
          <p className="empty-state-title">Nenhum resultado para &quot;{searchQuery}&quot;</p>
        </div>
      )}

      {!showForm && !templatesLoading && templates.length === 0 && (
        <>
          <div className="info-banner">
            <span className="info-banner-icon"><Info size={16} strokeWidth={1.6} /></span>
            <span><strong>O que é um treino único?</strong> Um treino único é uma ficha pré-configurada com categoria e segmento corporal que pode ser reutilizada em diferentes rotinas, agilizando a montagem dos treinos dos seus alunos.</span>
          </div>
          <div className="empty-state">
            <div className="empty-state-icon">
              <Dumbbell size={48} strokeWidth={1.2} />
            </div>
            <p className="empty-state-title">Nenhum treino único ainda</p>
            <p>Crie seu primeiro treino único para começar</p>
            <button className="btn-primary" onClick={() => setShowForm(true)}>+ Novo treino único</button>
          </div>
        </>
      )}

      {(showExerciseTemplateModal || editingExerciseTemplate) && (
        <CreateExerciseTemplateModal
          open
          exerciseTemplate={editingExerciseTemplate}
          onClose={() => {
            setShowExerciseTemplateModal(false);
            setEditingExerciseTemplate(null);
          }}
          onSuccess={(result) => {
            const wasEditing = !!editingExerciseTemplate;
            setShowExerciseTemplateModal(false);
            setEditingExerciseTemplate(null);
            fetchExerciseTemplates();
            if (!wasEditing && result?.id != null) {
              setFormData((prev) => ({
                ...prev,
                exerciseTemplateIds: [...prev.exerciseTemplateIds, result.id],
              }));
            }
          }}
        />
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
