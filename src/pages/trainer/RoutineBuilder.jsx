import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import {
  ArrowLeft,
  ChevronDown,
  Cloud,
  Dumbbell,
  Edit3,
  MoreVertical,
  Plus,
  Save,
  X,
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import useRoutineBuilder from '../../hooks/useRoutineBuilder';
import useRoutineDraft from '../../hooks/useRoutineDraft';
import formatRelativeTime from '../../utils/relativeTime';
import ExerciseComposer from '../../components/ExerciseComposer';
import AddTrainingSheet from '../../components/AddTrainingSheet';
import { WEEK_DAY_OPTIONS_SHORT } from '../../constants/weekDays';
import { formatExerciseMeta } from '../../utils/exerciseMeta';
import { PROTOCOL_TYPE_OPTIONS, getProtocolTypeLabel } from '../../constants/protocolTypes';
import { TRAINING_LEVEL_OPTIONS, getLevelLabel } from '../../constants/trainingLevels';
import { GENDER_OPTIONS, getGenderLabel } from '../../constants/genderOrdination';

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEK_DAYS = [
  { key: 'sunday', label: 'Dom' },
  { key: 'monday', label: 'Seg' },
  { key: 'tuesday', label: 'Ter' },
  { key: 'wednesday', label: 'Qua' },
  { key: 'thursday', label: 'Qui' },
  { key: 'friday', label: 'Sex' },
  { key: 'saturday', label: 'Sáb' },
];

const DURATION_OPTIONS = [4, 6, 8, 10, 12, 16, 20, 24].map((n) => ({
  value: String(n),
  label: `${n} semanas`,
}));

const TRAINING_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// ─── IdentityChipPopover ──────────────────────────────────────────────────────

/**
 * Chip that shows a popover of enum options on click.
 * Empty state: dashed border, + icon, emptyLabel.
 * Filled state: mist bg, "LABEL: value".
 */
const IdentityChipPopover = ({
  label,
  value,
  displayValue,
  options,
  onChange,
  clearable,
  emptyLabel,
}) => {
  const [open, setOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  const readPos = useCallback(() => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    return { top: rect.bottom + 4, left: rect.left };
  }, []);

  const recalcPosition = useCallback(() => {
    const pos = readPos();
    if (pos) setPopoverPos(pos);
  }, [readPos]);

  useEffect(() => {
    if (!open) return;

    const handlePointerOutside = (e) => {
      const clickedTrigger = triggerRef.current && triggerRef.current.contains(e.target);
      const clickedPopover = popoverRef.current && popoverRef.current.contains(e.target);
      if (!clickedTrigger && !clickedPopover) setOpen(false);
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', recalcPosition);
    window.addEventListener('scroll', recalcPosition, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', recalcPosition);
      window.removeEventListener('scroll', recalcPosition, true);
    };
  }, [open, recalcPosition]);

  const handleSelect = (v) => {
    onChange(v || null);
    setOpen(false);
  };

  const handleToggle = useCallback(() => {
    if (open) {
      setOpen(false);
      return;
    }
    const pos = readPos();
    if (pos) setPopoverPos(pos);
    setOpen(true);
  }, [open, readPos]);

  const isFilled = !!value;

  const popover = open
    ? createPortal(
        <div
          ref={popoverRef}
          className="identity-chip-popover"
          role="listbox"
          aria-label={`Escolher ${label}`}
          style={{
            position: 'fixed',
            top: popoverPos.top,
            left: popoverPos.left,
            zIndex: 1200,
          }}
        >
          {clearable && isFilled && (
            <button
              type="button"
              className="identity-chip-popover-item identity-chip-popover-item--clear"
              role="option"
              aria-selected={false}
              onClick={() => handleSelect(null)}
            >
              — Limpar —
            </button>
          )}
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`identity-chip-popover-item${value === opt.value ? ' identity-chip-popover-item--active' : ''}`}
              role="option"
              aria-selected={value === opt.value}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>,
        document.body
      )
    : null;

  return (
    <div className="weekday-chip-wrap">
      <button
        ref={triggerRef}
        type="button"
        className={`identity-chip${isFilled ? '' : ' identity-chip--empty'}`}
        onClick={handleToggle}
        aria-label={`Definir ${emptyLabel}`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {isFilled ? (
          <>
            <span className="identity-chip-label">{label}:</span>
            <span className="identity-chip-value">{displayValue}</span>
          </>
        ) : (
          <>
            <Plus size={12} strokeWidth={2} aria-hidden="true" />
            {emptyLabel}
          </>
        )}
      </button>

      {popover}
    </div>
  );
};

IdentityChipPopover.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string,
  displayValue: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.shape({ value: PropTypes.string.isRequired, label: PropTypes.string.isRequired })
  ).isRequired,
  onChange: PropTypes.func.isRequired,
  clearable: PropTypes.bool,
  emptyLabel: PropTypes.string.isRequired,
};

