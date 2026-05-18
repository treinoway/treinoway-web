import { useState, useEffect, useCallback } from 'react';
import { Dumbbell, Info, Layers } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import { getExerciseTypeLabel } from '../../constants/exerciseTypes';
import { getYoutubeVideoId } from '../../utils/youtube';
import LibraryList, { LibraryListRow } from '../../components/LibraryList';
import LibraryFilterBar from '../../components/LibraryFilterBar';
import ExerciseTemplateForm from '../../components/ExerciseTemplateForm';

const ExerciseTemplates = () => {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formName, setFormName] = useState('');

  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const response = await api.get('/trainer/exercise-templates');
      setTemplates(response.data || []);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setTemplatesLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleEdit = (template) => {
    setEditingId(template.id);
    setFormName(template.name || '');
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      message: 'Tem certeza que deseja excluir este exercício? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/trainer/exercise-templates/${id}`);
          showToast('Exercício excluído com sucesso!', 'success');
          fetchTemplates();
        } catch (error) {
          showToast(error.userMessage || translateError(error), 'error');
        }
      },
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setShowForm(false);
    setFormName('');
  };

  const formatExerciseMeta = (template) => {
    const parts = [];
    if (template.type) parts.push(getExerciseTypeLabel(template.type));
    const reps = template.repetitions;
    const repsLabel = reps != null
      ? (reps.min === reps.max ? String(reps.min) : `${reps.min}–${reps.max}`)
      : null;
    if (template.sets != null && repsLabel != null) {
      parts.push(`${template.sets}x${repsLabel}`);
    } else if (template.duration != null) {
      parts.push(`${template.duration}s`);
    }
    if (template.hasLoad && template.suggestedLoad != null) {
      parts.push(`${template.suggestedLoad} kg`);
    }
    if (template.restInterval != null && template.restInterval > 0) {
      const minutes = Math.floor(template.restInterval / 60);
      const remaining = template.restInterval % 60;
      let formatted;
      if (minutes === 0) formatted = `${remaining}s`;
      else if (remaining === 0) formatted = `${minutes}min`;
      else formatted = `${minutes}min ${remaining}s`;
      parts.push(`Descanso: ${formatted}`);
    }
    return parts.length ? parts.join(' · ') : null;
  };

  const normalizedQuery = searchQuery.toLowerCase().trim();
  const filteredTemplates = normalizedQuery
    ? templates.filter((t) => t.name.toLowerCase().includes(normalizedQuery))
    : templates;

  return (
    <div>
      {!showForm && (
        <div className="page-header">
          <div className="page-header-title-row">
            <Dumbbell size={24} strokeWidth={2} className="page-header-title-icon" />
            <h1>Exercícios</h1>
          </div>
          <div className="page-header-actions">
            {templates.length > 0 && (
              <button onClick={() => setShowForm(true)} className="btn-primary">
                + Novo exercício
              </button>
            )}
          </div>
        </div>
      )}

      {!showForm && !templatesLoading && templates.length > 0 && (
        <LibraryFilterBar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Buscar exercício por nome…"
          searchAriaLabel="Buscar exercícios"
        />
      )}

      {showForm && (
        <div className="etf-form-screen">
          <div className="etf-form-wrapper">
            <div className="etf-page-header">
              <span className="etf-page-header-eyebrow">
                <Layers size={12} strokeWidth={2} aria-hidden="true" />
                Modelo · Biblioteca
              </span>
              <h1 className={formName.trim() ? undefined : 'is-empty'}>
                {formName.trim() || 'Sem nome ainda'}
              </h1>
              <span className="etf-page-header-sub">
                Disponível em qualquer treino que você prescrever.
              </span>
            </div>
            <ExerciseTemplateForm
              exerciseTemplate={editingId ? templates.find((t) => t.id === editingId) : null}
              onSuccess={() => { fetchTemplates(); resetForm(); }}
              onCancel={resetForm}
              onNameChange={setFormName}
            />
          </div>
        </div>
      )}

      {templatesLoading && !showForm && (
        <div className="loading-screen">
          <span className="loading-text">Carregando...</span>
        </div>
      )}

      {!showForm && !templatesLoading && templates.length > 0 && (
        <LibraryList emptyMessage={`Nenhum resultado para "${searchQuery}"`}>
          {filteredTemplates.map((template) => {
            const meta = formatExerciseMeta(template);
            const hasVideo = !!getYoutubeVideoId(template.videoUrl);
            const typeLabel = template.type ? getExerciseTypeLabel(template.type) : null;

            const badges = (
              <>
                {typeLabel && <span className="badge badge-blue">{typeLabel}</span>}
                {template.isPublic && <span className="badge badge-green">Público</span>}
                {hasVideo && <span className="badge badge-gray">Vídeo</span>}
              </>
            );

            return (
              <LibraryListRow
                key={template.id}
                title={template.name}
                subtitle={meta}
                badges={badges}
                rowMenuProps={{
                  ariaLabel: `Ações do modelo ${template.name}`,
                  onEdit: () => handleEdit(template),
                  onDelete: () => handleDelete(template.id),
                }}
              />
            );
          })}
        </LibraryList>
      )}

      {!showForm && !templatesLoading && templates.length === 0 && (
        <>
          <div className="info-banner">
            <span className="info-banner-icon"><Info size={16} strokeWidth={1.6} /></span>
            <span><strong>O que é um exercício?</strong> Um exercício é um movimento reutilizável que pode ser adicionado aos seus treinos. Defina séries, repetições, carga sugerida e até link de vídeo para facilitar a montagem das rotinas.</span>
          </div>
          <div className="empty-state">
            <div className="empty-state-icon empty-state-icon--accent">
              <Dumbbell size={32} strokeWidth={1.2} />
            </div>
            <p className="empty-state-title">Nenhum exercício ainda</p>
            <p>Crie seu primeiro exercício e use-o como base ao montar treinos para seus alunos.</p>
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              + Criar primeiro exercício
            </button>
          </div>
        </>
      )}

      {confirmDialog && (
        <div className="overlay">
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-dialog-message">{confirmDialog.message}</p>
            <div className="btn-group">
              <button onClick={confirmDialog.onConfirm} className="btn-danger">
                Confirmar
              </button>
              <button onClick={() => setConfirmDialog(null)} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExerciseTemplates;
