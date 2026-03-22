import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp, Copy, Plus, Trash2 } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import {
  ANAMNESIS_QUESTION_TYPE,
  QUESTION_TYPES_WITH_OPTIONS,
  getQuestionTypeLabel,
  defaultQuestionForm,
  defaultSectionForm,
} from '../../constants/anamnesis';
import RowMenu from '../../components/RowMenu';

const QUESTION_TYPE_OPTIONS = Object.values(ANAMNESIS_QUESTION_TYPE).map((value) => ({
  value,
  label: getQuestionTypeLabel(value),
}));


export const QuestionForm = ({ initialData, onSubmit, onCancel, saving }) => {
  const [data, setData] = useState(initialData ?? defaultQuestionForm());
  const [newOption, setNewOption] = useState('');

  const needsOptions = QUESTION_TYPES_WITH_OPTIONS.includes(data.type);

  const handleChange = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddOption = () => {
    const trimmed = newOption.trim();
    if (!trimmed) return;
    setData((prev) => ({ ...prev, options: [...(prev.options ?? []), { text: trimmed }] }));
    setNewOption('');
  };

  const handleRemoveOption = (index) => {
    setData((prev) => ({ ...prev, options: prev.options.filter((_, i) => i !== index) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...data };
    if (!needsOptions) {
      payload.options = [];
    }
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <div>
        <label className="form-label" htmlFor="question-text">Pergunta</label>
        <input
          id="question-text"
          type="text"
          value={data.text}
          onChange={handleChange('text')}
          className="form-input"
          placeholder="Ex: Você pratica exercícios regularmente?"
          required
          disabled={saving}
        />
      </div>

      <div className="grid-responsive-2col">
        <div>
          <label className="form-label" htmlFor="question-type">Tipo</label>
          <select
            id="question-type"
            value={data.type}
            onChange={handleChange('type')}
            className="form-select"
            disabled={saving}
          >
            {QUESTION_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', paddingTop: 'var(--spacing-lg)' }}>
          <input
            id="question-required"
            type="checkbox"
            checked={data.required}
            onChange={handleChange('required')}
            disabled={saving}
          />
          <label htmlFor="question-required" className="form-label" style={{ marginBottom: 0 }}>
            Obrigatória
          </label>
        </div>
      </div>

      {needsOptions && (
        <div>
          <label className="form-label">Opções</label>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
            <input
              type="text"
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              className="form-input"
              placeholder="Adicionar opção..."
              disabled={saving}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddOption(); } }}
            />
            <button type="button" className="btn-secondary" onClick={handleAddOption} disabled={saving}>
              Adicionar
            </button>
          </div>
          {data.options?.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {data.options.map((opt, index) => (
                <li
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--spacing-xs) var(--spacing-sm)',
                    background: 'var(--md-surface)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: 'var(--spacing-xs)',
                    border: '1px solid var(--color-outline-variant)',
                  }}
                >
                  <span className="text-sm">{opt.text}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(index)}
                    disabled={saving}
                    aria-label={`Remover opção ${opt.text}`}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--md-error)', padding: 0 }}
                  >
                    <Trash2 size={14} strokeWidth={1.6} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="btn-group">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary" disabled={saving}>
          Cancelar
        </button>
      </div>
    </form>
  );
};

export const SectionBlock = ({
  section,
  isGeneral,
  onDeleteSection,
  onEditSection,
  onAddQuestion,
  onDeleteQuestion,
  onEditQuestion,
  setConfirmDialog,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [showSectionEditForm, setShowSectionEditForm] = useState(false);
  const [sectionEditForm, setSectionEditForm] = useState({ title: section.title, description: section.description ?? '' });
  const [saving, setSaving] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);

  const handleAddQuestion = async (questionData) => {
    setSaving(true);
    try {
      await onAddQuestion(section.id, questionData);
      setShowQuestionForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = (question) => {
    setConfirmDialog({
      message: `Excluir a pergunta "${question.text}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        await onDeleteQuestion(section.id, question.id);
      },
    });
  };

  const handleEditQuestionSubmit = async (questionData) => {
    setSavingQuestion(true);
    const success = await onEditQuestion(section.id, editingQuestionId, questionData);
    setSavingQuestion(false);
    if (success) setEditingQuestionId(null);
  };

  const handleSectionEditSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const success = await onEditSection(section.id, sectionEditForm);
    setSaving(false);
    if (success) setShowSectionEditForm(false);
  };

  const handleStartSectionEdit = () => {
    setSectionEditForm({ title: section.title, description: section.description ?? '' });
    setShowSectionEditForm(true);
  };

  return (
    <div className="card card--mb">
      <div className="card-header" style={{ cursor: 'pointer' }} onClick={() => setExpanded((p) => !p)}>
        <span className="card-title" style={{ marginBottom: 0 }}>{section.title}</span>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
          {!isGeneral && (
            <div onClick={(e) => e.stopPropagation()}>
              <RowMenu
                ariaLabel={`Ações da seção ${section.title}`}
                onEdit={() => { setExpanded(true); handleStartSectionEdit(); }}
                onDelete={() => onDeleteSection(section)}
                deleteLabel="Excluir seção"
              />
            </div>
          )}
          {expanded ? <ChevronUp size={16} strokeWidth={1.6} /> : <ChevronDown size={16} strokeWidth={1.6} />}
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 'var(--spacing-md)' }}>
          {showSectionEditForm && (
            <div style={{ marginBottom: 'var(--spacing-md)', paddingBottom: 'var(--spacing-md)', borderBottom: '1px solid var(--color-outline-variant)' }}>
              <h4 className="text-sm font-medium" style={{ marginBottom: 'var(--spacing-sm)' }}>Editar seção</h4>
              <form onSubmit={handleSectionEditSubmit} className="form">
                <div>
                  <label className="form-label" htmlFor={`edit-section-title-${section.id}`}>Título da seção</label>
                  <input
                    id={`edit-section-title-${section.id}`}
                    type="text"
                    value={sectionEditForm.title}
                    onChange={(e) => setSectionEditForm((prev) => ({ ...prev, title: e.target.value }))}
                    className="form-input"
                    required
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor={`edit-section-description-${section.id}`}>Descrição</label>
                  <textarea
                    id={`edit-section-description-${section.id}`}
                    value={sectionEditForm.description}
                    onChange={(e) => setSectionEditForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="form-textarea"
                    rows={2}
                    placeholder="Descrição opcional"
                    disabled={saving}
                  />
                </div>
                <div className="btn-group">
                  <button type="submit" disabled={saving} className="btn-primary">
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSectionEditForm(false)}
                    className="btn-secondary"
                    disabled={saving}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {section.questions?.length === 0 && (
            <p className="text-sm text-muted" style={{ marginBottom: 'var(--spacing-md)' }}>
              Nenhuma pergunta nesta seção.
            </p>
          )}

          {section.questions?.map((question, index) => (
            <div
              key={question.id}
              style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                background: 'var(--md-surface)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-outline-variant)',
                marginBottom: 'var(--spacing-sm)',
              }}
            >
              {editingQuestionId === question.id ? (
                <div>
                  <h4 className="text-sm font-medium" style={{ marginBottom: 'var(--spacing-sm)' }}>Editar pergunta</h4>
                  <QuestionForm
                    initialData={{ text: question.text, type: question.type, required: question.required, options: question.options ?? [] }}
                    onSubmit={handleEditQuestionSubmit}
                    onCancel={() => setEditingQuestionId(null)}
                    saving={savingQuestion}
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--spacing-sm)' }}>
                  <div style={{ flex: 1 }}>
                    <span className="font-medium">{index + 1}. {question.text}</span>
                    <div style={{ marginTop: 'var(--spacing-xs)', display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                      <span className="badge badge-gray">{getQuestionTypeLabel(question.type)}</span>
                      {question.required && <span className="badge badge-blue">Obrigatória</span>}
                    </div>
                    {question.options?.length > 0 && (
                      <ul className="text-sm text-muted" style={{ marginTop: 'var(--spacing-xs)', paddingLeft: 'var(--spacing-md)' }}>
                        {question.options.map((opt) => (
                          <li key={opt.id}>{opt.text}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {!isGeneral && (
                    <RowMenu
                      ariaLabel={`Ações da pergunta ${question.text}`}
                      onEdit={() => setEditingQuestionId(question.id)}
                      onDelete={() => handleDeleteQuestion(question)}
                    />
                  )}
                </div>
              )}
            </div>
          ))}

          {!isGeneral && !showQuestionForm && (
            <button
              type="button"
              className="btn-schedule-sm"
              onClick={() => setShowQuestionForm(true)}
              style={{ marginTop: 'var(--spacing-sm)' }}
            >
              <Plus size={14} strokeWidth={1.6} /> Adicionar pergunta
            </button>
          )}

          {!isGeneral && showQuestionForm && (
            <div style={{ marginTop: 'var(--spacing-md)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-outline-variant)' }}>
              <h4 className="text-sm font-medium" style={{ marginBottom: 'var(--spacing-sm)' }}>Nova pergunta</h4>
              <QuestionForm
                onSubmit={handleAddQuestion}
                onCancel={() => setShowQuestionForm(false)}
                saving={saving}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AnamnesisDetail = () => {
  const { anamnesisId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [anamnesis, setAnamnesis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [savingSection, setSavingSection] = useState(false);
  const [sectionForm, setSectionForm] = useState(defaultSectionForm());
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [forking, setForking] = useState(false);
  const [copying, setCopying] = useState(false);
  const [forkConflictDialog, setForkConflictDialog] = useState(false);

  const fetchAnamnesis = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/trainer/anamneses/${anamnesisId}`);
      setAnamnesis(response.data);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
      navigate('/trainer/anamneses');
    } finally {
      setLoading(false);
    }
  }, [anamnesisId, navigate, showToast]);

  useEffect(() => {
    fetchAnamnesis();
  }, [fetchAnamnesis]);

  const isStudentLinksConflict = (error) =>
    error.response?.status === 409 &&
    error.response?.data?.error === 'ANAMNESIS_HAS_STUDENT_LINKS';

  const handleAddSection = async (e) => {
    e.preventDefault();
    setSavingSection(true);
    try {
      await api.post(`/trainer/anamneses/${anamnesisId}/sections`, sectionForm);
      showToast('Seção adicionada com sucesso!', 'success');
      setSectionForm(defaultSectionForm());
      setShowSectionForm(false);
      fetchAnamnesis();
    } catch (error) {
      if (isStudentLinksConflict(error)) {
        handleStudentLinksConflict();
      } else {
        showToast(error.userMessage || translateError(error), 'error');
      }
    } finally {
      setSavingSection(false);
    }
  };

  const handleDeleteSection = (section) => {
    setConfirmDialog({
      message: `Excluir a seção "${section.title}" e todas as suas perguntas? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/trainer/anamneses/${anamnesisId}/sections/${section.id}`);
          showToast('Seção excluída com sucesso!', 'success');
          fetchAnamnesis();
        } catch (error) {
          if (isStudentLinksConflict(error)) {
            handleStudentLinksConflict();
          } else {
            showToast(error.userMessage || translateError(error), 'error');
          }
        }
      },
    });
  };

  const handleAddQuestion = async (sectionId, questionData) => {
    try {
      await api.post(`/trainer/anamneses/${anamnesisId}/sections/${sectionId}/questions`, questionData);
      showToast('Pergunta adicionada com sucesso!', 'success');
      fetchAnamnesis();
    } catch (error) {
      if (isStudentLinksConflict(error)) {
        handleStudentLinksConflict();
      } else {
        showToast(error.userMessage || translateError(error), 'error');
      }
    }
  };

  const handleDeleteQuestion = async (sectionId, questionId) => {
    try {
      await api.delete(`/trainer/anamneses/${anamnesisId}/sections/${sectionId}/questions/${questionId}`);
      showToast('Pergunta excluída com sucesso!', 'success');
      fetchAnamnesis();
    } catch (error) {
      if (isStudentLinksConflict(error)) {
        handleStudentLinksConflict();
      } else {
        showToast(error.userMessage || translateError(error), 'error');
      }
    }
  };

  const handleEditSection = async (sectionId, data) => {
    try {
      await api.patch(`/trainer/anamneses/${anamnesisId}/sections/${sectionId}`, data);
      showToast('Seção atualizada com sucesso!', 'success');
      fetchAnamnesis();
      return true;
    } catch (error) {
      if (isStudentLinksConflict(error)) {
        handleStudentLinksConflict();
      } else {
        showToast(error.userMessage || translateError(error), 'error');
      }
      return false;
    }
  };

  const handleEditQuestion = async (sectionId, questionId, data) => {
    try {
      await api.patch(`/trainer/anamneses/${anamnesisId}/sections/${sectionId}/questions/${questionId}`, data);
      showToast('Pergunta atualizada com sucesso!', 'success');
      fetchAnamnesis();
      return true;
    } catch (error) {
      if (isStudentLinksConflict(error)) {
        handleStudentLinksConflict();
      } else {
        showToast(error.userMessage || translateError(error), 'error');
      }
      return false;
    }
  };

  const handleFork = async () => {
    setForking(true);
    setForkConflictDialog(false);
    try {
      const response = await api.post(`/trainer/anamneses/${anamnesisId}/fork`);
      showToast('Nova versão criada com sucesso!', 'success');
      navigate(`/trainer/anamneses/${response.data.id}`);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setForking(false);
    }
  };

  const handleCopy = async () => {
    setCopying(true);
    try {
      const response = await api.post(`/trainer/anamneses/${anamnesisId}/copy`);
      showToast('Anamnese copiada com sucesso!', 'success');
      navigate(`/trainer/anamneses/${response.data.id}`);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setCopying(false);
    }
  };

  const handleStudentLinksConflict = () => {
    setForkConflictDialog(true);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <span className="loading-text">Carregando...</span>
      </div>
    );
  }

  if (!anamnesis) return null;

  const sortedSections = [...(anamnesis.sections ?? [])].sort((a, b) => a.order - b.order);
  const isGeneral = anamnesis.isGeneral;

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 'var(--spacing-md)' }}>
        <button
          onClick={() => navigate('/trainer/anamneses')}
          className="btn-back"
          aria-label="Voltar para anamneses"
        >
          <ArrowLeft size={16} strokeWidth={1.6} />
          Anamneses
        </button>
      </div>

      <div className="card card--mb">
        <div className="card-header">
          <h1 className="card-title" style={{ marginBottom: 0 }}>{anamnesis.title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
            {anamnesis.version > 1 && <span className="badge badge-gray">v{anamnesis.version}</span>}
            {isGeneral && <span className="badge badge-blue">Geral</span>}
          </div>
        </div>
        {anamnesis.description && (
          <p className="card-description" style={{ marginTop: 'var(--spacing-xs)' }}>
            {anamnesis.description}
          </p>
        )}
        {anamnesis.parentId && (
          <p className="text-sm text-muted" style={{ marginTop: 'var(--spacing-xs)' }}>
            Nova versão criada a partir de uma anamnese anterior.
          </p>
        )}
        {isGeneral && (
          <p className="text-sm text-muted" style={{ marginTop: 'var(--spacing-sm)' }}>
            Esta é uma anamnese geral da plataforma e não pode ser editada.
          </p>
        )}
        {isGeneral && (
          <div style={{ marginTop: 'var(--spacing-md)' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={handleCopy}
              disabled={copying}
            >
              <Copy size={14} strokeWidth={1.6} style={{ marginRight: 'var(--spacing-xs)' }} />
              {copying ? 'Copiando...' : 'Copiar para minha coleção'}
            </button>
          </div>
        )}
        {!isGeneral && (
          <div style={{ marginTop: 'var(--spacing-md)' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={handleFork}
              disabled={forking}
            >
              {forking ? 'Criando...' : 'Criar nova versão'}
            </button>
          </div>
        )}
      </div>

      <div className="page-header" style={{ marginBottom: 'var(--spacing-md)' }}>
        <h2 className="card-title" style={{ marginBottom: 0 }}>Seções</h2>
        {!isGeneral && !showSectionForm && (
          <button onClick={() => setShowSectionForm(true)} className="btn-primary">
            + Adicionar seção
          </button>
        )}
      </div>

      {!isGeneral && showSectionForm && (
        <div className="card card--mb">
          <h3 className="card-title mb-md">Nova seção</h3>
          <form onSubmit={handleAddSection} className="form">
            <div>
              <label className="form-label" htmlFor="section-title">Título da seção</label>
              <input
                id="section-title"
                type="text"
                value={sectionForm.title}
                onChange={(e) => setSectionForm((prev) => ({ ...prev, title: e.target.value }))}
                className="form-input"
                placeholder="Ex: Histórico de saúde"
                required
                disabled={savingSection}
              />
            </div>
            <div>
              <label className="form-label" htmlFor="section-description">Descrição</label>
              <textarea
                id="section-description"
                value={sectionForm.description}
                onChange={(e) => setSectionForm((prev) => ({ ...prev, description: e.target.value }))}
                className="form-textarea"
                rows={2}
                placeholder="Descrição opcional"
                disabled={savingSection}
              />
            </div>
            <div className="btn-group">
              <button type="submit" disabled={savingSection} className="btn-primary">
                {savingSection ? 'Salvando...' : 'Adicionar'}
              </button>
              <button
                type="button"
                onClick={() => { setShowSectionForm(false); setSectionForm(defaultSectionForm()); }}
                className="btn-secondary"
                disabled={savingSection}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {sortedSections.length === 0 && (
        <div className="empty-state">
          <p className="empty-state-title">Nenhuma seção ainda</p>
          {!isGeneral && <p>Adicione uma seção para começar a criar perguntas</p>}
        </div>
      )}

      {sortedSections.map((section) => (
        <SectionBlock
          key={section.id}
          section={section}
          isGeneral={isGeneral}
          onDeleteSection={handleDeleteSection}
          onEditSection={handleEditSection}
          onAddQuestion={handleAddQuestion}
          onDeleteQuestion={handleDeleteQuestion}
          onEditQuestion={handleEditQuestion}
          setConfirmDialog={setConfirmDialog}
        />
      ))}

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

      {forkConflictDialog && (
        <div className="overlay" onClick={() => setForkConflictDialog(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-dialog-message">
              Esta anamnese está vinculada a alunos e não pode ser editada diretamente.
              Deseja criar uma nova versão para editar?
            </p>
            <div className="btn-group">
              <button onClick={handleFork} disabled={forking} className="btn-primary" style={{ flex: 1 }}>
                {forking ? 'Criando...' : 'Criar nova versão'}
              </button>
              <button onClick={() => setForkConflictDialog(false)} className="btn-secondary" style={{ flex: 1 }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnamnesisDetail;