IdentityChipPopover.defaultProps = {
  value: null,
  displayValue: null,
  clearable: false,
};

// ─── DescriptionChipEditor ────────────────────────────────────────────────────

/**
 * Chip that, when clicked, expands an inline textarea below the identity strip
 * for free-text description entry.
 */
const DescriptionChipEditor = ({ value, onSave }) => {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState('');
  const textareaRef = useRef(null);

  const handleOpen = () => {
    setDraft(value || '');
    setExpanded(true);
  };

  const handleSave = useCallback(() => {
    onSave(draft);
    setExpanded(false);
  }, [draft, onSave]);

  const handleCancel = () => {
    setExpanded(false);
    setDraft('');
  };

  useEffect(() => {
    if (expanded && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [expanded]);

  const isFilled = !!value;

  return (
    <>
      <button
        type="button"
        className={`identity-chip identity-chip--desktop-only${isFilled ? '' : ' identity-chip--empty'}`}
        onClick={handleOpen}
        aria-label="Definir Descrição"
        aria-expanded={expanded}
      >
        {isFilled ? (
          <>
            <span className="identity-chip-label">Desc.:</span>
            <span className="identity-chip-value">{value.length > 20 ? `${value.slice(0, 20)}…` : value}</span>
          </>
        ) : (
          <>
            <Plus size={12} strokeWidth={2} aria-hidden="true" />
            Descrição
          </>
        )}
      </button>

      {expanded && (
        <div className="identity-description-expander">
          <span className="identity-description-expander-label">Descrição da rotina</span>
          <textarea
            ref={textareaRef}
            className="identity-description-textarea"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Descreva o objetivo e perfil da rotina…"
            aria-label="Descrição da rotina"
          />
          <div className="identity-description-actions">
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={handleCancel}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={handleSave}
            >
              Salvar
            </button>
          </div>
        </div>
      )}
    </>
  );
};

DescriptionChipEditor.propTypes = {
  value: PropTypes.string,
  onSave: PropTypes.func.isRequired,
};

DescriptionChipEditor.defaultProps = {
  value: null,
};

// ─── WeekdayChip ──────────────────────────────────────────────────────────────

const WeekdayChip = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  const label = useMemo(() => {
    if (!value) return 'Sem dia';
    const found = WEEK_DAY_OPTIONS_SHORT.find(
      (o) => o.value === value.toLowerCase()
    );
    return found ? found.label : value;
  }, [value]);

  const readPos = useCallback(() => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    return { top: rect.bottom + 4, left: rect.left };
  }, []);

  const handleToggle = useCallback(
    (e) => {
      e.stopPropagation();
      if (open) {
        setOpen(false);
        return;
      }
      const pos = readPos();
      if (pos) setPopoverPos(pos);
      setOpen(true);
    },
    [open, readPos]
  );

  useEffect(() => {
    if (!open) return;

    const recalcPosition = () => {
      const pos = readPos();
      if (pos) setPopoverPos(pos);
    };

    const handlePointerOutside = (e) => {
      const clickedTrigger = triggerRef.current && triggerRef.current.contains(e.target);
      const clickedPopover = popoverRef.current && popoverRef.current.contains(e.target);
      if (!clickedTrigger && !clickedPopover) setOpen(false);
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', recalcPosition);
    window.addEventListener('scroll', recalcPosition, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', recalcPosition);
      window.removeEventListener('scroll', recalcPosition, true);
    };
  }, [open, readPos]);

  const handleSelect = (dayValue) => {
    onChange(dayValue || null);
    setOpen(false);
  };

  const popover = open
    ? createPortal(
        <div
          ref={popoverRef}
          className="weekday-popover"
          role="listbox"
          aria-label="Escolher dia"
          style={{
            position: 'fixed',
            top: popoverPos.top,
            left: popoverPos.left,
            zIndex: 1200,
          }}
        >
          <button
            type="button"
            className="weekday-popover-item weekday-popover-item--clear"
            role="option"
            aria-selected={!value}
            onClick={() => handleSelect(null)}
          >
            Não definido
          </button>
          {WEEK_DAY_OPTIONS_SHORT.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`weekday-popover-item${value === opt.value ? ' weekday-popover-item--active' : ''}`}
              role="option"
              aria-selected={value === opt.value}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`weekday-chip${value ? ' weekday-chip--set' : ' weekday-chip--unassigned'}`}
        onClick={handleToggle}
        aria-label={`Dia da semana: ${label}`}
        aria-expanded={open}
      >
        {label}
      </button>
      {popover}
    </>
  );
};

WeekdayChip.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};

WeekdayChip.defaultProps = {
  value: null,
};

// ─── InlineMenu ───────────────────────────────────────────────────────────────

