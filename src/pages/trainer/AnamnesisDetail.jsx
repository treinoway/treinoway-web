import { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Copy,
  Plus,
  Trash2,
  Pencil,
  GripVertical,
  Type,
  ToggleLeft,
  List,
  CheckSquare,
  Hash,
  Grid3x3,
  Eye,
  GitBranch,
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import {
  ANAMNESIS_QUESTION_TYPE,
  QUESTION_TYPES_WITH_OPTIONS,
  getQuestionTypeLabel,
  defaultSectionForm,
} from '../../constants/anamnesis';
import AnamnesisPreviewModal from '../../components/AnamnesisPreviewModal';

/* ── helpers ─────────────────────────────────────────────── */

const LIBRARY_TILES = [
  { type: ANAMNESIS_QUESTION_TYPE.FREE_TEXT,       icon: Type,       label: 'Texto Livre' },
  { type: ANAMNESIS_QUESTION_TYPE.DICHOTOMOUS,     icon: ToggleLeft, label: 'Sim / Não' },
  { type: ANAMNESIS_QUESTION_TYPE.SINGLE_CHOICE,   icon: List,       label: 'Escolha Única' },
  { type: ANAMNESIS_QUESTION_TYPE.MULTIPLE_CHOICE, icon: CheckSquare,label: 'Múltipla Escolha' },
  { type: ANAMNESIS_QUESTION_TYPE.NUMERIC,         icon: Hash,       label: 'Numérico' },
  { type: ANAMNESIS_QUESTION_TYPE.MATRIX,          icon: Grid3x3,    label: 'Matriz' },
];

const PRESETS = [
  { text: 'Histórico familiar de diabetes', type: ANAMNESIS_QUESTION_TYPE.DICHOTOMOUS },
  { text: 'Uso de medicamentos',             type: ANAMNESIS_QUESTION_TYPE.FREE_TEXT },
  { text: 'Alergias alimentares',            type: ANAMNESIS_QUESTION_TYPE.FREE_TEXT },
];

const buildTypeEyebrow = (question) => {
  const typeLabel = getQuestionTypeLabel(question.type).toUpperCase();
  return question.required ? `${typeLabel} · OBRIGATÓRIA` : typeLabel;
};

const buildAllQuestions = (sections) =>
  sections.flatMap((s) => (s.questions ?? []).map((q) => ({ ...q, sectionId: s.id })));

/* ── ToggleSwitch ────────────────────────────────────────── */

const ToggleSwitch = ({ on, onChange, disabled, label }) => (
  <div className="toggle-wrap">
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      className={`toggle-switch${on ? ' toggle-switch--on' : ''}`}
      onClick={onChange}
      disabled={disabled}
    />
    <span className="toggle-label">{label}</span>
  </div>
);

ToggleSwitch.propTypes = {
  on: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  label: PropTypes.string,
};

/* ── CanvasQuestionCard ──────────────────────────────────── */

const CanvasQuestionCard = ({ question, sectionId, anamnesisId, isGeneral, autoFocus, onAutoFocusConsumed, onUpdated, onDeleteQuestion }) => {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [localText, setLocalText] = useState(question.text);
  const [newOption, setNewOption]  = useState('');
  const titleRef = useRef(null);

  const hasOptions = QUESTION_TYPES_WITH_OPTIONS.includes(question.type);

  useEffect(() => {
    if (!autoFocus || !titleRef.current) return;
    titleRef.current.focus();
    titleRef.current.select();
    onAutoFocusConsumed?.();
  }, [question.id, autoFocus, onAutoFocusConsumed]);

  const patchQuestion = useCallback(async (payload) => {
    setSaving(true);
    try {
      await api.patch(
        `/trainer/anamneses/${anamnesisId}/sections/${sectionId}/questions/${question.id}`,
        payload,
      );
      onUpdated();
    } catch (error) {
      if (
        error.response?.status === 409 &&
        error.response?.data?.error === 'ANAMNESIS_HAS_STUDENT_LINKS'
      ) {
        onUpdated('conflict');
      } else {
        showToast(error.userMessage || translateError(error), 'error');
      }
    } finally {
      setSaving(false);
    }
  }, [anamnesisId, sectionId, question.id, onUpdated, showToast]);

  const handleTitleBlur = () => {
    const trimmed = localText.trim();
    if (!trimmed || trimmed === question.text) return;
    patchQuestion({ text: trimmed });
  };

  const handleToggleRequired = () => {
    patchQuestion({ required: !question.required });
  };

  const handleAddOption = async () => {
    const trimmed = newOption.trim();
    if (!trimmed) return;
    const updatedOptions = [...(question.options ?? []), { text: trimmed }];
    setNewOption('');
    await patchQuestion({ options: updatedOptions });
  };

  const handleRemoveOption = (index) => {
    const updatedOptions = question.options.filter((_, i) => i !== index);
    patchQuestion({ options: updatedOptions });
  };

  const handleNumericField = (field) => (e) => {
    const val = e.target.value;
    patchQuestion({ config: { ...(question.config ?? {}), [field]: val } });
  };

  const handleKeyDownOption = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAddOption(); }
  };

  return (
    <div className="question-card">
      <div className="question-card-header">
        <p className="eyebrow question-card-eyebrow">{buildTypeEyebrow(question)}</p>
        {!isGeneral && (
          <button
            type="button"
            className="btn btn-ghost-danger btn-sm"
            onClick={() => onDeleteQuestion()}
            disabled={saving}
            aria-label="Excluir pergunta"
          >
            <Trash2 size={14} strokeWidth={2} />
            Excluir pergunta
          </button>
        )}
      </div>

      {isGeneral ? (
        <p className="question-card-title question-card-title--static">{question.text}</p>
      ) : (
        <textarea
          ref={titleRef}
          className="question-card-title"
          value={localText}
          onChange={(e) => setLocalText(e.target.value)}
          onBlur={handleTitleBlur}
          disabled={saving}
          rows={2}
          aria-label="Texto da pergunta"
        />
      )}

      <div className="question-toggles">
        <ToggleSwitch
          on={question.required}
          onChange={isGeneral ? undefined : handleToggleRequired}
          disabled={isGeneral || saving}
          label="Obrigatória"
        />
      </div>

      {question.type === ANAMNESIS_QUESTION_TYPE.DICHOTOMOUS && (
        <div className="choice-options">
          <div className="choice-option choice-option--active">Sim</div>
          <div className="choice-option">Não</div>
        </div>
      )}

      {hasOptions && question.type !== ANAMNESIS_QUESTION_TYPE.MATRIX && (
        <div>
          <div className="options-list">
            {(question.options ?? []).map((opt, i) => (
              <div key={i} className="options-list-item">
                <span className="options-list-item-text">{opt.text}</span>
                {!isGeneral && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(i)}
                    disabled={saving}
                    aria-label={`Remover opção ${opt.text}`}
                    className="options-list-item-remove"
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {!isGeneral && (
            <div className="options-list-add">
              <input
                type="text"
                className="form-input"
                placeholder="Nova opção..."
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                onKeyDown={handleKeyDownOption}
                disabled={saving}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddOption}
                disabled={saving || !newOption.trim()}
              >
                Adicionar
              </button>
            </div>
          )}
        </div>
      )}

      {question.type === ANAMNESIS_QUESTION_TYPE.NUMERIC && (
        <div className="numeric-config">
          <div>
            <label className="eyebrow" style={{ display: 'block', marginBottom: 'var(--spacing-xs)' }}>Mín</label>
            <input
              type="number"
              className="form-input"
              defaultValue={question.config?.min ?? ''}
              onBlur={handleNumericField('min')}
              disabled={isGeneral || saving}
            />
          </div>
          <div>
            <label className="eyebrow" style={{ display: 'block', marginBottom: 'var(--spacing-xs)' }}>Máx</label>
            <input
              type="number"
              className="form-input"
              defaultValue={question.config?.max ?? ''}
              onBlur={handleNumericField('max')}
              disabled={isGeneral || saving}
            />
          </div>
          <div>
            <label className="eyebrow" style={{ display: 'block', marginBottom: 'var(--spacing-xs)' }}>Unidade</label>
            <input
              type="text"
              className="form-input"
              defaultValue={question.config?.unit ?? ''}
              onBlur={handleNumericField('unit')}
              disabled={isGeneral || saving}
              placeholder="kg, cm…"
            />
          </div>
        </div>
      )}

      {question.type === ANAMNESIS_QUESTION_TYPE.MATRIX && (
        <div className="matrix-config">
          <div>
            <p className="matrix-config-col-title">Linhas</p>
            <div className="options-list">
              {(question.config?.rows ?? []).map((row, i) => (
                <div key={i} className="options-list-item">
                  <span className="options-list-item-text">{row}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="matrix-config-col-title">Colunas</p>
            <div className="options-list">
              {(question.config?.columns ?? []).map((col, i) => (
                <div key={i} className="options-list-item">
                  <span className="options-list-item-text">{col}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {question.type === ANAMNESIS_QUESTION_TYPE.FREE_TEXT && (
        <textarea
          className="form-input form-textarea"
          disabled
          placeholder="Resposta do aluno..."
          rows={3}
          style={{ marginTop: 'var(--spacing-sm)' }}
        />
      )}
    </div>
  );
};

CanvasQuestionCard.propTypes = {
  question: PropTypes.shape({
    id: PropTypes.string,
    text: PropTypes.string,
    type: PropTypes.string,
    required: PropTypes.bool,
    options: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string, text: PropTypes.string })),
    config: PropTypes.shape({ min: PropTypes.number, max: PropTypes.number, unit: PropTypes.string, rows: PropTypes.array, columns: PropTypes.array }),
  }).isRequired,
  sectionId: PropTypes.string.isRequired,
  anamnesisId: PropTypes.string.isRequired,
  isGeneral: PropTypes.bool,
  autoFocus: PropTypes.bool,
  onAutoFocusConsumed: PropTypes.func,
  onUpdated: PropTypes.func.isRequired,
  onDeleteQuestion: PropTypes.func.isRequired,
};

/* ── OutlineSectionItem ──────────────────────────────────── */

const OutlineSectionItem = ({
  section,
  isActive,
  isGeneral,
  selectedQuestionId,
  onSelectSection,
  onSelectQuestion,
  onDeleteSection,
  onEditSection,
  onDeleteQuestion,
  dragHandlers,
}) => {
  const [editingSection, setEditingSection] = useState(false);
  const [sectionForm, setSectionForm] = useState({ title: section.title, description: section.description ?? '' });
  const [saving, setSaving] = useState(false);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const ok = await onEditSection(section.id, sectionForm);
    setSaving(false);
    if (ok) setEditingSection(false);
  };

  const handleStartEdit = (e) => {
    e.stopPropagation();
    setSectionForm({ title: section.title, description: section.description ?? '' });
    setEditingSection(true);
  };

  if (editingSection) {
    return (
      <div className="outline-section-edit">
        <form onSubmit={handleEditSubmit} className="form" style={{ gap: 'var(--spacing-xs)' }}>
          <input
            type="text"
            className="form-input"
            value={sectionForm.title}
            onChange={(e) => setSectionForm((p) => ({ ...p, title: e.target.value }))}
            aria-label="Título da seção"
            required
            disabled={saving}
          />
          <div className="btn-group" style={{ marginTop: 'var(--spacing-xs)' }}>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setEditingSection(false)}
              disabled={saving}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="outline-section-row">
      <div
        role="button"
        tabIndex={0}
        className={`outline-section-btn${isActive ? ' outline-section-btn--active' : ''}`}
        onClick={() => onSelectSection(section.id)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectSection(section.id); } }}
        aria-expanded={isActive}
        {...(isGeneral ? {} : dragHandlers)}
      >
        <span
          className={isGeneral ? 'outline-grip--inert' : 'outline-grip'}
          aria-hidden="true"
        >
          <GripVertical size={12} strokeWidth={2} />
        </span>
        <span className="outline-label">{section.title}</span>
        <span className="outline-count">{section.questions?.length ?? 0}</span>
        {!isGeneral && (
          <span
            className="outline-inline-actions"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="outline-inline-action"
              aria-label={`Editar seção ${section.title}`}
              onClick={handleStartEdit}
            >
              <Pencil size={12} strokeWidth={2} />
            </button>
            <button
              type="button"
              className="outline-inline-action outline-inline-action--danger"
              aria-label={`Excluir seção ${section.title}`}
              onClick={(e) => { e.stopPropagation(); onDeleteSection(section); }}
            >
              <Trash2 size={12} strokeWidth={2} />
            </button>
          </span>
        )}
      </div>

      {isActive && (
        <div className="outline-questions">
          {(section.questions ?? []).map((q) => (
            <div
              key={q.id}
              role="button"
              tabIndex={0}
              className={`outline-question-btn${selectedQuestionId === q.id ? ' outline-question-btn--active' : ''}`}
              onClick={() => onSelectQuestion(q.id, section.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectQuestion(q.id, section.id);
                }
              }}
            >
              <span className="outline-grip--inert" aria-hidden="true">
                <GripVertical size={10} strokeWidth={2} />
              </span>
              <span className="outline-question-label">{q.text}</span>
              {!isGeneral && (
                <span
                  className="outline-inline-actions"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="outline-inline-action outline-inline-action--danger"
                    aria-label={`Excluir pergunta ${q.text}`}
                    onClick={() => onDeleteQuestion(section, q)}
                  >
                    <Trash2 size={12} strokeWidth={2} />
                  </button>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

OutlineSectionItem.propTypes = {
  section: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
    questions: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string, text: PropTypes.string })),
  }).isRequired,
  isActive: PropTypes.bool,
  isGeneral: PropTypes.bool,
  selectedQuestionId: PropTypes.string,
  onSelectSection: PropTypes.func.isRequired,
  onSelectQuestion: PropTypes.func.isRequired,
  onDeleteSection: PropTypes.func.isRequired,
  onEditSection: PropTypes.func.isRequired,
  onDeleteQuestion: PropTypes.func.isRequired,
  dragHandlers: PropTypes.object,
};

/* ── CanvasEmptyBoard ────────────────────────────────────── */

const CanvasEmptyBoard = ({ variant, section, isGeneral, onAddSection, onAddQuestion, onPresetClick, savingSection, sectionForm, onSectionFormChange }) => {
  if (isGeneral) {
    return (
      <div className="canvas-empty-board">
        <p className="eyebrow canvas-empty-board-eyebrow">SOMENTE LEITURA</p>
        <p className="canvas-empty-board-title">Esta anamnese geral não pode ser editada</p>
        <p className="canvas-empty-board-desc">
          Use &ldquo;Copiar para minha coleção&rdquo; para criar uma versão editável.
        </p>
      </div>
    );
  }

  if (variant === 'no-section') {
    return (
      <div className="canvas-empty-board">
        <p className="eyebrow canvas-empty-board-eyebrow">PASSO 1 DE 3</p>
        <p className="canvas-empty-board-title">Crie sua primeira seção</p>
        <p className="canvas-empty-board-desc">
          Seções organizam perguntas por tema — histórico, treino, lesões.
        </p>
        <form onSubmit={onAddSection} className="canvas-empty-board-form">
          <input
            type="text"
            className="form-input"
            placeholder="Ex: Histórico clínico"
            value={sectionForm.title}
            onChange={(e) => onSectionFormChange(e.target.value)}
            aria-label="Título da seção"
            required
            disabled={savingSection}
          />
          <button type="submit" className="btn btn-primary" disabled={savingSection}>
            {savingSection ? 'Criando...' : '+ Criar primeira seção'}
          </button>
        </form>
      </div>
    );
  }

  // variant === 'no-question'
  const sectionEyebrow = section ? section.title.toUpperCase() : '';
  return (
    <div className="canvas-empty-board">
      <p className="eyebrow canvas-empty-board-eyebrow">{sectionEyebrow}</p>
      <p className="canvas-empty-board-title">Adicione a primeira pergunta</p>
      <p className="canvas-empty-board-desc">
        Escolha um tipo à direita ou use um preset abaixo.
      </p>
      <div className="canvas-empty-board-shortcuts">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onAddQuestion({ text: 'Digite a pergunta…', type: 'free_text', required: false, options: [] })}
        >
          + Texto Livre
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onAddQuestion({ text: 'Digite a pergunta…', type: 'dichotomous', required: false, options: [] })}
        >
          + Sim/Não
        </button>
      </div>
      <div className="canvas-empty-board-presets">
        {PRESETS.map(({ text, type }) => (
          <button
            key={text}
            type="button"
            className="preset-row"
            onClick={() => onPresetClick({ text, type, required: false, options: [] })}
          >
            <Plus size={12} strokeWidth={2} />
            {text}
          </button>
        ))}
      </div>
    </div>
  );
};

CanvasEmptyBoard.propTypes = {
  variant: PropTypes.string,
  section: PropTypes.shape({
    title: PropTypes.string,
  }),
  isGeneral: PropTypes.bool,
  onAddSection: PropTypes.func,
  onAddQuestion: PropTypes.func,
  onPresetClick: PropTypes.func,
  savingSection: PropTypes.bool,
  sectionForm: PropTypes.shape({ title: PropTypes.string }),
  onSectionFormChange: PropTypes.func,
};

/* ── AnamnesisDetail (main) ──────────────────────────────── */

const AnamnesisDetail = () => {
  const { anamnesisId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [anamnesis, setAnamnesis]             = useState(null);
  const [loading, setLoading]                 = useState(true);
  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState(null);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [sectionForm, setSectionForm]         = useState(defaultSectionForm());
  const [savingSection, setSavingSection]     = useState(false);
  const [confirmDialog, setConfirmDialog]     = useState(null);
  const [forkConflictDialog, setForkConflictDialog] = useState(false);
  const [forking, setForking]                 = useState(false);
  const [copying, setCopying]                 = useState(false);
  const [showPreview, setShowPreview]         = useState(false);
  const [activeTab, setActiveTab]             = useState('outline');
  const [addingQuestion, setAddingQuestion]   = useState(false);
  const [justCreatedQuestionId, setJustCreatedQuestionId] = useState(null);

  // Drag state for section reorder
  const dragSectionRef = useRef(null);
  const [dragOverId, setDragOverId]           = useState(null);

  const fetchAnamnesis = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const response = await api.get(`/trainer/anamneses/${anamnesisId}`);
      setAnamnesis(response.data);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
      navigate('/trainer/anamneses');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [anamnesisId, navigate, showToast]);

  useEffect(() => {
    fetchAnamnesis();
  }, [fetchAnamnesis]);

  // Auto-select first section and first question when anamnesis loads
  useEffect(() => {
    if (!anamnesis) return;
    const sorted = [...(anamnesis.sections ?? [])].sort((a, b) => a.order - b.order);
    if (selectedSectionId === null && sorted.length > 0) {
      const firstSection = sorted[0];
      setSelectedSectionId(firstSection.id);
      if (selectedQuestionId === null && (firstSection.questions ?? []).length > 0) {
        setSelectedQuestionId(firstSection.questions[0].id);
      }
      return;
    }
    if (selectedSectionId !== null && selectedQuestionId === null) {
      const activeSection = sorted.find((s) => s.id === selectedSectionId);
      if (activeSection && (activeSection.questions ?? []).length > 0) {
        setSelectedQuestionId(activeSection.questions[0].id);
      }
    }
  }, [anamnesis]); // eslint-disable-line react-hooks/exhaustive-deps

  const isStudentLinksConflict = (error) =>
    error.response?.status === 409 &&
    error.response?.data?.error === 'ANAMNESIS_HAS_STUDENT_LINKS';

  /* ── Section CRUD ─────────────────────────────────────── */

  const handleAddSection = async (e) => {
    e.preventDefault();
    setSavingSection(true);
    try {
      const response = await api.post(`/trainer/anamneses/${anamnesisId}/sections`, sectionForm);
      showToast('Seção adicionada com sucesso!', 'success');
      setSectionForm(defaultSectionForm());
      setShowSectionForm(false);
      await fetchAnamnesis({ silent: true });
      setSelectedSectionId(response.data.id ?? null);
      setSelectedQuestionId(null);
    } catch (error) {
      if (isStudentLinksConflict(error)) {
        setForkConflictDialog(true);
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
          if (selectedSectionId === section.id) {
            setSelectedSectionId(null);
            setSelectedQuestionId(null);
          }
          fetchAnamnesis({ silent: true });
        } catch (error) {
          if (isStudentLinksConflict(error)) {
            setForkConflictDialog(true);
          } else {
            showToast(error.userMessage || translateError(error), 'error');
          }
        }
      },
    });
  };

  const handleEditSection = async (sectionId, data) => {
    try {
      await api.patch(`/trainer/anamneses/${anamnesisId}/sections/${sectionId}`, data);
      showToast('Seção atualizada com sucesso!', 'success');
      fetchAnamnesis({ silent: true });
      return true;
    } catch (error) {
      if (isStudentLinksConflict(error)) {
        setForkConflictDialog(true);
      } else {
        showToast(error.userMessage || translateError(error), 'error');
      }
      return false;
    }
  };

  /* ── Question CRUD ────────────────────────────────────── */

  const handleAddQuestion = useCallback(async (sectionId, payload) => {
    if (!sectionId) {
      showToast('Selecione uma seção antes de adicionar uma pergunta.', 'error');
      return;
    }
    setAddingQuestion(true);
    try {
      const response = await api.post(
        `/trainer/anamneses/${anamnesisId}/sections/${sectionId}/questions`,
        payload,
      );
      showToast('Pergunta adicionada com sucesso!', 'success');
      await fetchAnamnesis({ silent: true });
      const newId = response.data?.id;
      if (newId) {
        setSelectedQuestionId(newId);
        setJustCreatedQuestionId(newId);
      }
      setActiveTab('canvas');
    } catch (error) {
      if (isStudentLinksConflict(error)) {
        setForkConflictDialog(true);
      } else {
        showToast(error.userMessage || translateError(error), 'error');
      }
    } finally {
      setAddingQuestion(false);
    }
  }, [anamnesisId, fetchAnamnesis, showToast]);

  /* ── Delete question ─────────────────────────────────── */

  const handleDeleteQuestion = useCallback((section, question) => {
    setConfirmDialog({
      message: `Excluir a pergunta "${question.text}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(
            `/trainer/anamneses/${anamnesisId}/sections/${section.id}/questions/${question.id}`,
          );
          showToast('Pergunta excluída com sucesso!', 'success');
          setSelectedQuestionId(null);
          fetchAnamnesis({ silent: true });
        } catch (error) {
          if (isStudentLinksConflict(error)) {
            setForkConflictDialog(true);
          } else {
            showToast(error.userMessage || translateError(error), 'error');
          }
        }
      },
    });
  }, [anamnesisId, fetchAnamnesis, showToast]);

  /* ── Canvas update callback ───────────────────────────── */

  const handleQuestionUpdated = useCallback((signal) => {
    if (signal === 'conflict') {
      setForkConflictDialog(true);
    } else {
      fetchAnamnesis({ silent: true });
    }
  }, [fetchAnamnesis]);

  /* ── Fork / Copy ─────────────────────────────────────── */

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

  /* ── Section drag-to-reorder ─────────────────────────── */

  const handleDragStart = (sectionId) => {
    dragSectionRef.current = sectionId;
  };

  const handleDragOver = (e, sectionId) => {
    e.preventDefault();
    setDragOverId(sectionId);
  };

  const handleDrop = async (targetId) => {
    setDragOverId(null);
    const sourceId = dragSectionRef.current;
    dragSectionRef.current = null;
    if (!sourceId || sourceId === targetId) return;

    const sorted = [...(anamnesis.sections ?? [])].sort((a, b) => a.order - b.order);
    const sourceIdx = sorted.findIndex((s) => s.id === sourceId);
    const targetIdx = sorted.findIndex((s) => s.id === targetId);
    if (sourceIdx === -1 || targetIdx === -1) return;

    const reordered = [...sorted];
    const [moved] = reordered.splice(sourceIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    const orderedIds = reordered.map((s) => s.id);

    // Optimistic update
    setAnamnesis((prev) => ({
      ...prev,
      sections: reordered.map((s, i) => ({ ...s, order: i })),
    }));

    try {
      await api.patch(`/trainer/anamneses/${anamnesisId}/sections/reorder`, { orderedIds });
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
      fetchAnamnesis({ silent: true }); // rollback
    }
  };

  /* ── Navigation helpers ───────────────────────────────── */

  const handleSelectSection = (sectionId) => {
    setSelectedSectionId((prev) => (prev === sectionId ? null : sectionId));
    setSelectedQuestionId(null);
  };

  const handleSelectQuestion = (questionId, sectionId) => {
    setSelectedSectionId(sectionId);
    setSelectedQuestionId(questionId);
    setActiveTab('canvas');
  };

  const navigateQuestion = (direction) => {
    const all = buildAllQuestions(sortedSections);
    const idx = all.findIndex((q) => q.id === selectedQuestionId);
    const nextIdx = idx + direction;
    if (nextIdx >= 0 && nextIdx < all.length) {
      const next = all[nextIdx];
      setSelectedQuestionId(next.id);
      setSelectedSectionId(next.sectionId);
    }
  };

  /* ── Render ───────────────────────────────────────────── */

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

  const selectedSection = sortedSections.find((s) => s.id === selectedSectionId) ?? null;
  const selectedQuestion = selectedSection
    ? (selectedSection.questions ?? []).find((q) => q.id === selectedQuestionId) ?? null
    : null;

  const allQuestions = buildAllQuestions(sortedSections);
  const selectedQuestionGlobalIdx = allQuestions.findIndex((q) => q.id === selectedQuestionId);

  const sectionForQuestion = selectedQuestionId
    ? sortedSections.find((s) => s.questions?.some((q) => q.id === selectedQuestionId))
    : selectedSection;

  const activeSectionId = sectionForQuestion?.id ?? selectedSectionId;

  /* ── Outline panel ──────────────────────────────────── */
  const outlinePanel = (
    <div className="editor-outline">
      <p className="eyebrow library-section-title">Seções</p>
      {sortedSections.map((section) => (
        <OutlineSectionItem
          key={section.id}
          section={section}
          isActive={selectedSectionId === section.id}
          isGeneral={isGeneral}
          selectedQuestionId={selectedQuestionId}
          onSelectSection={handleSelectSection}
          onSelectQuestion={handleSelectQuestion}
          onDeleteSection={handleDeleteSection}
          onEditSection={handleEditSection}
          onDeleteQuestion={handleDeleteQuestion}
          dragHandlers={{
            draggable: true,
            onDragStart: () => handleDragStart(section.id),
            onDragOver: (e) => handleDragOver(e, section.id),
            onDrop: () => handleDrop(section.id),
            onDragEnd: () => setDragOverId(null),
            style: dragOverId === section.id
              ? { opacity: 0.5, outline: `2px dashed var(--brand-primary)`, borderRadius: 'var(--radius-brand)' }
              : undefined,
          }}
        />
      ))}

      {!isGeneral && (
        <div className="outline-footer">
          {showSectionForm ? (
            <form onSubmit={handleAddSection} className="form" style={{ gap: 'var(--spacing-xs)' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Título da nova seção"
                value={sectionForm.title}
                onChange={(e) => setSectionForm((p) => ({ ...p, title: e.target.value }))}
                aria-label="Título da seção"
                required
                disabled={savingSection}
              />
              <div className="btn-group" style={{ marginTop: 'var(--spacing-xs)' }}>
                <button type="submit" className="btn btn-primary btn-sm" disabled={savingSection}>
                  {savingSection ? 'Salvando...' : 'Adicionar'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setShowSectionForm(false); setSectionForm(defaultSectionForm()); }}
                  disabled={savingSection}
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className="btn btn-secondary w-full btn-sm"
              onClick={() => setShowSectionForm(true)}
            >
              <Plus size={12} strokeWidth={2} /> Nova seção
            </button>
          )}
        </div>
      )}
    </div>
  );

  /* ── Canvas panel ───────────────────────────────────── */
  const activeSectionForBoard = sortedSections.find((s) => s.id === activeSectionId) ?? null;
  const activeSectionHasQuestions = (activeSectionForBoard?.questions ?? []).length > 0;

  const canvasPanel = (
    <div className="editor-canvas">
      {selectedQuestion ? (
        <>
          <CanvasQuestionCard
            key={selectedQuestion.id}
            question={selectedQuestion}
            sectionId={activeSectionId}
            anamnesisId={anamnesisId}
            isGeneral={isGeneral}
            autoFocus={justCreatedQuestionId === selectedQuestion.id}
            onAutoFocusConsumed={() => setJustCreatedQuestionId(null)}
            onUpdated={handleQuestionUpdated}
            onDeleteQuestion={() => handleDeleteQuestion(
              sortedSections.find((s) => s.id === activeSectionId),
              selectedQuestion,
            )}
          />
          <div className="canvas-nav">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => navigateQuestion(-1)}
              disabled={selectedQuestionGlobalIdx <= 0}
            >
              ← Anterior
            </button>
            <span className="canvas-nav-counter">
              {selectedQuestionGlobalIdx + 1} de {allQuestions.length}
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => navigateQuestion(1)}
              disabled={selectedQuestionGlobalIdx >= allQuestions.length - 1}
            >
              Próxima →
            </button>
          </div>
        </>
      ) : isGeneral ? (
        <CanvasEmptyBoard isGeneral />
      ) : sortedSections.length === 0 ? (
        <CanvasEmptyBoard
          variant="no-section"
          onAddSection={handleAddSection}
          savingSection={savingSection}
          sectionForm={sectionForm}
          onSectionFormChange={(val) => setSectionForm((p) => ({ ...p, title: val }))}
        />
      ) : !activeSectionHasQuestions ? (
        <CanvasEmptyBoard
          variant="no-question"
          section={activeSectionForBoard}
          onAddQuestion={(payload) => handleAddQuestion(activeSectionId, payload)}
          onPresetClick={(payload) => handleAddQuestion(activeSectionId, payload)}
        />
      ) : null}
    </div>
  );

  /* ── Library panel ──────────────────────────────────── */
  const libraryPanel = (
    <div className="editor-library">
      <p className="eyebrow library-section-title">TIPOS DE PERGUNTA</p>
      <div className="library-grid">
        {LIBRARY_TILES.map(({ type, icon: Icon, label }) => (
          <button
            key={type}
            type="button"
            className="library-tile"
            disabled={isGeneral || addingQuestion || !activeSectionId}
            onClick={() => handleAddQuestion(activeSectionId, { text: 'Digite a pergunta…', type, required: false, options: [] })}
            aria-label={`Adicionar pergunta ${label}`}
          >
            <Icon size={18} strokeWidth={2} />
            <span className="library-tile-label">{label}</span>
          </button>
        ))}
      </div>
      <hr className="library-divider" />
      <p className="eyebrow library-section-title">Presets Sugeridos</p>
      {PRESETS.map(({ text, type }) => (
        <button
          key={text}
          type="button"
          className="preset-row"
          disabled={isGeneral || addingQuestion || !activeSectionId}
          onClick={() => handleAddQuestion(activeSectionId, { text, type, required: false, options: [] })}
        >
          <Plus size={12} strokeWidth={2} />
          {text}
        </button>
      ))}
    </div>
  );

  return (
    <div>
      {/* Back button */}
      <div style={{ marginBottom: 'var(--spacing-md)' }}>
        <button
          onClick={() => navigate('/trainer/anamneses')}
          className="btn-back"
          aria-label="Voltar para anamneses"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Anamneses
        </button>
      </div>

      <div className="editor-shell">
        {/* Header */}
        <div className="editor-header">
          <div className="editor-header-main">
            <p className="eyebrow" style={{ marginBottom: 2 }}>
              Treinador › Anamneses › Editor
            </p>
            <div className="editor-title-row">
              <span className="editor-title">{anamnesis.title}</span>
              <span className="badge badge-neutral">v{anamnesis.version}</span>
              {isGeneral && <span className="badge badge-accent">Geral</span>}
              {anamnesis.parentId && !isGeneral && <span className="badge badge-neutral">Derivada</span>}
            </div>
            {isGeneral && (
              <p className="text-sm" style={{ color: 'var(--brand-steel)', marginTop: 'var(--spacing-xs)' }}>
                Esta é uma anamnese geral da plataforma e não pode ser editada.
              </p>
            )}
          </div>

          <div className="editor-header-actions">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowPreview(true)}
              disabled={sortedSections.length === 0}
            >
              <Eye size={14} strokeWidth={2} /> Pré-visualizar
            </button>
            {isGeneral ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleCopy}
                disabled={copying}
              >
                <Copy size={14} strokeWidth={2} />
                {copying ? 'Copiando...' : 'Copiar para minha coleção'}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleFork}
                disabled={forking}
              >
                <GitBranch size={14} strokeWidth={2} />
                {forking ? 'Criando...' : 'Nova versão'}
              </button>
            )}
          </div>
        </div>

        {/* Mobile tabs */}
        <div className="editor-mobile-tabs" role="tablist">
          {[
            { id: 'outline', label: 'Outline' },
            { id: 'canvas',  label: 'Canvas' },
            { id: 'tipos',   label: 'Tipos' },
          ].map(({ id, label }) => (
            <button
              key={id}
              role="tab"
              aria-selected={activeTab === id}
              className={`editor-mobile-tab${activeTab === id ? ' editor-mobile-tab--active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="editor-body">
          <div className={`editor-panel${activeTab === 'outline' ? ' editor-panel--active' : ''}`}>
            {outlinePanel}
          </div>
          <div className={`editor-panel${activeTab === 'canvas' ? ' editor-panel--active' : ''}`}>
            {canvasPanel}
          </div>
          <div className={`editor-panel${activeTab === 'tipos' ? ' editor-panel--active' : ''}`}>
            {libraryPanel}
          </div>
        </div>
      </div>

      {/* Confirm dialog */}
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

      {/* Fork conflict dialog */}
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

      {/* Preview modal */}
      {showPreview && (
        <AnamnesisPreviewModal
          anamnesis={anamnesis}
          open={showPreview}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
};

export default AnamnesisDetail;
