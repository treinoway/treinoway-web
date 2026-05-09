import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import {
  AlignLeft,
  ArrowLeft,
  ChevronDown,
  Cloud,
  Dumbbell,
  Edit3,
  FileDown,
  MoreVertical,
  Pencil,
  Plus,
  Save,
  Trash2,
  User,
  X,
} from 'lucide-react';
import RoutineSummarySheet from '../../components/RoutineSummarySheet';
import { useToast } from '../../contexts/ToastContext';
import useRoutineBuilder from '../../hooks/useRoutineBuilder';
import useProtocolBuilder from '../../hooks/useProtocolBuilder';
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

// ─── IdentityChipDate ─────────────────────────────────────────────────────────

/**
 * Chip that opens a popover with a date input.
 * Required: dashed border with asterisk indicator when empty.
 */
const IdentityChipDate = ({ label, value, onChange, required, emptyLabel }) => {
  const [open, setOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const inputRef = useRef(null);

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

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleToggle = useCallback(() => {
    if (open) {
      setOpen(false);
      return;
    }
    const pos = readPos();
    if (pos) setPopoverPos(pos);
    setOpen(true);
  }, [open, readPos]);

  const handleChange = (e) => {
    onChange(e.target.value || null);
  };

  const isFilled = !!value;

  const displayValue = isFilled
    ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  const popover = open
    ? createPortal(
        <div
          ref={popoverRef}
          className="identity-chip-date-popover"
          role="dialog"
          aria-label={`Definir ${emptyLabel}`}
          style={{
            position: 'fixed',
            top: popoverPos.top,
            left: popoverPos.left,
            zIndex: 1200,
          }}
        >
          <span className="identity-chip-date-popover-label">{emptyLabel}</span>
          <input
            ref={inputRef}
            type="date"
            className="identity-chip-date-input"
            value={value || ''}
            onChange={handleChange}
            aria-label={emptyLabel}
          />
          {isFilled && (
            <button
              type="button"
              className="identity-chip-popover-item identity-chip-popover-item--clear"
              onClick={() => { onChange(null); setOpen(false); }}
            >
              — Limpar —
            </button>
          )}
        </div>,
        document.body
      )
    : null;

  return (
    <div className="weekday-chip-wrap">
      <button
        ref={triggerRef}
        type="button"
        className={`identity-chip${isFilled ? '' : ' identity-chip--empty'}${required && !isFilled ? ' identity-chip--required' : ''}`}
        onClick={handleToggle}
        aria-label={`Definir ${emptyLabel}`}
        aria-expanded={open}
        aria-required={required}
      >
        {isFilled ? (
          <>
            <span className="identity-chip-label">{label}:</span>
            <span className="identity-chip-value">{displayValue}</span>
          </>
        ) : (
          <>
            <Plus size={12} strokeWidth={2} aria-hidden="true" />
            {emptyLabel}{required ? ' *' : ''}
          </>
        )}
      </button>

      {popover}
    </div>
  );
};

IdentityChipDate.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  required: PropTypes.bool,
  emptyLabel: PropTypes.string.isRequired,
};