/**
 * Generic three-dot menu used in both TrainingItem and ExerciseRow.
 * Uses createPortal + position:fixed to escape overflow:hidden ancestors.
 * items: [{ label, danger, onClick }]
 * onOpen: optional callback fired when menu transitions closed→open.
 */
const InlineMenu = ({ ariaLabel, items, onOpen }) => {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const readPos = useCallback(() => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    return { top: rect.bottom + 4, left: rect.left };
  }, []);

  const recalcPosition = useCallback(() => {
    const pos = readPos();
    if (pos) setMenuPos(pos);
  }, [readPos]);

  useEffect(() => {
    if (!open) return;

    const handlePointerOutside = (e) => {
      const clickedTrigger = triggerRef.current && triggerRef.current.contains(e.target);
      const clickedMenu = menuRef.current && menuRef.current.contains(e.target);
      if (!clickedTrigger && !clickedMenu) setOpen(false);
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', recalcPosition);
    window.addEventListener('scroll', recalcPosition, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', recalcPosition);
      window.removeEventListener('scroll', recalcPosition, true);
    };
  }, [open, recalcPosition]);

  const handleTriggerClick = useCallback(
    (e) => {
      e.stopPropagation();
      setOpen((prev) => {
        const next = !prev;
        if (next) {
          const pos = readPos();
          if (pos) setMenuPos(pos);
          if (onOpen) onOpen();
        }
        return next;
      });
    },
    [onOpen, readPos]
  );

  const dropdown = open
    ? createPortal(
        <div
          ref={menuRef}
          className="row-menu-dropdown"
          role="menu"
          style={{
            position: 'fixed',
            top: menuPos.top,
            left: menuPos.left,
            zIndex: 1200,
          }}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={`row-menu-item${item.danger ? ' row-menu-item--danger' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                item.onClick();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>,
        document.body
      )
    : null;

  return (
    <div className="row-menu">
      <button
        ref={triggerRef}
        type="button"
        className="row-menu-trigger"
        onClick={handleTriggerClick}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreVertical size={16} strokeWidth={2} />
      </button>
      {dropdown}
    </div>
  );
};

InlineMenu.propTypes = {
  ariaLabel: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      danger: PropTypes.bool,
      onClick: PropTypes.func.isRequired,
    })
  ).isRequired,
  onOpen: PropTypes.func,
};

InlineMenu.defaultProps = {
  onOpen: null,
};

// ─── ExerciseRow ──────────────────────────────────────────────────────────────

const ExerciseRow = ({ ex, index, onEdit, onDelete }) => {
  const name = ex.name || ex.exerciseTemplate?.name || '—';
  const meta = formatExerciseMeta(ex.exerciseTemplate || ex);

  const menuItems = [
    { label: 'Editar exercício', onClick: () => onEdit(ex) },
    { label: 'Excluir exercício', danger: true, onClick: () => onDelete(ex) },
  ];

  return (
    <div className="exercise-row-wide" role="listitem">
      <span className="exercise-row-index">{index + 1}</span>
      <div className="exercise-row-wide-body">
        <span className="exercise-row-wide-name">{name}</span>
        {meta && <span className="exercise-row-wide-meta">{meta}</span>}
      </div>
      <div className="exercise-row-menu-wrap">
        <InlineMenu ariaLabel={`Opções de ${name}`} items={menuItems} />
      </div>
    </div>
  );
};

ExerciseRow.propTypes = {
  ex: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

// ─── TrainingItem ─────────────────────────────────────────────────────────────

const TrainingItem = ({
  training,
  index,
  exerciseTemplates,
  saving,
  expanded,
  onToggleExpand,
  onEditTraining,
  onChangeWeekDay,
  onDeleteTraining,
  onAddExercise,
  onEditExercise,
  onImportFromLibrary,
  onDeleteExercise,
}) => {
  const [composerState, setComposerState] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const exercises = training.exercises || [];
  const letter = TRAINING_LETTERS[index] || String(index + 1);

  const readinessClass = useMemo(() => {
    if (exercises.length === 0) return '';
    if (exercises.length < 3) return 'training-item--partial';
    return 'training-item--ready';
  }, [exercises.length]);

  const handleAddExercise = async (payload) => {
    await onAddExercise(payload);
    setComposerState(null);
  };

  const handleEditExercise = async (exId, payload) => {
    await onEditExercise(exId, payload);
    setComposerState(null);
  };

  const handleImport = async (templateIds) => {
    await onImportFromLibrary(templateIds);
    setComposerState(null);
  };

  const handleRequestDeleteExercise = (ex) => {
    const name = ex.name || ex.exerciseTemplate?.name || 'exercício';
    setConfirmDialog({
      message: `Excluir "${name}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        await onDeleteExercise(ex.id);
      },
    });
  };

  const handleRequestDeleteTraining = () => {
    setConfirmDialog({
      message: `Excluir treino "${training.name}"? Esta ação não pode ser desfeita.`,
      onConfirm: () => {
        setConfirmDialog(null);
        onDeleteTraining();
      },
    });
  };

  const trainingMenuItems = [
    { label: 'Editar treino', onClick: () => onEditTraining(training) },
    { label: 'Excluir treino', danger: true, onClick: handleRequestDeleteTraining },
  ];

  const composerEditing =
    composerState && typeof composerState === 'object' && composerState.editing
      ? composerState.editing
      : null;

  return (
    <>
      <div
        className={`training-item${readinessClass ? ` ${readinessClass}` : ''}${expanded ? ' training-item--expanded' : ''}`}
      >
        {/* ── Head ── */}
        <div
          className="training-item-head"
          onClick={onToggleExpand}
          role="button"
          aria-expanded={expanded}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggleExpand();
            }
          }}
        >
          <span className="training-item-letter" aria-hidden="true">
            {letter}
          </span>

          <div className="training-item-main">
            <div className="training-item-title-row">
              <span className="training-item-title">{training.name || '—'}</span>
            </div>

            <div className="training-item-meta">
              <WeekdayChip
                value={training.weekDay}
                onChange={onChangeWeekDay}
              />
              <span className="training-item-meta-sep" aria-hidden="true">·</span>
              <span className="training-item-meta-stat">
                {exercises.length} ex
              </span>
            </div>
          </div>

          <div className="training-item-actions" onClick={(e) => e.stopPropagation()}>
            <div className="training-item-menu-wrap">
              <InlineMenu
                ariaLabel={`Opções do treino ${training.name}`}
                items={trainingMenuItems}
                onOpen={() => { if (!expanded) onToggleExpand(); }}
              />
            </div>
            <button
              type="button"
              className={`training-item-chevron${expanded ? ' training-item-chevron--open' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              aria-label={expanded ? 'Recolher treino' : 'Expandir treino'}
            >
              <ChevronDown size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        {expanded && (
          <div className="training-item-body">
            {exercises.length > 0 ? (
              <div className="exercise-list-wide" role="list" aria-label="Exercícios">
                {exercises.map((ex, i) => (
                  <ExerciseRow
                    key={ex.id}
                    ex={ex}
                    index={i}
                    onEdit={(exercise) => setComposerState({ editing: exercise })}
                    onDelete={handleRequestDeleteExercise}
                  />
                ))}
              </div>
            ) : (
              composerState === null && (
                <div className="training-empty-hero">
                  <div className="training-empty-hero-icon" aria-hidden="true">
                    <Dumbbell size={20} strokeWidth={2} />
                  </div>
                  <p className="training-empty-hero-title">Nenhum exercício</p>
                  <p className="training-empty-hero-desc">
                    Adicione exercícios a este treino para começar.
                  </p>
                  <div className="training-empty-hero-actions">
                    <button
                      type="button"
                      className="btn-primary btn-sm"
                      onClick={() => setComposerState('create')}
                    >
                      <Plus size={14} strokeWidth={2} aria-hidden="true" />
                      Adicionar exercício
                    </button>
                  </div>
                </div>
              )
            )}

            {/* Composer */}
            {(composerState === 'create' || composerEditing) ? (
              <ExerciseComposer
                snapshot={composerEditing || null}
                exerciseTemplates={exerciseTemplates}
                saving={saving}
                onSubmitCreate={handleAddExercise}
                onSubmitEdit={handleEditExercise}
                onSubmitFromLibrary={handleImport}
                onCancel={() => setComposerState(null)}
              />
            ) : exercises.length > 0 && (
              <button
                type="button"
                className="inline-add-btn-wide"
                onClick={() => setComposerState('create')}
              >
                <Plus size={14} strokeWidth={2} aria-hidden="true" />
                Adicionar exercício
              </button>
            )}
          </div>
        )}
      </div>

      {/* Confirm dialog */}
      {confirmDialog && (
        <div className="overlay" onClick={() => setConfirmDialog(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-dialog-message">{confirmDialog.message}</p>
            <div className="confirm-dialog-actions">
              <button
                type="button"
                className="btn-danger"
                onClick={confirmDialog.onConfirm}
              >
                Confirmar
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setConfirmDialog(null)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

TrainingItem.propTypes = {
  training: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    weekDay: PropTypes.string,
    exercises: PropTypes.array,
  }).isRequired,
  index: PropTypes.number.isRequired,
  exerciseTemplates: PropTypes.arrayOf(PropTypes.object).isRequired,
  saving: PropTypes.bool.isRequired,
  expanded: PropTypes.bool.isRequired,
  onToggleExpand: PropTypes.func.isRequired,
  onEditTraining: PropTypes.func.isRequired,
  onChangeWeekDay: PropTypes.func.isRequired,
  onDeleteTraining: PropTypes.func.isRequired,
  onAddExercise: PropTypes.func.isRequired,
  onEditExercise: PropTypes.func.isRequired,
  onImportFromLibrary: PropTypes.func.isRequired,
  onDeleteExercise: PropTypes.func.isRequired,
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const BuilderTopbar = ({
  name,
  isEditing,
  saveStatusLabel,
  onTitleClick,
  onBlur,
  onChange,
  onBack,
  onCancel,
  onSave,
  saving,
  canSave,
}) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const isEmpty = !name || !name.trim();

  return (
    <div className="builder-topbar">
      <button
        className="builder-topbar-back"
        onClick={onBack}
        aria-label="Voltar para rotinas"
      >
        <ArrowLeft size={20} strokeWidth={2} />
      </button>

      <div className="builder-title-wrap">
        <div className="builder-eyebrow">Nova rotina · Rascunho</div>
        <div className="builder-title-input-wrap" onClick={onTitleClick}>
          {isEditing ? (
            <input
              ref={inputRef}
              className="builder-title-input"
              value={name}
              onChange={(e) => onChange(e.target.value)}
              onBlur={onBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              placeholder="Nomear rotina…"
              aria-label="Nome da rotina"
            />
          ) : (
            <span
              className={`builder-title-display${isEmpty ? ' builder-title-display--empty' : ''}`}
            >
              {isEmpty ? 'Nomear rotina…' : name}
            </span>
          )}
          {!isEditing && (
            <Edit3
              size={14}
              strokeWidth={2}
              className="builder-title-edit-icon"
              aria-hidden="true"
            />
          )}
        </div>
      </div>

      {/* Desktop: save status + action buttons (hidden on mobile via CSS) */}
      <div className="builder-topbar-actions builder-topbar-actions--responsive">
        <span className="builder-save-status">
          <Cloud size={12} strokeWidth={2} aria-hidden="true" />
          {saveStatusLabel}
        </span>
        <button className="btn-secondary" onClick={onCancel}>
          <X size={16} strokeWidth={2} aria-hidden="true" />
          Cancelar
        </button>
        <button
          className="btn-primary"
          onClick={onSave}
          disabled={!canSave || saving}
          aria-disabled={!canSave}
        >
          <Save size={16} strokeWidth={2} aria-hidden="true" />
          {saving ? 'Salvando…' : 'Salvar rotina'}
        </button>
      </div>

    </div>
  );
};

BuilderTopbar.propTypes = {
  name: PropTypes.string.isRequired,
  isEditing: PropTypes.bool.isRequired,
  saveStatusLabel: PropTypes.string.isRequired,
  onTitleClick: PropTypes.func.isRequired,
  onBlur: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  saving: PropTypes.bool.isRequired,
  canSave: PropTypes.bool.isRequired,
};

// ─── IdentityStrip ────────────────────────────────────────────────────────────

const IdentityStrip = ({ routineData, onUpdateMeta }) => {
  const type = routineData?.type || null;
  const trainingLevel = routineData?.trainingLevel || null;
  const defaultDurationWeeks = routineData?.defaultDurationWeeks
    ? String(routineData.defaultDurationWeeks)
    : null;
  const genderOrdination = routineData?.genderOrdination || null;
  const description = routineData?.description || null;

  return (
    <>
      <div className="builder-identity-strip">
        <span className="identity-strip-label">Identidade:</span>

        <IdentityChipPopover
          label="Tipo"
          value={type}
          displayValue={getProtocolTypeLabel(type)}
          options={PROTOCOL_TYPE_OPTIONS}
          onChange={(v) => onUpdateMeta({ type: v })}
          clearable
          emptyLabel="Tipo"
        />

        <IdentityChipPopover
          label="Nível"
          value={trainingLevel}
          displayValue={getLevelLabel(trainingLevel)}
          options={TRAINING_LEVEL_OPTIONS}
          onChange={(v) => onUpdateMeta({ trainingLevel: v })}
          clearable
          emptyLabel="Nível"
        />

        <IdentityChipPopover
          label="Dur."
          value={defaultDurationWeeks}
          displayValue={defaultDurationWeeks ? `${defaultDurationWeeks} sem.` : null}
          options={DURATION_OPTIONS}
          onChange={(v) =>
            onUpdateMeta({ defaultDurationWeeks: v ? parseInt(v, 10) : null })
          }
          clearable
          emptyLabel="Duração"
        />

        <IdentityChipPopover
          label="Gênero"
          value={genderOrdination}
          displayValue={getGenderLabel(genderOrdination)}
          options={GENDER_OPTIONS}
          onChange={(v) => onUpdateMeta({ genderOrdination: v })}
          clearable
          emptyLabel="Gênero"
        />

        <DescriptionChipEditor
          value={description}
          onSave={(desc) => onUpdateMeta({ description: desc || null })}
        />
      </div>
    </>
  );
};

IdentityStrip.propTypes = {
  routineData: PropTypes.shape({
    type: PropTypes.string,
    trainingLevel: PropTypes.string,
    defaultDurationWeeks: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    genderOrdination: PropTypes.string,
    description: PropTypes.string,
  }),
  onUpdateMeta: PropTypes.func.isRequired,
};

IdentityStrip.defaultProps = {
  routineData: null,
};

const trainingShape = PropTypes.shape({
  id: PropTypes.string,
  weekDay: PropTypes.string,
  exercises: PropTypes.array,
});

const BuilderStatsRow = ({ trainings }) => {
  const trainingCount = trainings.length;
  const exerciseCount = trainings.reduce(
    (sum, t) => sum + (t.exercises?.length || 0),
    0
  );
  const unassignedCount = trainings.filter((t) => !t.weekDay).length;
  const coveredDays = new Set(
    trainings.filter((t) => t.weekDay).map((t) => t.weekDay)
  ).size;

  const assignedSub = () => {
    if (trainingCount === 0) return '—';
    if (unassignedCount > 0) return `${unassignedCount} sem dia`;
    return 'todos com dia';
  };

  return (
    <div className="builder-stats-row">
      <div className={`builder-stat-card${trainingCount > 0 ? ' builder-stat-card--accent' : ''}`}>
        <span className="builder-stat-card-label">Treinos</span>
        <span className="builder-stat-card-value">{trainingCount}</span>
        <span className="builder-stat-card-sub">na rotina</span>
      </div>
      <div className="builder-stat-card">
        <span className="builder-stat-card-label">Exercícios</span>
        <span className="builder-stat-card-value">{exerciseCount}</span>
        <span className="builder-stat-card-sub">Total</span>
      </div>
      <div className={`builder-stat-card${unassignedCount > 0 ? ' builder-stat-card--warn' : ''}`}>
        <span className="builder-stat-card-label">Dias atribuídos</span>
        <span className="builder-stat-card-value">
          {coveredDays}
          <span className="builder-stat-card-value-unit">/{trainingCount || '—'}</span>
        </span>
        <span className="builder-stat-card-sub">{assignedSub()}</span>
      </div>
    </div>
  );
};

BuilderStatsRow.propTypes = {
  trainings: PropTypes.arrayOf(trainingShape).isRequired,
};

const WeekOverview = ({ trainings }) => {
  const dayCount = (dayKey) =>
    trainings.filter((t) => t.weekDay?.toLowerCase() === dayKey).length;

  return (
    <div className="week-overview">
      {WEEK_DAYS.map((day) => {
        const count = dayCount(day.key);
        const isEmpty = count === 0;
        return (
          <div
            key={day.key}
            className={`week-overview-cell${isEmpty ? ' week-overview-cell--empty' : ' week-overview-cell--active'}`}
          >
            <span className="week-overview-day">{day.label}</span>
            <span className="week-overview-stat">{isEmpty ? '–' : count}</span>
            <span className="week-overview-sub">
              {isEmpty ? 'Sem treino' : count === 1 ? '1 treino' : `${count} treinos`}
            </span>
          </div>
        );
      })}
    </div>
  );
};

WeekOverview.propTypes = {
  trainings: PropTypes.arrayOf(trainingShape).isRequired,
};

const FirstTrainingHero = ({ onAddTraining }) => (
  <div className="first-training-hero">
    <div className="first-training-hero-icon">
      <Dumbbell size={26} strokeWidth={2} aria-hidden="true" />
    </div>
    {/* Mobile title — hidden on desktop via CSS */}
    <div className="first-training-hero-title first-training-hero-title--mobile">
      Comece pelo treino
    </div>
    {/* Desktop title — hidden on mobile via CSS */}
    <div className="first-training-hero-title first-training-hero-title--desktop-only">
      Comece pelo treino — não pelo dia
    </div>
    <div className="first-training-hero-description">
      Crie <strong>Treino A, B, C</strong>… adicione exercícios e, quando quiser, atribua
      dias da semana a cada um. A distribuição acima mostra a semana em tempo real.
    </div>
    <button
      className="btn-primary first-training-hero-cta"
      onClick={onAddTraining}
    >
      <Plus size={16} strokeWidth={2} aria-hidden="true" />
      {/* Mobile label */}
      <span className="first-training-hero-cta-label--mobile">Adicionar treino</span>
      {/* Desktop label */}
      <span className="first-training-hero-cta-label--desktop">
        Adicionar primeiro treino
      </span>
    </button>
  </div>
);

FirstTrainingHero.propTypes = {
  onAddTraining: PropTypes.func.isRequired,
};

const ReadinessLegend = () => (
  <span className="readiness-legend-inline" aria-hidden="true">
    <span>Borda do card:</span>
    <span className="readiness-legend-inline-item">
      <span className="readiness-legend-inline-bar readiness-legend-inline-bar--empty" />
      Vazio
    </span>
    <span className="readiness-legend-inline-item">
      <span className="readiness-legend-inline-bar readiness-legend-inline-bar--partial" />
      Parcial
    </span>
    <span className="readiness-legend-inline-item">
      <span className="readiness-legend-inline-bar readiness-legend-inline-bar--ready" />
      Pronto
    </span>
  </span>
);

// ─── Main component ───────────────────────────────────────────────────────────

const RoutineBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const routine = useRoutineBuilder(id || null);

  const [titleName, setTitleName] = useState('');
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [addTrainingSheetOpen, setAddTrainingSheetOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState(null);

  // Sync title from API when edit-mode data first arrives.
  const loadedName = routine.data?.name;
  useEffect(() => {
    if (loadedName && !titleName) {
      setTitleName(loadedName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedName]);

  // ── Derived state ────────────────────────────────────────────────────────

  const trainings = useMemo(
    () => routine.data?.trainings || [],
    [routine.data?.trainings]
  );
  const hasName = !!(titleName && titleName.trim());
  const hasTrainings = trainings.length > 0;
  const canSave = hasName && hasTrainings;

  // ── Draft meta (all identity fields except trainings) ────────────────────

  const draftMeta = useMemo(
    () => ({
      type: routine.data?.type || '',
      trainingLevel: routine.data?.trainingLevel || '',
      defaultDurationWeeks: routine.data?.defaultDurationWeeks || '',
      genderOrdination: routine.data?.genderOrdination || '',
      description: routine.data?.description || '',
    }),
    [
      routine.data?.type,
      routine.data?.trainingLevel,
      routine.data?.defaultDurationWeeks,
      routine.data?.genderOrdination,
      routine.data?.description,
    ]
  );

  // ── Autosave draft (create mode only) ───────────────────────────────────

  const handleRestore = useCallback(
    ({ name: draftName, meta, trainingIds, trainingOverrides, createdTrainingIds: draftCreated, junctionsAddedToImported: draftJunctions }) => {
      if (draftName) setTitleName(draftName);
      if (meta) routine.updateMeta(meta);
      if (trainingIds?.length) routine.importTrainingsFromLibrary(trainingIds, trainingOverrides || {});
      routine.restoreSessionTracking({
        createdTrainingIds: draftCreated || [],
        junctionsAddedToImported: draftJunctions || [],
      });
    },
    [routine]
  );

  const draft = useRoutineDraft({
    enabled: !id && !routine.loading,
    name: titleName,
    meta: draftMeta,
    trainings,
    trainingTemplates: routine.trainingTemplates,
    createdTrainingIds: routine.createdTrainingIds,
    junctionsAddedToImported: routine.junctionsAddedToImported,
    onRestore: handleRestore,
  });

  const saveStatusLabel = id
    ? 'Editando rotina'
    : draft.lastSaved
      ? `Rascunho salvo ${formatRelativeTime(draft.lastSaved)}`
      : 'Pronto para salvar';

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleBack = useCallback(
    () => navigate('/trainer/routines'),
    [navigate]
  );

  const handleCancel = useCallback(
    () => navigate('/trainer/routines'),
    [navigate]
  );

  const handleTitleClick = useCallback(() => {
    setIsTitleEditing(true);
  }, []);

  const handleTitleBlur = useCallback(() => {
    setIsTitleEditing(false);
    routine.updateMeta({ name: titleName });
  }, [routine, titleName]);

  const handleCreateTraining = useCallback(
    async (payload) => {
      const created = await routine.createTraining(payload);
      if (created?.id) setExpandedId(created.id);
      return created;
    },
    [routine]
  );

  const handleImportTrainings = useCallback(
    async (ids) => {
      const imported = await routine.importTrainingsFromLibrary(ids);
      return imported;
    },
    [routine]
  );

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    try {
      await routine.saveRoutine({ name: titleName }, trainings);
      draft.clearDraft();
      showToast('Rotina salva.', 'success');
      navigate('/trainer/routines');
    } catch {
      // error already set inside the hook
    }
  }, [canSave, routine, titleName, trainings, draft, showToast, navigate]);

  const handleToggleExpand = useCallback((trainingId) => {
    setExpandedId((prev) => (prev === trainingId ? null : trainingId));
  }, []);

  const handleOpenEditTraining = useCallback((training) => {
    setEditingTraining(training);
    setAddTrainingSheetOpen(true);
  }, []);

  const handleUpdateTraining = useCallback(
    async (id, payload) => {
      await routine.updateTraining(id, payload);
    },
    [routine]
  );

  // ── Loading state (edit mode) ────────────────────────────────────────────

  if (routine.loading) {
    return (
      <div className="builder-shell">
        <div className="loading-screen">
          <span className="loading-text">Carregando...</span>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="builder-shell">
      <BuilderTopbar
        name={titleName}
        isEditing={isTitleEditing}
        saveStatusLabel={saveStatusLabel}
        onTitleClick={handleTitleClick}
        onBlur={handleTitleBlur}
        onChange={setTitleName}
        onBack={handleBack}
        onCancel={handleCancel}
        onSave={handleSave}
        saving={routine.saving}
        canSave={canSave}
      />

      <IdentityStrip
        routineData={routine.data}
        onUpdateMeta={routine.updateMeta}
      />

      <BuilderStatsRow trainings={trainings} />

      <div className="training-canvas">
        {/* Week overview section */}
        <div className="canvas-section-header">
          <span className="canvas-section-title">
            Distribuição semanal{' '}
            <span className="canvas-section-title-count">
              {trainings.filter((t) => t.weekDay).length} / 7
            </span>
          </span>
          <span className="canvas-section-hint">
            O dia é opcional. Você pode criar toda a rotina sem atribuir.
          </span>
        </div>

        <WeekOverview trainings={trainings} />

        {/* Training list section */}
        <div className="canvas-section-header builder-canvas-trainings-header">
          <span className="canvas-section-title">
            Treinos da rotina{' '}
            <span className="canvas-section-title-count">{trainings.length}</span>
          </span>
          <ReadinessLegend />
        </div>

        {trainings.length === 0 && (
          <FirstTrainingHero onAddTraining={() => setAddTrainingSheetOpen(true)} />
        )}

        {trainings.length > 0 && (() => {
          const assignedTrainings = trainings.filter((t) => t.weekDay);
          const unassignedTrainings = trainings.filter((t) => !t.weekDay);
          const showUnassignedHeader = assignedTrainings.length > 0 && unassignedTrainings.length > 0;

          const renderTrainingItem = (t, i) => (
            <TrainingItem
              key={t.id}
              training={t}
              index={i}
              exerciseTemplates={routine.exerciseTemplates}
              saving={routine.saving}
              expanded={expandedId === t.id}
              onToggleExpand={() => handleToggleExpand(t.id)}
              onEditTraining={handleOpenEditTraining}
              onChangeWeekDay={(weekDay) => routine.updateTrainingWeekDay(t.id, weekDay)}
              onDeleteTraining={() => routine.deleteTraining(t.id)}
              onAddExercise={(payload) => routine.addExercise(t.id, payload)}
              onEditExercise={(exId, payload) => routine.updateExercise(t.id, exId, payload)}
              onImportFromLibrary={(ids) =>
                Promise.all(ids.map((tmplId) => routine.addExerciseFromTemplate(t.id, tmplId)))
              }
              onDeleteExercise={(exId) => routine.deleteExercise(t.id, exId)}
            />
          );

          return (
            <div className="training-list">
              {assignedTrainings.map((t, i) => renderTrainingItem(t, i))}

              {showUnassignedHeader && (
                <div className="training-group-header">
                  <span className="training-group-title training-group-title--unassigned">
                    Sem dia atribuído
                  </span>
                  <span className="canvas-section-title-count">
                    {unassignedTrainings.length}
                  </span>
                </div>
              )}

              {unassignedTrainings.map((t, i) =>
                renderTrainingItem(t, assignedTrainings.length + i)
              )}
            </div>
          );
        })()}

        {trainings.length > 0 && (
          <button
            type="button"
            className="add-training-cta"
            onClick={() => setAddTrainingSheetOpen(true)}
          >
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            Adicionar treino
          </button>
        )}
      </div>

      <AddTrainingSheet
        open={addTrainingSheetOpen}
        onClose={() => {
          setAddTrainingSheetOpen(false);
          setEditingTraining(null);
        }}
        onCreate={handleCreateTraining}
        onUpdate={handleUpdateTraining}
        onImport={handleImportTrainings}
        trainingTemplates={routine.trainingTemplates}
        existingTrainingIds={new Set(trainings.map((t) => t.id))}
        saving={routine.saving}
        editingTraining={editingTraining}
        eyebrow={
          editingTraining
            ? `${titleName || 'Rotina'} · Editar treino`
            : titleName
            ? `${titleName} · Novo treino`
            : 'Nova rotina · Novo treino'
        }
      />

      {/* Mobile: bottom save bar (hidden on desktop via CSS) */}
      <div className="builder-bottom-bar">
        <button
          className="btn-secondary builder-bottom-bar-cancel"
          onClick={handleCancel}
        >
          Cancelar
        </button>
        <button
          className="btn-primary builder-bottom-bar-save"
          onClick={handleSave}
          disabled={!canSave || routine.saving}
          aria-disabled={!canSave}
        >
          <Save size={16} strokeWidth={2} aria-hidden="true" />
          {routine.saving ? 'Salvando…' : 'Salvar rotina'}
        </button>
      </div>
    </div>
  );
};

export default RoutineBuilder;