IdentityChipDate.defaultProps = {
  value: null,
  required: false,
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

const WeekdayChip = ({ value, onChange, readOnly }) => {
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

  if (readOnly) {
    return (
      <span
        className={`weekday-chip${value ? ' weekday-chip--set' : ' weekday-chip--unassigned'} weekday-chip--readonly`}
        aria-label={`Dia da semana: ${label}`}
      >
        {label}
      </span>
    );
  }

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
  onChange: PropTypes.func,
  readOnly: PropTypes.bool,
};

WeekdayChip.defaultProps = {
  value: null,
  onChange: null,
  readOnly: false,
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
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const readPos = useCallback(() => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    return { top: rect.bottom + 4, right: window.innerWidth - rect.right };
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
            right: menuPos.right,
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

const ExerciseRow = ({ ex, index, onEdit, onDelete, readOnly }) => {
  const name = ex.name || ex.exerciseTemplate?.name || '—';
  const meta = formatExerciseMeta(ex.exerciseTemplate || ex);

  const isInteractive = !readOnly && onEdit;

  const handleRowKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onEdit(ex);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(ex);
  };

  const interactiveProps = isInteractive
    ? {
        role: 'button',
        tabIndex: 0,
        onClick: () => onEdit(ex),
        onKeyDown: handleRowKeyDown,
        'aria-label': `Editar ${name}`,
        className: 'exercise-row-wide exercise-row-wide--interactive',
        'data-exercise-id': ex.id,
      }
    : { role: 'listitem', className: 'exercise-row-wide', 'data-exercise-id': ex.id };

  return (
    <div {...interactiveProps}>
      <span className="exercise-row-index">{index + 1}</span>
      <div className="exercise-row-wide-body">
        <span className="exercise-row-wide-name">{name}</span>
        {meta && <span className="exercise-row-wide-meta">{meta}</span>}
      </div>
      {!readOnly && onDelete && (
        <button
          type="button"
          className="exercise-row-delete-btn"
          aria-label={`Excluir ${name}`}
          onClick={handleDelete}
        >
          <Trash2 size={18} strokeWidth={2} />
        </button>
      )}
    </div>
  );
};

ExerciseRow.propTypes = {
  ex: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  readOnly: PropTypes.bool,
};

ExerciseRow.defaultProps = {
  onEdit: null,
  onDelete: null,
  readOnly: false,
};

// ─── smoothScrollTo ───────────────────────────────────────────────────────────

/**
 * Scroll an element into view, respecting prefers-reduced-motion.
 * Skips the scroll when the element's top edge is already within the visible
 * area (avoids jarring jumps when the user hasn't scrolled away).
 *
 * @param {Element} el - The DOM element to bring into view.
 * @param {'start'|'center'|'nearest'} [block='start'] - ScrollIntoView block alignment.
 */
const smoothScrollTo = (el, block = 'start') => {
  if (!el) return;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  const rect = el.getBoundingClientRect();
  // Already fully in view — top edge is below viewport top and bottom edge is
  // above viewport bottom. Skip to avoid a disorienting jump.
  if (rect.top >= 0 && rect.bottom <= window.innerHeight) return;
  el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block });
};

// ─── TrainingItem ─────────────────────────────────────────────────────────────

const TrainingItem = ({
  training,
  index,
  exerciseTemplates,
  saving,
  expanded,
  readOnly,
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
    const created = await onAddExercise(payload);
    setComposerState(null);
    if (created?.id) {
      // Double rAF: first frame lets React commit the new exercise node,
      // second frame fires after the browser has laid it out so
      // getBoundingClientRect() is accurate inside smoothScrollTo.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = document.querySelector(`[data-exercise-id="${created.id}"]`);
          smoothScrollTo(el, 'center');
        });
      });
    }
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

  const trainingMenuItems = readOnly ? [] : [
    { label: 'Editar', onClick: () => onEditTraining(training) },
    { label: 'Excluir', danger: true, onClick: handleRequestDeleteTraining },
  ];

  const composerEditing =
    composerState && typeof composerState === 'object' && composerState.editing
      ? composerState.editing
      : null;

  return (
    <>
      <div
        className={`training-item${readinessClass ? ` ${readinessClass}` : ''}${expanded ? ' training-item--expanded' : ''}`}
        data-training-id={training.id}
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
                readOnly={readOnly}
              />
              <span className="training-item-meta-sep" aria-hidden="true">·</span>
              <span className="training-item-meta-stat">
                {exercises.length} ex
              </span>
            </div>
          </div>

          <div className="training-item-actions" onClick={(e) => e.stopPropagation()}>
            {!readOnly && (
              <div className="training-item-menu-wrap">
                <InlineMenu
                  ariaLabel={`Opções do treino ${training.name}`}
                  items={trainingMenuItems}
                  onOpen={() => { if (!expanded) onToggleExpand(); }}
                />
              </div>
            )}
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
                {exercises.map((ex, i) => {
                  if (composerEditing?.id === ex.id) {
                    return (
                      <ExerciseComposer
                        key={ex.id}
                        snapshot={composerEditing}
                        exerciseTemplates={exerciseTemplates}
                        saving={saving}
                        onSubmitCreate={handleAddExercise}
                        onSubmitEdit={handleEditExercise}
                        onSubmitFromLibrary={handleImport}
                        onCancel={() => setComposerState(null)}
                      />
                    );
                  }
                  return (
                    <ExerciseRow
                      key={ex.id}
                      ex={ex}
                      index={i}
                      onEdit={readOnly ? null : (exercise) => setComposerState({ editing: exercise })}
                      onDelete={readOnly ? null : handleRequestDeleteExercise}
                      readOnly={readOnly}
                    />
                  );
                })}
              </div>
            ) : (
              composerState === null && (
                <div className="training-empty-hero">
                  <div className="training-empty-hero-icon" aria-hidden="true">
                    <Dumbbell size={20} strokeWidth={2} />
                  </div>
                  <p className="training-empty-hero-title">Nenhum exercício</p>
                  {readOnly ? (
                    <p className="training-empty-hero-desc">
                      Este treino ainda não tem exercícios.
                    </p>
                  ) : (
                    <>
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
                    </>
                  )}
                </div>
              )
            )}

            {/* Trailing composer — create mode only; edit mode renders inline above */}
            {!readOnly && composerState === 'create' ? (
              <ExerciseComposer
                snapshot={null}
                exerciseTemplates={exerciseTemplates}
                saving={saving}
                onSubmitCreate={handleAddExercise}
                onSubmitEdit={handleEditExercise}
                onSubmitFromLibrary={handleImport}
                onCancel={() => setComposerState(null)}
              />
            ) : !readOnly && !composerEditing && exercises.length > 0 && (
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
  readOnly: PropTypes.bool,
  onToggleExpand: PropTypes.func.isRequired,
  onEditTraining: PropTypes.func,
  onChangeWeekDay: PropTypes.func,
  onDeleteTraining: PropTypes.func,
  onAddExercise: PropTypes.func,
  onEditExercise: PropTypes.func,
  onImportFromLibrary: PropTypes.func,
  onDeleteExercise: PropTypes.func,
};

TrainingItem.defaultProps = {
  readOnly: false,
  onEditTraining: null,
  onChangeWeekDay: null,
  onDeleteTraining: null,
  onAddExercise: null,
  onEditExercise: null,
  onImportFromLibrary: null,
  onDeleteExercise: null,
};

// ─── BuilderTopbar ────────────────────────────────────────────────────────────

const BuilderTopbar = ({
  name,
  isEditing,
  saveStatusLabel,
  studentName,
  mode,
  readOnly,
  editProtocolId,
  scrolled,
  onTitleClick,
  onBlur,
  onChange,
  onBack,
  onCancel,
  onSave,
  onEdit,
  onImportTemplate,
  onOpenSummary,
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
  const isProtocol = mode === 'protocol';

  const eyebrow = (() => {
    if (!isProtocol) return 'Nova rotina · Rascunho';
    if (readOnly) return studentName ? `Rotina de ${studentName}` : 'Visualizando rotina';
    if (editProtocolId) return studentName ? `Editando rotina de ${studentName}` : 'Editando rotina';
    return studentName ? `Rotina de ${studentName}` : 'Nova rotina';
  })();

  return (
    <div className={`builder-topbar${scrolled ? ' builder-topbar--scrolled' : ''}`}>
      <button
        className="builder-topbar-back"
        onClick={onBack}
        aria-label={isProtocol ? 'Voltar para o aluno' : 'Voltar para rotinas'}
      >
        <ArrowLeft size={20} strokeWidth={2} />
      </button>

      <div className="builder-title-wrap">
        <div className="builder-eyebrow">
          {isProtocol && studentName && (
            <User size={11} strokeWidth={2} aria-hidden="true" className="builder-eyebrow-icon" />
          )}
          {eyebrow}
        </div>

        {readOnly ? (
          <div className="builder-title-input-wrap builder-title-input-wrap--readonly">
            <span className={`builder-title-display${isEmpty ? ' builder-title-display--empty' : ''}`}>
              {isEmpty ? '—' : name}
            </span>
          </div>
        ) : (
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
        )}
      </div>

      {/* Mobile-only: import shortcut (protocol create and edit mode) */}
      {isProtocol && onImportTemplate && !readOnly && (
        <button
          type="button"
          className="builder-topbar-import-mobile"
          onClick={onImportTemplate}
          aria-label="Importar"
        >
          <FileDown size={16} strokeWidth={2} aria-hidden="true" />
          Importar
        </button>
      )}

      {/* Mobile-only: Resumo icon-button (hidden ≥768px via CSS — desktop uses FAB) */}
      {onOpenSummary && (
        <button
          type="button"
          className="routine-summary-trigger"
          onClick={onOpenSummary}
          aria-label="Ver resumo"
        >
          <AlignLeft size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      )}

      {/* Desktop: status + action buttons (hidden on mobile via CSS) */}
      <div className="builder-topbar-actions builder-topbar-actions--responsive">
        {readOnly ? (
          <>
            <span className="builder-save-status">
              <User size={12} strokeWidth={2} aria-hidden="true" />
              Visualizando rotina
            </span>
            <button className="btn-primary" onClick={onEdit}>
              <Pencil size={16} strokeWidth={2} aria-hidden="true" />
              Editar
            </button>
            <button className="btn-secondary" onClick={onBack}>
              <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
              Voltar
            </button>
          </>
        ) : (
          <>
            {isProtocol ? (
              <span className="builder-save-status">
                <User size={12} strokeWidth={2} aria-hidden="true" />
                {saveStatusLabel}
              </span>
            ) : (
              <span className="builder-save-status">
                <Cloud size={12} strokeWidth={2} aria-hidden="true" />
                {saveStatusLabel}
              </span>
            )}
            {isProtocol && onImportTemplate && (
              <button
                type="button"
                className="btn-secondary"
                onClick={onImportTemplate}
                aria-label="Importar de template"
              >
                <FileDown size={16} strokeWidth={2} aria-hidden="true" />
                Importar de template
              </button>
            )}
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
              {saving ? 'Salvando…' : editProtocolId ? 'Concluir' : 'Salvar rotina'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

BuilderTopbar.propTypes = {
  name: PropTypes.string.isRequired,
  isEditing: PropTypes.bool.isRequired,
  saveStatusLabel: PropTypes.string.isRequired,
  studentName: PropTypes.string,
  mode: PropTypes.oneOf(['template', 'protocol']).isRequired,
  readOnly: PropTypes.bool,
  editProtocolId: PropTypes.string,
  scrolled: PropTypes.bool,
  onTitleClick: PropTypes.func,
  onBlur: PropTypes.func,
  onChange: PropTypes.func,
  onBack: PropTypes.func.isRequired,
  onCancel: PropTypes.func,
  onSave: PropTypes.func,
  onEdit: PropTypes.func,
  onImportTemplate: PropTypes.func,
  onOpenSummary: PropTypes.func,
  saving: PropTypes.bool.isRequired,
  canSave: PropTypes.bool.isRequired,
};

BuilderTopbar.defaultProps = {
  studentName: null,
  readOnly: false,
  editProtocolId: null,
  scrolled: false,
  onTitleClick: null,
  onBlur: null,
  onChange: null,
  onCancel: null,
  onSave: null,
  onEdit: null,
  onImportTemplate: null,
  onOpenSummary: null,
};

// ─── IdentityStrip ────────────────────────────────────────────────────────────

const IdentityStrip = ({ routineData, mode, readOnly, onUpdateMeta }) => {
  const type = routineData?.type || null;
  const trainingLevel = routineData?.trainingLevel || null;
  const defaultDurationWeeks = routineData?.defaultDurationWeeks
    ? String(routineData.defaultDurationWeeks)
    : null;
  const genderOrdination = routineData?.genderOrdination || null;
  const description = routineData?.description || null;
  const startDate = routineData?.startDate || null;
  const expirationDate = routineData?.expirationDate || null;

  const isProtocol = mode === 'protocol';

  // In read-only mode render a static display chip instead of interactive ones
  const renderReadOnlyChip = (label, displayValue) => {
    if (!displayValue) return null;
    return (
      <div className="weekday-chip-wrap">
        <span className="identity-chip identity-chip--readonly">
          <span className="identity-chip-label">{label}:</span>
          <span className="identity-chip-value">{displayValue}</span>
        </span>
      </div>
    );
  };

  const formatDate = (v) =>
    v
      ? new Date(`${v}T12:00:00`).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : null;

  if (readOnly) {
    const hasAny =
      type || trainingLevel || defaultDurationWeeks || genderOrdination ||
      description || startDate || expirationDate;

    if (!hasAny) return null;

    return (
      <div className="builder-identity-strip">
        <span className="identity-strip-label">Identidade:</span>

        {renderReadOnlyChip('Tipo', getProtocolTypeLabel(type))}
        {renderReadOnlyChip('Nível', getLevelLabel(trainingLevel))}

        {!isProtocol && defaultDurationWeeks && renderReadOnlyChip('Dur.', `${defaultDurationWeeks} sem.`)}

        {isProtocol && (
          <>
            {renderReadOnlyChip('Início', formatDate(startDate))}
            {renderReadOnlyChip('Expira', formatDate(expirationDate))}
          </>
        )}

        {renderReadOnlyChip('Gênero', getGenderLabel(genderOrdination))}

        {description && (
          <div className="weekday-chip-wrap">
            <span className="identity-chip identity-chip--readonly">
              <span className="identity-chip-label">Desc.:</span>
              <span className="identity-chip-value">
                {description.length > 20 ? `${description.slice(0, 20)}…` : description}
              </span>
            </span>
          </div>
        )}
      </div>
    );
  }

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

        {!isProtocol && (
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
        )}

        {isProtocol && (
          <>
            <IdentityChipDate
              label="Início"
              value={startDate}
              onChange={(v) => onUpdateMeta({ startDate: v })}
              required
              emptyLabel="Data início"
            />
            <IdentityChipDate
              label="Expira"
              value={expirationDate}
              onChange={(v) => onUpdateMeta({ expirationDate: v })}
              emptyLabel="Data fim"
            />
          </>
        )}

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
    startDate: PropTypes.string,
    expirationDate: PropTypes.string,
  }),
  mode: PropTypes.oneOf(['template', 'protocol']).isRequired,
  readOnly: PropTypes.bool,
  onUpdateMeta: PropTypes.func,
};

IdentityStrip.defaultProps = {
  routineData: null,
  readOnly: false,
  onUpdateMeta: null,
};

// ─── Shared sub-components ────────────────────────────────────────────────────

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

// ─── ImportTemplateSheet ──────────────────────────────────────────────────────

/**
 * Bottom sheet for selecting a protocol-template to import in protocol mode.
 */
const ImportTemplateSheet = ({ open, protocolTemplates, loading, onSelect, onClose }) => {
  if (!open) return null;

  return createPortal(
    <div className="overlay" onClick={onClose}>
      <div
        className="bottom-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Importar de template"
      >
        <div className="bottom-sheet-header">
          <h2 className="bottom-sheet-title">Importar de template</h2>
          <button
            type="button"
            className="bottom-sheet-close"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="bottom-sheet-body">
          {loading && (
            <p className="builder-template-sheet-empty">Carregando templates…</p>
          )}
          {!loading && protocolTemplates.length === 0 && (
            <p className="builder-template-sheet-empty">Nenhum template disponível.</p>
          )}
          {!loading && protocolTemplates.length > 0 && (
            <div className="builder-template-sheet-list" role="list">
              {protocolTemplates.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  className="builder-template-sheet-item"
                  role="listitem"
                  onClick={() => onSelect(tmpl.id)}
                >
                  <span className="builder-template-sheet-item-name">{tmpl.name}</span>
                  {tmpl.type && (
                    <span className="builder-template-sheet-item-meta">
                      {getProtocolTypeLabel(tmpl.type)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

ImportTemplateSheet.propTypes = {
  open: PropTypes.bool.isRequired,
  protocolTemplates: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    type: PropTypes.string,
  })).isRequired,
  loading: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

// ─── RoutineBuilderCore ───────────────────────────────────────────────────────
//
// This is the shared view layer. Both TemplateBuilderMount and
// ProtocolBuilderMount render this after calling their respective hook.

const RoutineBuilderCore = ({ routine, mode, studentId, readOnly, editProtocolId }) => {
  const { id: routineId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [titleName, setTitleName] = useState('');
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [addTrainingSheetOpen, setAddTrainingSheetOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState(null);
  const [importTemplateSheetOpen, setImportTemplateSheetOpen] = useState(false);
  const [summarySheetOpen, setSummarySheetOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const sentinelRef = useRef(null);

  const isProtocol = mode === 'protocol';

  // Sync title from API when edit-mode data first arrives.
  const loadedName = routine.data?.name;
  useEffect(() => {
    if (loadedName && !titleName) {
      setTitleName(loadedName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedName]);

  // Scroll-boundary detection: toggle --scrolled modifier on the topbar when
  // the 1px sentinel at the top of .training-canvas leaves the viewport.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsScrolled(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // ── Derived state ────────────────────────────────────────────────────────

  const trainings = useMemo(
    () => routine.data?.trainings || [],
    [routine.data?.trainings]
  );

  const hasName = !!(titleName && titleName.trim());
  const hasTrainings = trainings.length > 0;
  const hasStartDate = !isProtocol || !!(routine.data?.startDate);
  // Edit mode: all data is already persisted; "Concluir" is always enabled once loaded.
  const canSave = editProtocolId
    ? true
    : hasName && hasTrainings && hasStartDate;

  // ── Draft meta (template mode only) ─────────────────────────────────────

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

  // ── Autosave draft (template create mode only) ───────────────────────────

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
    enabled: !isProtocol && !routineId && !routine.loading,
    name: titleName,
    meta: draftMeta,
    trainings,
    trainingTemplates: routine.trainingTemplates,
    createdTrainingIds: routine.createdTrainingIds,
    junctionsAddedToImported: routine.junctionsAddedToImported,
    onRestore: handleRestore,
  });

  const saveStatusLabel = (() => {
    if (editProtocolId) return 'Editando rotina do aluno';
    if (isProtocol) return 'Rotina do aluno · Pronto para salvar';
    if (routineId) return 'Editando rotina';
    if (draft.lastSaved) return `Rascunho salvo ${formatRelativeTime(draft.lastSaved)}`;
    return 'Pronto para salvar';
  })();

  // ── Student name (protocol mode) ─────────────────────────────────────────

  const studentName = useMemo(() => {
    const s = routine.student;
    if (!s) return null;
    const full = [s.firstName, s.lastName].filter(Boolean).join(' ');
    return full || s.email || null;
  }, [routine.student]);

  // ── Back destination ─────────────────────────────────────────────────────

  const backDestination = (() => {
    if (editProtocolId) return `/trainer/protocols/${editProtocolId}`;
    if (readOnly && editProtocolId === null) {
      // view mode: back goes to student or protocols list
      return studentId ? `/trainer/students/${studentId}` : '/trainer/routines';
    }
    if (isProtocol && studentId) return `/trainer/students/${studentId}`;
    return '/trainer/routines';
  })();

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleBack = useCallback(
    () => navigate(backDestination),
    [navigate, backDestination]
  );

  const handleCancel = useCallback(
    () => navigate(backDestination),
    [navigate, backDestination]
  );

  const handleEdit = useCallback(() => {
    if (routineId) navigate(`/trainer/protocols/${routineId}/edit`);
  }, [navigate, routineId]);

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
      if (editProtocolId) {
        // Edit mode: all mutations already persisted eagerly.
        // saveRoutine is a no-op; just navigate to view.
        await routine.saveRoutine({}, trainings);
        showToast('Rotina atualizada.', 'success');
        navigate(`/trainer/protocols/${editProtocolId}`);
        return;
      }

      const meta = {
        name: titleName,
        ...(routine.data?.type && { type: routine.data.type }),
        ...(routine.data?.trainingLevel && { trainingLevel: routine.data.trainingLevel }),
        ...(routine.data?.genderOrdination && { genderOrdination: routine.data.genderOrdination }),
        ...(routine.data?.description && { description: routine.data.description }),
        ...(isProtocol && {
          assigneeId: routine.data?.assigneeId || studentId,
          startDate: routine.data?.startDate,
          expirationDate: routine.data?.expirationDate,
        }),
        ...(!isProtocol && {
          defaultDurationWeeks: routine.data?.defaultDurationWeeks,
        }),
      };
      const saved = await routine.saveRoutine(meta, trainings);
      if (!isProtocol) {
        draft.clearDraft();
        showToast('Rotina salva.', 'success');
        navigate('/trainer/routines');
      } else {
        showToast('Rotina salva.', 'success');
        navigate(`/trainer/protocols/${saved.id}`);
      }
    } catch {
      // error already set inside the hook
    }
  }, [canSave, routine, titleName, trainings, draft, showToast, navigate, isProtocol, studentId, editProtocolId]);

  const handleToggleExpand = useCallback((trainingId) => {
    setExpandedId((prev) => {
      const isExpanding = prev !== trainingId;
      if (isExpanding) {
        requestAnimationFrame(() => {
          const el = document.querySelector(`[data-training-id="${trainingId}"]`);
          smoothScrollTo(el, 'start');
        });
      }
      return isExpanding ? trainingId : null;
    });
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

  const handleImportTemplate = useCallback((templateId) => {
    setImportTemplateSheetOpen(false);
    routine.loadFromTemplate(templateId);
  }, [routine]);

  // ── Summary sheet ────────────────────────────────────────────────────────

  const totalExerciseCount = useMemo(
    () => trainings.reduce((sum, t) => sum + (t.exercises?.length || 0), 0),
    [trainings]
  );

  // Flat ordered list of all trainings (assigned first, then unassigned) for
  // the sheet — mirrors the render order used in the canvas below.
  const orderedTrainings = useMemo(() => {
    const assigned = trainings.filter((t) => t.weekDay);
    const unassigned = trainings.filter((t) => !t.weekDay);
    return [...assigned, ...unassigned];
  }, [trainings]);

  const handleScrollToTraining = useCallback((trainingId) => {
    // Expand the training card if it is collapsed.
    setExpandedId((prev) => (prev === trainingId ? prev : trainingId));

    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-training-id="${trainingId}"]`);
      if (el) {
        el.scrollIntoView({ block: 'start', behavior: 'smooth' });
        el.classList.add('training-item--pulse');
        el.addEventListener(
          'animationend',
          () => el.classList.remove('training-item--pulse'),
          { once: true }
        );
      }
    });
  }, []);

  const handleScrollToExercise = useCallback((trainingId, exerciseId) => {
    // Ensure the parent training is expanded so the exercise row is visible.
    setExpandedId(trainingId);

    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-exercise-id="${exerciseId}"]`);
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el.classList.add('exercise-row-pulse');
        el.addEventListener(
          'animationend',
          () => el.classList.remove('exercise-row-pulse'),
          { once: true }
        );
      }
    });
  }, []);

  // ── Loading state ────────────────────────────────────────────────────────

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
        studentName={studentName}
        mode={mode}
        readOnly={readOnly}
        editProtocolId={editProtocolId}
        scrolled={isScrolled}
        onTitleClick={readOnly ? null : handleTitleClick}
        onBlur={readOnly ? null : handleTitleBlur}
        onChange={readOnly ? null : setTitleName}
        onBack={handleBack}
        onCancel={readOnly ? null : handleCancel}
        onSave={readOnly ? null : handleSave}
        onEdit={readOnly ? handleEdit : null}
        onImportTemplate={isProtocol && !readOnly ? () => setImportTemplateSheetOpen(true) : null}
        onOpenSummary={() => setSummarySheetOpen(true)}
        saving={routine.saving}
        canSave={canSave}
      />

      <IdentityStrip
        routineData={routine.data}
        mode={mode}
        readOnly={readOnly}
        onUpdateMeta={readOnly ? null : routine.updateMeta}
      />

      <BuilderStatsRow trainings={trainings} />

      <div className="training-canvas">
        {/* Scroll-boundary sentinel — observed by IntersectionObserver */}
        <div ref={sentinelRef} className="training-canvas-sentinel" aria-hidden="true" />

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

        {trainings.length === 0 && !readOnly && (
          <FirstTrainingHero onAddTraining={() => setAddTrainingSheetOpen(true)} />
        )}

        {trainings.length === 0 && readOnly && (
          <div className="first-training-hero">
            <div className="first-training-hero-icon">
              <Dumbbell size={26} strokeWidth={2} aria-hidden="true" />
            </div>
            <div className="first-training-hero-title first-training-hero-title--mobile">
              Sem treinos
            </div>
            <div className="first-training-hero-description">
              Esta rotina ainda não tem treinos cadastrados.
            </div>
          </div>
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
              readOnly={readOnly}
              onToggleExpand={() => handleToggleExpand(t.id)}
              onEditTraining={readOnly ? null : handleOpenEditTraining}
              onChangeWeekDay={readOnly ? null : (weekDay) => routine.updateTrainingWeekDay(t.id, weekDay)}
              onDeleteTraining={readOnly ? null : () => routine.deleteTraining(t.id)}
              onAddExercise={readOnly ? null : (payload) => routine.addExercise(t.id, payload)}
              onEditExercise={readOnly ? null : (exId, payload) => routine.updateExercise(t.id, exId, payload)}
              onImportFromLibrary={readOnly ? null : (ids) =>
                Promise.all(ids.map((tmplId) => routine.addExerciseFromTemplate(t.id, tmplId)))
              }
              onDeleteExercise={readOnly ? null : (exId) => routine.deleteExercise(t.id, exId)}
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

        {trainings.length > 0 && !readOnly && (
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

      {!readOnly && (
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
      )}

      {isProtocol && !readOnly && (
        <ImportTemplateSheet
          open={importTemplateSheetOpen}
          protocolTemplates={routine.protocolTemplates || []}
          loading={routine.loading}
          onSelect={handleImportTemplate}
          onClose={() => setImportTemplateSheetOpen(false)}
        />
      )}

      {/* Read-only: FAB-extended pill — mobile only (desktop hidden via CSS) */}
      {readOnly && (
        <button
          className="builder-edit-fab"
          onClick={handleEdit}
          aria-label="Editar rotina"
        >
          <Pencil size={18} strokeWidth={2} aria-hidden="true" />
          EDITAR
        </button>
      )}

      {/* Edit/create: save FAB — mobile only (desktop hidden via CSS) */}
      {!readOnly && (
        <button
          className="builder-edit-fab"
          onClick={handleSave}
          disabled={!canSave || routine.saving}
          aria-disabled={!canSave}
          aria-label={routine.saving ? 'Salvando' : editProtocolId ? 'Concluir edição' : 'Salvar rotina'}
        >
          <Save size={18} strokeWidth={2} aria-hidden="true" />
          {routine.saving ? 'SALVANDO…' : editProtocolId ? 'CONCLUIR' : 'SALVAR'}
        </button>
      )}

      {/* Resumo FAB — desktop only (≥768px via CSS); mobile uses topbar trigger */}
      <button
        className="routine-summary-fab"
        onClick={() => setSummarySheetOpen(true)}
        aria-label="Ver resumo de exercícios"
      >
        <span className="routine-summary-fab-icon" aria-hidden="true">
          <AlignLeft size={16} strokeWidth={2} />
        </span>
        <span className="routine-summary-fab-label">Resumo</span>
        <span className="routine-summary-fab-count">{totalExerciseCount} ex</span>
      </button>

      {/* Routine Summary Sheet */}
      <RoutineSummarySheet
        open={summarySheetOpen}
        trainings={orderedTrainings}
        saveStatusLabel={saveStatusLabel}
        onClose={() => setSummarySheetOpen(false)}
        onScrollToTraining={handleScrollToTraining}
        onScrollToExercise={handleScrollToExercise}
      />
    </div>
  );
};

RoutineBuilderCore.propTypes = {
  routine: PropTypes.object.isRequired,
  mode: PropTypes.oneOf(['template', 'protocol']).isRequired,
  studentId: PropTypes.string,
  readOnly: PropTypes.bool,
  editProtocolId: PropTypes.string,
};

RoutineBuilderCore.defaultProps = {
  studentId: null,
  readOnly: false,
  editProtocolId: null,
};

// ─── Mode-specific mounts ─────────────────────────────────────────────────────
//
// Thin components that call their respective hook and pass the result down.
// Keeps Rules of Hooks satisfied — hook calls are always at the top level of
// the mounting component, never inside a conditional.

const TemplateBuilderMount = ({ routineId }) => {
  const routine = useRoutineBuilder(routineId || null);
  return <RoutineBuilderCore routine={routine} mode="template" />;
};

TemplateBuilderMount.propTypes = {
  routineId: PropTypes.string,
};

TemplateBuilderMount.defaultProps = {
  routineId: null,
};

const ProtocolBuilderMount = ({ studentId }) => {
  const routine = useProtocolBuilder(studentId);
  return <RoutineBuilderCore routine={routine} mode="protocol" studentId={studentId} />;
};

ProtocolBuilderMount.propTypes = {
  studentId: PropTypes.string.isRequired,
};

const ProtocolEditMount = ({ protocolId }) => {
  const routine = useProtocolBuilder(null, { protocolId });
  return (
    <RoutineBuilderCore
      routine={routine}
      mode="protocol"
      studentId={routine.student?.id || null}
      editProtocolId={protocolId}
    />
  );
};

ProtocolEditMount.propTypes = {
  protocolId: PropTypes.string.isRequired,
};

const ProtocolViewMount = ({ protocolId }) => {
  const routine = useProtocolBuilder(null, { protocolId });
  return (
    <RoutineBuilderCore
      routine={routine}
      mode="protocol"
      studentId={routine.student?.id || null}
      readOnly
    />
  );
};

ProtocolViewMount.propTypes = {
  protocolId: PropTypes.string.isRequired,
};

// ─── RoutineBuilder (entry point) ─────────────────────────────────────────────
//
// Detects the current route and delegates to the correct mount component.
// Route shapes handled:
//   /trainer/protocols/new?studentId=X  → ProtocolBuilderMount (create)
//   /trainer/protocols/:id/edit         → ProtocolEditMount    (eager mutations)
//   /trainer/protocols/:id              → ProtocolViewMount    (read-only)
//   /trainer/routines/new               → TemplateBuilderMount (create)
//   /trainer/routines/:id/edit          → TemplateBuilderMount (edit)

const RoutineBuilder = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { pathname } = useLocation();
  const studentId = searchParams.get('studentId');

  // Protocol create: /trainer/protocols/new?studentId=…
  if (studentId) {
    return <ProtocolBuilderMount studentId={studentId} />;
  }

  // Protocol edit: /trainer/protocols/:id/edit
  if (pathname.includes('/trainer/protocols/') && pathname.endsWith('/edit') && id) {
    return <ProtocolEditMount protocolId={id} />;
  }

  // Protocol view: /trainer/protocols/:id (no /edit suffix, no studentId)
  if (pathname.includes('/trainer/protocols/') && !pathname.endsWith('/edit') && id) {
    return <ProtocolViewMount protocolId={id} />;
  }

  // Template create / edit
  return <TemplateBuilderMount routineId={id || null} />;
};

export default RoutineBuilder;
