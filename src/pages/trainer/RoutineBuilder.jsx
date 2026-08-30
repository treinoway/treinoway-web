import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import PropTypes from 'prop-types';
import {
  AlertTriangle,
  AlignLeft,
  ArrowLeft,
  CheckSquare,
  ChevronDown,
  Cloud,
  Dumbbell,
  Edit3,
  FileDown,
  GripVertical,
  MoreVertical,
  Pencil,
  Plus,
  Save,
  Square,
  Trash2,
  User,
  X,
} from 'lucide-react';
import RoutineSummarySheet from '../../components/RoutineSummarySheet';
import { useToast } from '../../contexts/ToastContext';
import useRoutineBuilder from '../../hooks/useRoutineBuilder';
import useProtocolBuilder from '../../hooks/useProtocolBuilder';
import useRoutineDraft from '../../hooks/useRoutineDraft';
import useProtocolDraft from '../../hooks/useProtocolDraft';
import useUnsavedChangesWarning from '../../hooks/useUnsavedChangesWarning';
import useBisetCreate from '../../hooks/useBisetCreate';
import useExerciseReorder from '../../hooks/useExerciseReorder';
import formatRelativeTime from '../../utils/relativeTime';
import ExerciseComposer from '../../components/ExerciseComposer';
import AddTrainingSheet from '../../components/AddTrainingSheet';
import BiSetBadge from '../../components/BiSetBadge';
import BiSetActionSheet from '../../components/BiSetActionSheet';
import SubstituteComposerSheet from '../../components/SubstituteComposerSheet';
import ReplaceExerciseSheet from '../../components/ReplaceExerciseSheet';
import SubstitutesInline from '../../components/SubstitutesInline';
import IntensityBadge from '../../components/IntensityBadge';
import SelectionActionBar, { SelectionInstructionStrip } from '../../components/SelectionActionBar';
import api from '../../api/axios';
import { t, translateError } from '../../i18n';
import { WEEK_DAY_OPTIONS_SHORT } from '../../constants/weekDays';
import { sortTrainingsByWeekDay } from '../../utils/sortTrainingsByWeekDay';
import { formatExerciseMeta } from '../../utils/exerciseMeta';
import DurationLabel from '../../components/DurationLabel';
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

  const POPOVER_HEIGHT_FALLBACK = 300;
  const POPOVER_WIDTH_FALLBACK = 160;
  const POPOVER_GAP = 4;
  const POPOVER_EDGE_MARGIN = 8;

  const calcPos = useCallback(() => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverHeight = popoverRef.current?.offsetHeight || POPOVER_HEIGHT_FALLBACK;
    const popoverWidth = popoverRef.current?.offsetWidth || POPOVER_WIDTH_FALLBACK;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const flipUp = spaceBelow < popoverHeight + POPOVER_GAP && spaceAbove > spaceBelow;
    const top = flipUp
      ? Math.max(POPOVER_EDGE_MARGIN, rect.top - popoverHeight - POPOVER_GAP)
      : rect.bottom + POPOVER_GAP;

    const left = Math.min(
      rect.left,
      window.innerWidth - popoverWidth - POPOVER_EDGE_MARGIN
    );

    return { top, left };
  }, []);

  const handleToggle = useCallback(
    (e) => {
      e.stopPropagation();
      if (open) {
        setOpen(false);
        return;
      }
      const pos = calcPos();
      if (pos) setPopoverPos(pos);
      setOpen(true);
    },
    [open, calcPos]
  );

  useEffect(() => {
    if (!open) return;

    // After the popover mounts its real dimensions are available. Schedule a
    // recalc one frame later so the flip-up logic can use offsetHeight/offsetWidth
    // instead of the fallback constants used during the initial toggle.
    const rafId = requestAnimationFrame(() => {
      const pos = calcPos();
      if (pos) setPopoverPos(pos);
    });

    const recalcPosition = () => {
      const pos = calcPos();
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
      cancelAnimationFrame(rafId);
      document.removeEventListener('pointerdown', handlePointerOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', recalcPosition);
      window.removeEventListener('scroll', recalcPosition, true);
    };
  }, [open, calcPos]);

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
          {items.map((item, idx) => {
            if (item.kind === 'caption') {
              return (
                <span
                  key={`cap-${idx}-${item.label}`}
                  className="row-menu-section-caption"
                  role="presentation"
                >
                  {item.label}
                </span>
              );
            }
            return (
              <button
                key={`it-${idx}-${item.label}`}
                type="button"
                role="menuitem"
                className={`row-menu-item${item.danger ? ' row-menu-item--danger' : ''}`}
                disabled={item.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  item.onClick();
                }}
              >
                {item.label}
              </button>
            );
          })}
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
      kind: PropTypes.oneOf(['caption']),
      danger: PropTypes.bool,
      disabled: PropTypes.bool,
      onClick: PropTypes.func,
    })
  ).isRequired,
  onOpen: PropTypes.func,
};

InlineMenu.defaultProps = {
  onOpen: null,
};

// ─── ExerciseRow ──────────────────────────────────────────────────────────────

const ExerciseRow = ({
  ex,
  index,
  onEdit,
  onDelete,
  readOnly,
  menuItems,
  isBisetMember,
  isLastBisetMember,
  selectionMode,
  selected,
  selectionDisabled,
  selectionDisabledReason,
  onToggleSelect,
  dragHandle,
}) => {
  const name = ex.name || ex.exerciseTemplate?.name || '—';
  // Prescription lives on the exercise itself; the nested exerciseTemplate is
  // identity-only. Fall back to the type label from the template only when the
  // exercise has no type of its own.
  const meta = formatExerciseMeta(ex) || formatExerciseMeta(ex.exerciseTemplate);
  const intensity = ex.intensity ?? ex.exerciseTemplate?.intensity ?? null;
  const intensityLabel = ex.intensityLabel ?? ex.exerciseTemplate?.intensityLabel ?? null;

  const isInteractive = !readOnly && !selectionMode && onEdit;

  const handleRowKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (selectionMode) {
        if (!selectionDisabled) onToggleSelect?.(ex.id);
      } else if (onEdit) {
        onEdit(ex);
      }
    }
  };

  const handleRowClick = () => {
    if (selectionMode) {
      if (!selectionDisabled) onToggleSelect?.(ex.id);
      return;
    }
    if (onEdit) onEdit(ex);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(ex);
  };

  const baseClass = 'exercise-row-wide';
  const classes = [baseClass];
  if (isInteractive || selectionMode) classes.push('exercise-row-wide--interactive');
  if (selectionMode && selectionDisabled) classes.push('exercise-selection-row--dimmed');

  const ariaLabel = selectionMode
    ? `${selected ? 'Desmarcar' : 'Selecionar'} ${name}`
    : `Editar ${name}`;

  const isClickable = !readOnly && (isInteractive || selectionMode);

  const restMutedLabel = isBisetMember && !isLastBisetMember;

  const renderRowMenu = () => {
    if (readOnly || selectionMode) return null;
    if (menuItems && menuItems.length > 0) {
      return (
        <InlineMenu
          ariaLabel={`Ações de ${name}`}
          items={menuItems}
        />
      );
    }
    if (onDelete) {
      return (
        <button
          type="button"
          className="exercise-row-delete-btn"
          aria-label={`Excluir ${name}`}
          onClick={handleDelete}
        >
          <Trash2 size={18} strokeWidth={2} />
        </button>
      );
    }
    return null;
  };

  return (
    <div
      className={classes.join(' ')}
      data-exercise-id={ex.id}
      role={isClickable ? 'button' : 'listitem'}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? ariaLabel : undefined}
      aria-pressed={selectionMode ? selected : undefined}
      onClick={isClickable ? handleRowClick : undefined}
      onKeyDown={isClickable ? handleRowKeyDown : undefined}
    >
      {dragHandle}
      {selectionMode && (
        <button
          type="button"
          className={`exercise-selection-checkbox${selected ? ' exercise-selection-checkbox--checked' : ''}`}
          disabled={selectionDisabled}
          onClick={(e) => {
            e.stopPropagation();
            if (!selectionDisabled) onToggleSelect?.(ex.id);
          }}
          aria-label={`${selected ? 'Desmarcar' : 'Selecionar'} ${name}`}
          aria-pressed={selected}
        >
          {selected ? (
            <CheckSquare size={20} strokeWidth={2} aria-hidden="true" />
          ) : (
            <Square size={20} strokeWidth={2} aria-hidden="true" />
          )}
        </button>
      )}
      <span className="exercise-row-index" aria-hidden="true">{index + 1}</span>
      <div className="exercise-row-wide-body">
        <span className="exercise-row-wide-name-row">
          <span className="exercise-row-wide-name">{name}</span>
          <IntensityBadge intensity={intensity} label={intensityLabel} />
        </span>
        {meta && (
          <span className="exercise-row-wide-meta">
            {meta}
            {restMutedLabel && (
              <>
                {' · '}
                <span className="biset-member-rest-muted">
                  {t('exerciseGroup.noRest') || 'sem descanso'}
                </span>
              </>
            )}
          </span>
        )}
        {selectionMode && selectionDisabled && selectionDisabledReason && (
          <span className="exercise-selection-row-caption">{selectionDisabledReason}</span>
        )}
      </div>
      {renderRowMenu()}
    </div>
  );
};

ExerciseRow.propTypes = {
  ex: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  readOnly: PropTypes.bool,
  menuItems: PropTypes.array,
  isBisetMember: PropTypes.bool,
  isLastBisetMember: PropTypes.bool,
  selectionMode: PropTypes.bool,
  selected: PropTypes.bool,
  selectionDisabled: PropTypes.bool,
  selectionDisabledReason: PropTypes.string,
  onToggleSelect: PropTypes.func,
  dragHandle: PropTypes.node,
};

ExerciseRow.defaultProps = {
  onEdit: null,
  onDelete: null,
  readOnly: false,
  menuItems: null,
  isBisetMember: false,
  isLastBisetMember: false,
  selectionMode: false,
  selected: false,
  selectionDisabled: false,
  selectionDisabledReason: null,
  onToggleSelect: null,
  dragHandle: null,
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

// ─── Row menu items builder (kebab) ───────────────────────────────────────────

/**
 * Builds the grouped row-menu entries for an exercise row. Sections are
 * rendered as `caption` items (small-caps; no horizontal lines). The same
 * builder serves bi-set members and standalone rows — entries are filtered
 * based on flags.
 */
const buildExerciseRowMenu = ({
  ex,
  isBisetMember,
  onEnterSelection,
  onAddSubstitute,
  onDissolveBiset,
  onEdit,
  onReplace,
  onDelete,
}) => {
  const items = [{ kind: 'caption', label: 'Estrutura' }];
  items.push({
    label: t('exerciseGroup.select') || 'Selecionar',
    onClick: () => onEnterSelection?.(),
  });
  if (isBisetMember && onDissolveBiset) {
    items.push({
      label: t('exerciseGroup.dissolveBiset') || 'Desfazer bi-set',
      onClick: () => onDissolveBiset(),
    });
  }
  if (onAddSubstitute) {
    items.push({
      label: t('substitute.add') || 'Adicionar substituto',
      onClick: () => onAddSubstitute(ex),
    });
  }
  items.push({ kind: 'caption', label: 'Editar' });
  if (onEdit) items.push({ label: 'Editar', onClick: () => onEdit(ex) });
  if (!isBisetMember && onReplace) {
    items.push({
      label: t('replace.menuItem') || 'Substituir exercício',
      onClick: () => onReplace(ex),
    });
  }
  if (onDelete) items.push({ label: 'Remover', danger: true, onClick: () => onDelete(ex) });
  return items;
};

// ─── ExerciseRowWithSubstitutes ───────────────────────────────────────────────

/**
 * Wraps a standalone (non-bi-set) ExerciseRow with the substitutes inline
 * preview/expanded list. Substitutes are protocol-mode only — when
 * `onAddSubstitute` is null this component simply renders the row.
 */
const ExerciseRowWithSubstitutes = ({
  ex,
  index,
  readOnly,
  mode,
  selectionMode,
  selected,
  atSelectionLimit,
  onToggleSelect,
  onEdit,
  onDelete,
  onEnterSelection,
  onAddSubstitute,
  onReplace,
  substitutesExpanded,
  onToggleSubstitutes,
  onDeleteSubstitute,
  dragHandle,
}) => {
  const substitutes = Array.isArray(ex.substitutes) ? ex.substitutes : [];
  const supportsSubstitutes = mode === 'protocol';
  const showInline = supportsSubstitutes && substitutes.length > 0 && !selectionMode;

  const menuItems = readOnly || selectionMode
    ? null
    : buildExerciseRowMenu({
        ex,
        isBisetMember: false,
        onEnterSelection,
        onAddSubstitute,
        onDissolveBiset: null,
        onEdit,
        onReplace,
        onDelete,
      });

  const selectionDisabled =
    selectionMode && !selected && (atSelectionLimit || !!ex.supersetGroupId);
  const selectionDisabledReason = selectionMode && ex.supersetGroupId
    ? t('exerciseGroup.alreadyInAnotherBiset') || 'Já em outro bi-set'
    : null;

  return (
    <>
      <ExerciseRow
        ex={ex}
        index={index}
        onEdit={onEdit}
        onDelete={onDelete}
        readOnly={readOnly}
        menuItems={menuItems}
        selectionMode={selectionMode}
        selected={selected}
        selectionDisabled={selectionDisabled}
        selectionDisabledReason={selectionDisabledReason}
        onToggleSelect={onToggleSelect}
        dragHandle={dragHandle}
      />
      {showInline && (
        <>
          <SubstitutesInline
            substitutes={substitutes}
            expanded={substitutesExpanded}
            onToggle={() => onToggleSubstitutes(ex.id)}
          />
          {substitutesExpanded && (
            <div className="substitutes-expanded-list" role="list" aria-label={`Substitutos de ${ex.name}`}>
              {substitutes.map((sub) => (
                <div key={sub.id} className="substitute-row" role="listitem">
                  <div className="substitute-row-body">
                    <span className="substitute-row-name">{sub.name || '—'}</span>
                    {formatExerciseMeta(sub) && (
                      <span className="substitute-row-meta">{formatExerciseMeta(sub)}</span>
                    )}
                  </div>
                  {!readOnly && onDeleteSubstitute && (
                    <button
                      type="button"
                      className="substitute-row-delete-btn"
                      aria-label={(t('substitute.deleteAria') || 'Excluir substituto {name}').replace('{name}', sub.name || '')}
                      onClick={() => onDeleteSubstitute(sub, ex.id)}
                    >
                      <Trash2 size={16} strokeWidth={2} aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
};

ExerciseRowWithSubstitutes.propTypes = {
  ex: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  readOnly: PropTypes.bool,
  mode: PropTypes.oneOf(['template', 'protocol']).isRequired,
  selectionMode: PropTypes.bool,
  selected: PropTypes.bool,
  atSelectionLimit: PropTypes.bool,
  onToggleSelect: PropTypes.func,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onEnterSelection: PropTypes.func,
  onAddSubstitute: PropTypes.func,
  onReplace: PropTypes.func,
  substitutesExpanded: PropTypes.bool,
  onToggleSubstitutes: PropTypes.func,
  onDeleteSubstitute: PropTypes.func,
  dragHandle: PropTypes.node,
};

ExerciseRowWithSubstitutes.defaultProps = {
  readOnly: false,
  selectionMode: false,
  selected: false,
  atSelectionLimit: false,
  onToggleSelect: null,
  onEdit: null,
  onDelete: null,
  onEnterSelection: null,
  onAddSubstitute: null,
  onReplace: null,
  substitutesExpanded: false,
  onToggleSubstitutes: null,
  onDeleteSubstitute: null,
  dragHandle: null,
};

// ─── BisetGroupBlock ──────────────────────────────────────────────────────────

/**
 * Renders a bi-set group container — accent left border + tint background,
 * BiSetBadge on top, and one ExerciseRow per member. Non-last members show
 * the "sem descanso" muted label in the rest slot per design.
 */
const BisetGroupBlock = ({
  groupId,
  members,
  startIndex,
  readOnly,
  mode,
  selectionMode,
  selectedIds,
  atSelectionLimit,
  onToggleSelect,
  onOpenBisetSheet,
  onDissolveBiset,
  onEdit,
  onDelete,
  onEnterSelection,
  onAddSubstitute,
  expandedSubstituteIds,
  onToggleSubstitutes,
  onDeleteSubstitute,
  dragHandle,
}) => {
  void groupId; // groupId implied by members[*].supersetGroupId
  return (
    <div className="biset-group-section" role="group" aria-label="Bi-set">
      <div className="biset-group-section-head">
        {dragHandle}
        <BiSetBadge
          onClick={readOnly ? undefined : onOpenBisetSheet}
          ariaLabel={readOnly ? undefined : 'Abrir ações do bi-set'}
        />
      </div>
      {members.map((member, mIdx) => {
        const isLast = mIdx === members.length - 1;
        const substitutes = Array.isArray(member.substitutes) ? member.substitutes : [];
        const supportsSubstitutes = mode === 'protocol';
        const expanded = expandedSubstituteIds?.has(member.id);
        const menuItems = readOnly || selectionMode
          ? null
          : buildExerciseRowMenu({
              ex: member,
              isBisetMember: true,
              onEnterSelection,
              onAddSubstitute,
              onDissolveBiset,
              onEdit,
              onDelete,
            });

        const selected = selectedIds?.includes(member.id) || false;
        // Members already in a group are disabled in selection mode unless
        // they belong to THIS group (which is impossible to "regroup" anyway).
        const selectionDisabled =
          selectionMode && !selected && (atSelectionLimit || true);

        return (
          <div key={member.id}>
            <ExerciseRow
              ex={member}
              index={startIndex + mIdx}
              onEdit={onEdit}
              onDelete={onDelete}
              readOnly={readOnly}
              menuItems={menuItems}
              isBisetMember
              isLastBisetMember={isLast}
              selectionMode={selectionMode}
              selected={selected}
              selectionDisabled={selectionDisabled}
              selectionDisabledReason={
                selectionMode
                  ? t('exerciseGroup.alreadyInAnotherBiset') || 'Já em outro bi-set'
                  : null
              }
              onToggleSelect={onToggleSelect}
            />
            {supportsSubstitutes && substitutes.length > 0 && !selectionMode && (
              <>
                <SubstitutesInline
                  substitutes={substitutes}
                  expanded={expanded}
                  onToggle={() => onToggleSubstitutes?.(member.id)}
                />
                {expanded && (
                  <div
                    className="substitutes-expanded-list"
                    role="list"
                    aria-label={`Substitutos de ${member.name}`}
                  >
                    {substitutes.map((sub) => (
                      <div key={sub.id} className="substitute-row" role="listitem">
                        <div className="substitute-row-body">
                          <span className="substitute-row-name">{sub.name || '—'}</span>
                          {formatExerciseMeta(sub) && (
                            <span className="substitute-row-meta">{formatExerciseMeta(sub)}</span>
                          )}
                        </div>
                        {!readOnly && onDeleteSubstitute && (
                          <button
                            type="button"
                            className="substitute-row-delete-btn"
                            aria-label={(t('substitute.deleteAria') || 'Excluir substituto {name}').replace('{name}', sub.name || '')}
                            onClick={() => onDeleteSubstitute(sub, member.id)}
                          >
                            <Trash2 size={16} strokeWidth={2} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

BisetGroupBlock.propTypes = {
  groupId: PropTypes.string.isRequired,
  members: PropTypes.arrayOf(PropTypes.object).isRequired,
  startIndex: PropTypes.number.isRequired,
  readOnly: PropTypes.bool,
  mode: PropTypes.oneOf(['template', 'protocol']).isRequired,
  selectionMode: PropTypes.bool,
  selectedIds: PropTypes.arrayOf(PropTypes.string),
  atSelectionLimit: PropTypes.bool,
  onToggleSelect: PropTypes.func,
  onOpenBisetSheet: PropTypes.func,
  onDissolveBiset: PropTypes.func,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onEnterSelection: PropTypes.func,
  onAddSubstitute: PropTypes.func,
  expandedSubstituteIds: PropTypes.instanceOf(Set),
  onDeleteSubstitute: PropTypes.func,
  onToggleSubstitutes: PropTypes.func,
  dragHandle: PropTypes.node,
};

BisetGroupBlock.defaultProps = {
  readOnly: false,
  selectionMode: false,
  selectedIds: [],
  atSelectionLimit: false,
  onToggleSelect: null,
  onOpenBisetSheet: null,
  onDissolveBiset: null,
  onEdit: null,
  onDelete: null,
  onEnterSelection: null,
  onAddSubstitute: null,
  expandedSubstituteIds: null,
  onToggleSubstitutes: null,
  onDeleteSubstitute: null,
  dragHandle: null,
};

// ─── TrainingItem ─────────────────────────────────────────────────────────────

/**
 * Builds the endpointBuilder for useBisetCreate. Returns null for protocol
 * mode (hook defaults to transactional /trainer/trainings/:id/supersets).
 * Template mode is deferred until TrainingTemplates page is refactored.
 */
const buildBisetEndpointBuilder = (mode) => {
  if (mode === 'template') {
    // Template support deferred — TrainingTemplates page persists junctions
    // only on form submit, so there is no stable id to address. Returning a
    // builder that throws makes it obvious if template-mode tries to group.
    return () => ({
      create: () => Promise.reject(new Error('Bi-set em templates ainda não suportado.')),
      dissolve: () => Promise.reject(new Error('Bi-set em templates ainda não suportado.')),
    });
  }
  return null;
};

const MAX_BISET_MEMBERS = 6;

// ─── SortableExerciseEntry ────────────────────────────────────────────────────

/**
 * Thin wrapper that gives a render-entry a dnd-kit sortable id and applies
 * the --dragging modifier while the item is being dragged.
 *
 * disabled=true when selectionMode is active so dragging does not interfere
 * with checkbox selection.
 *
 * The drag activation is scoped to the handle element via setActivatorNodeRef.
 * The handle ReactNode is injected into children as the `dragHandle` prop so
 * the row/block can place it at the leading edge.
 */
const SortableExerciseEntry = ({ id, disabled, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  // translate-only transform — vertical axis is restricted by modifier so we
  // only ever get a Y offset.
  const style = transform
    ? {
        transform: `translate3d(0, ${transform.y}px, 0)`,
        transition,
        zIndex: isDragging ? 'var(--z-dropdown)' : undefined,
      }
    : undefined;

  const entryClass = [
    'exercise-sortable-entry',
    isDragging ? 'exercise-sortable-entry--dragging' : '',
    disabled ? 'exercise-sortable-entry--disabled' : '',
  ]
    .filter(Boolean)
    .join(' ');

  // The handle is the sole drag-activation target. When disabled it renders
  // as a non-interactive visual indicator (aria-hidden).
  const dragHandle = disabled ? (
    <span
      className="exercise-drag-handle exercise-drag-handle--disabled"
      aria-hidden="true"
    >
      <GripVertical size={16} strokeWidth={2} />
    </span>
  ) : (
    <span
      ref={setActivatorNodeRef}
      className={`exercise-drag-handle${isDragging ? ' exercise-drag-handle--grabbing' : ''}`}
      aria-label={t('exercise.reorderHandle') || 'Reordenar exercício'}
      role="button"
      tabIndex={0}
      {...listeners}
      {...attributes}
    >
      <GripVertical size={16} strokeWidth={2} />
    </span>
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={entryClass}
    >
      {React.cloneElement(children, { dragHandle })}
    </div>
  );
};

SortableExerciseEntry.propTypes = {
  id: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
  children: PropTypes.node.isRequired,
};

SortableExerciseEntry.defaultProps = {
  disabled: false,
};

const TrainingItem = ({
  training,
  index,
  exerciseTemplates,
  saving,
  expanded,
  readOnly,
  mode,
  onToggleExpand,
  onEditTraining,
  onChangeWeekDay,
  onDeleteTraining,
  onAddExercise,
  onEditExercise,
  onImportFromLibrary,
  onDeleteExercise,
  onReplaceExercise,
  onReorder,
  onRefetchTraining,
}) => {
  const { showToast } = useToast();
  const [composerState, setComposerState] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bisetSheetGroupId, setBisetSheetGroupId] = useState(null);
  const [substituteComposerPrincipal, setSubstituteComposerPrincipal] = useState(null);
  const [replacingExercise, setReplacingExercise] = useState(null);
  const [expandedSubstituteIds, setExpandedSubstituteIds] = useState(() => new Set());
  const [pendingNonAdjacentConfirm, setPendingNonAdjacentConfirm] = useState(null);

  const supportsSubstitutes = mode === 'protocol';

  // Canonical exercises from the training prop (used only as the source of
  // truth fed into useExerciseReorder; do NOT use directly for rendering).
  const canonicalExercises = useMemo(
    () => training.exercises || [],
    [training.exercises]
  );

  // Drag-reorder hook — owns the optimistic local copy of exercises.
  const {
    localExercises: exercises,
    localEntries: renderEntries,
    entryIds,
    activeEntry,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
  } = useExerciseReorder({
    trainingId: training.id,
    exercises: canonicalExercises,
    readOnly: readOnly || false,
    onReorder,
    onRefetchTraining,
  });

  // dnd-kit sensors:
  //   Desktop (mouse) — pointer with a tiny 4px distance tolerance so a
  //   normal click does NOT activate drag. The row's onClick fires if the
  //   pointer moves less than 4px before release.
  //   Mobile (touch) — pointer with a 250 ms delay + 6px tolerance. The
  //   delay creates the "long-press" feel; moving >6px before the timer
  //   fires cancels the drag so normal scroll is unaffected.
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    })
  );

  const letter = TRAINING_LETTERS[index] || String(index + 1);

  const endpointBuilder = useMemo(
    () => buildBisetEndpointBuilder(mode),
    [mode]
  );

  const biset = useBisetCreate({ endpointBuilder });

  const readinessClass = useMemo(() => {
    if (exercises.length === 0) return '';
    if (exercises.length < 3) return 'training-item--partial';
    return 'training-item--ready';
  }, [exercises.length]);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds([]);
  }, []);

  const enterSelectionMode = useCallback(() => {
    setSelectionMode(true);
    setSelectedIds([]);
  }, []);

  const handleToggleSelect = useCallback(
    (id) => {
      setSelectedIds((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id);
        if (prev.length >= MAX_BISET_MEMBERS) return prev;
        return [...prev, id];
      });
    },
    []
  );

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

  const handleImport = async (templateIds, templatesById) => {
    await onImportFromLibrary(templateIds, templatesById);
    setComposerState(null);
  };

  const handleRequestDeleteExercise = (ex) => {
    const name = ex.name || ex.exerciseTemplate?.name || 'exercício';
    setConfirmDialog({
      message: `Excluir "${name}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        setComposerState(null);
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
    { label: t('exerciseGroup.select') || 'Selecionar', onClick: enterSelectionMode },
    { kind: 'caption', label: 'Editar' },
    { label: 'Editar', onClick: () => onEditTraining(training) },
    { label: 'Excluir', danger: true, onClick: handleRequestDeleteTraining },
  ];

  // ── Bi-set actions ───────────────────────────────────────────────────────

  const findGroupMembers = useCallback(
    (groupId) => exercises.filter((e) => e.supersetGroupId === groupId),
    [exercises]
  );

  const handleConfirmBisetCreate = useCallback(
    async (memberIds) => {
      try {
        await biset.createBiset(memberIds, { trainingId: training.id });
        showToast(t('exerciseGroup.bisetCreated') || 'Bi-set criado.', 'success');
        exitSelectionMode();
        if (onRefetchTraining) await onRefetchTraining();
      } catch (err) {
        showToast(err.message || 'Erro ao criar bi-set.', 'error');
      }
    },
    [biset, training.id, exitSelectionMode, showToast, onRefetchTraining]
  );

  const handleGroupSelected = useCallback(() => {
    if (selectedIds.length < 2) return;
    // Determine if the selection is contiguous in the current exercise list.
    const positions = selectedIds
      .map((id) => exercises.findIndex((e) => e.id === id))
      .sort((a, b) => a - b);
    const contiguous =
      positions.every((p, idx) => idx === 0 || p === positions[idx - 1] + 1);
    if (contiguous) {
      // Preserve list order when calling create.
      const ordered = positions.map((p) => exercises[p].id);
      handleConfirmBisetCreate(ordered);
      return;
    }
    // Non-adjacent selection — the transactional POST /supersets endpoint
    // handles contiguity rearrangement server-side, so we can pass the
    // selection in list order and let the backend place them contiguously.
    const ordered = positions.map((p) => exercises[p].id);
    setPendingNonAdjacentConfirm({
      memberIds: ordered,
    });
  }, [selectedIds, exercises, handleConfirmBisetCreate]);

  const handleDissolveBiset = useCallback(
    (groupId) => {
      const members = findGroupMembers(groupId);
      if (members.length === 0) return;
      setConfirmDialog({
        message: t('exerciseGroup.confirmDissolve')
          || 'Desfazer bi-set? Os exercícios serão mantidos como individuais.',
        onConfirm: async () => {
          setConfirmDialog(null);
          setBisetSheetGroupId(null);
          try {
            await biset.dissolveBiset(groupId, { trainingId: training.id });
            showToast(
              t('exerciseGroup.bisetDissolved') || 'Bi-set desfeito.',
              'success'
            );
            if (onRefetchTraining) await onRefetchTraining();
          } catch (err) {
            showToast(err.message || 'Erro ao desfazer bi-set.', 'error');
          }
        },
      });
    },
    [biset, training.id, findGroupMembers, showToast, onRefetchTraining]
  );

  // ── Substitute actions (protocol mode only) ──────────────────────────────

  const handleAddSubstitute = useCallback((principal) => {
    setSubstituteComposerPrincipal(principal);
  }, []);

  const handleSubstituteCreated = useCallback(
    async (created) => {
      // Auto-expand the substitutes accordion ONLY on FIRST add.
      const principal = substituteComposerPrincipal;
      const wasFirstAdd =
        principal && (principal.substitutes?.length || 0) === 0;
      if (wasFirstAdd && principal) {
        setExpandedSubstituteIds((prev) => {
          const next = new Set(prev);
          next.add(principal.id);
          return next;
        });
      }
      if (onRefetchTraining) await onRefetchTraining();
      // created intentionally unused (refetch supplies authoritative state)
      void created;
    },
    [substituteComposerPrincipal, onRefetchTraining]
  );

  const handleRequestReplace = useCallback((ex) => {
    setReplacingExercise(ex);
  }, []);

  const handleReplaceSubmit = useCallback(
    (templateId, templateObject) =>
      onReplaceExercise(replacingExercise.id, templateId, templateObject),
    [onReplaceExercise, replacingExercise]
  );

  const handleReplaced = useCallback(async () => {
    setReplacingExercise(null);
    if (onRefetchTraining) await onRefetchTraining();
  }, [onRefetchTraining]);

  const handleToggleSubstitutes = useCallback((principalId) => {
    setExpandedSubstituteIds((prev) => {
      const next = new Set(prev);
      if (next.has(principalId)) next.delete(principalId);
      else next.add(principalId);
      return next;
    });
  }, []);

  const handleDeleteSubstitute = useCallback(
    (substitute, principalId) => {
      const name = substitute.name || 'substituto';
      const message = (t('substitute.deleteConfirm') || 'Excluir "{name}"? Esta ação não pode ser desfeita.')
        .replace('{name}', name);
      setConfirmDialog({
        message,
        onConfirm: async () => {
          setConfirmDialog(null);
          try {
            await api.delete(`/trainer/exercises/${substitute.id}`);
            showToast(t('substitute.deletedToast') || 'Substituto removido.', 'success');
            // Collapse accordion if this was the last substitute of this principal.
            const principal = exercises.find((e) => e.id === principalId);
            const remaining = (principal?.substitutes || []).filter((s) => s.id !== substitute.id);
            if (remaining.length === 0) {
              setExpandedSubstituteIds((prev) => {
                const next = new Set(prev);
                next.delete(principalId);
                return next;
              });
            }
            if (onRefetchTraining) await onRefetchTraining();
          } catch (err) {
            showToast(err.userMessage || t('substitute.deletedToast') || 'Erro ao remover substituto.', 'error');
          }
        },
      });
    },
    [exercises, showToast, onRefetchTraining]
  );

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
              <span className="training-item-meta-sep" aria-hidden="true">·</span>
              <DurationLabel
                seconds={training.estimatedDurationSeconds}
                variant="inline"
                className="training-item-meta-duration"
              />
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
            {selectionMode && (
              <>
                <SelectionActionBar
                  selectedCount={selectedIds.length}
                  maxCount={MAX_BISET_MEMBERS}
                  onCancel={exitSelectionMode}
                  onConfirm={handleGroupSelected}
                  saving={biset.saving}
                />
                <SelectionInstructionStrip />
              </>
            )}

            {exercises.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <SortableContext
                  items={entryIds}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="exercise-list-wide" role="list" aria-label="Exercícios">
                    {(() => {
                      let runningIndex = 0;
                      return renderEntries.map((entry) => {
                        // Drag is disabled while selectionMode is active or readOnly.
                        const dragDisabled = readOnly || selectionMode;

                        if (entry.kind === 'single') {
                          const ex = entry.ex;
                          const i = runningIndex;
                          runningIndex += 1;
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
                                onRequestDelete={() => handleRequestDeleteExercise(ex)}
                              />
                            );
                          }
                          return (
                            <SortableExerciseEntry
                              key={ex.id}
                              id={ex.id}
                              disabled={dragDisabled}
                            >
                              <ExerciseRowWithSubstitutes
                                ex={ex}
                                index={i}
                                readOnly={readOnly}
                                mode={mode}
                                selectionMode={selectionMode}
                                selected={selectedIds.includes(ex.id)}
                                atSelectionLimit={selectedIds.length >= MAX_BISET_MEMBERS}
                                onToggleSelect={handleToggleSelect}
                                onEdit={(exercise) => setComposerState({ editing: exercise })}
                                onDelete={handleRequestDeleteExercise}
                                onEnterSelection={enterSelectionMode}
                                onAddSubstitute={
                                  supportsSubstitutes ? handleAddSubstitute : null
                                }
                                onReplace={handleRequestReplace}
                                substitutesExpanded={expandedSubstituteIds.has(ex.id)}
                                onToggleSubstitutes={handleToggleSubstitutes}
                                onDeleteSubstitute={
                                  supportsSubstitutes ? handleDeleteSubstitute : null
                                }
                              />
                            </SortableExerciseEntry>
                          );
                        }
                        // Bi-set group — the entire block is the drag unit.
                        const groupStartIndex = runningIndex;
                        runningIndex += entry.members.length;
                        // sortable id for a group = first member's id (stable per group).
                        const groupSortableId = entry.members[0].id;
                        return (
                          <SortableExerciseEntry
                            key={entry.groupId}
                            id={groupSortableId}
                            disabled={dragDisabled}
                          >
                            <BisetGroupBlock
                              groupId={entry.groupId}
                              members={entry.members}
                              startIndex={groupStartIndex}
                              readOnly={readOnly}
                              mode={mode}
                              selectionMode={selectionMode}
                              selectedIds={selectedIds}
                              atSelectionLimit={selectedIds.length >= MAX_BISET_MEMBERS}
                              onToggleSelect={handleToggleSelect}
                              onOpenBisetSheet={() => setBisetSheetGroupId(entry.groupId)}
                              onDissolveBiset={() => handleDissolveBiset(entry.groupId)}
                              onEdit={(exercise) => setComposerState({ editing: exercise })}
                              onDelete={handleRequestDeleteExercise}
                              onEnterSelection={enterSelectionMode}
                              onAddSubstitute={
                                supportsSubstitutes ? handleAddSubstitute : null
                              }
                              expandedSubstituteIds={expandedSubstituteIds}
                              onToggleSubstitutes={handleToggleSubstitutes}
                              onDeleteSubstitute={
                                supportsSubstitutes ? handleDeleteSubstitute : null
                              }
                            />
                          </SortableExerciseEntry>
                        );
                      });
                    })()}
                  </div>
                </SortableContext>

                {/* DragOverlay renders a ghost copy of the dragged item at the
                    cursor position, lifted out of the list flow so it can
                    cross stacking contexts freely. */}
                <DragOverlay>
                  {activeEntry ? (
                    <div className="exercise-drag-overlay">
                      {activeEntry.kind === 'single' ? (
                        <span className="exercise-drag-overlay-name">
                          {activeEntry.ex.name || activeEntry.ex.exerciseTemplate?.name || '—'}
                        </span>
                      ) : (
                        <span className="exercise-drag-overlay-name">
                          Bi-set · {activeEntry.members.length} exercícios
                        </span>
                      )}
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
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

      {/* Bi-set action sheet (per-group dissolve / order edit) */}
      <BiSetActionSheet
        open={!!bisetSheetGroupId}
        onDissolve={() => bisetSheetGroupId && handleDissolveBiset(bisetSheetGroupId)}
        onClose={() => setBisetSheetGroupId(null)}
      />

      {/* Substitute composer (protocol mode) */}
      {supportsSubstitutes && (
        <SubstituteComposerSheet
          open={!!substituteComposerPrincipal}
          principal={substituteComposerPrincipal}
          onClose={() => setSubstituteComposerPrincipal(null)}
          onCreated={handleSubstituteCreated}
          exerciseTemplates={exerciseTemplates}
        />
      )}

      <ReplaceExerciseSheet
        open={!!replacingExercise}
        exercise={replacingExercise}
        exerciseTemplates={exerciseTemplates}
        onClose={() => setReplacingExercise(null)}
        onReplace={handleReplaceSubmit}
        onReplaced={handleReplaced}
      />

      {/* Non-adjacent confirmation */}
      {pendingNonAdjacentConfirm && (
        <div className="overlay" onClick={() => setPendingNonAdjacentConfirm(null)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-dialog-message">
              {t('exerciseGroup.nonAdjacentConfirmBody')
                || 'Os exercícios serão reorganizados em sequência.'}
            </p>
            <div className="confirm-dialog-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  const memberIds = pendingNonAdjacentConfirm.memberIds;
                  setPendingNonAdjacentConfirm(null);
                  handleConfirmBisetCreate(memberIds);
                }}
              >
                {t('exerciseGroup.confirmGroupAndReorder') || 'Agrupar e reordenar'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setPendingNonAdjacentConfirm(null)}
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
    estimatedDurationSeconds: PropTypes.number,
  }).isRequired,
  index: PropTypes.number.isRequired,
  exerciseTemplates: PropTypes.arrayOf(PropTypes.object).isRequired,
  saving: PropTypes.bool.isRequired,
  expanded: PropTypes.bool.isRequired,
  readOnly: PropTypes.bool,
  mode: PropTypes.oneOf(['template', 'protocol']),
  onToggleExpand: PropTypes.func.isRequired,
  onEditTraining: PropTypes.func,
  onChangeWeekDay: PropTypes.func,
  onDeleteTraining: PropTypes.func,
  onAddExercise: PropTypes.func,
  onEditExercise: PropTypes.func,
  onImportFromLibrary: PropTypes.func,
  onDeleteExercise: PropTypes.func,
  onReplaceExercise: PropTypes.func,
  onReorder: PropTypes.func,
  onRefetchTraining: PropTypes.func,
};

TrainingItem.defaultProps = {
  readOnly: false,
  mode: 'template',
  onEditTraining: null,
  onChangeWeekDay: null,
  onDeleteTraining: null,
  onAddExercise: null,
  onEditExercise: null,
  onImportFromLibrary: null,
  onDeleteExercise: null,
  onReplaceExercise: null,
  onReorder: null,
  onRefetchTraining: null,
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
  saveHintText,
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
            <div className="builder-topbar-save-group">
              <button
                className="btn-primary"
                onClick={onSave}
                disabled={!canSave || saving}
                aria-disabled={!canSave}
                aria-describedby={saveHintText ? 'builder-save-hint-desktop' : undefined}
              >
                <Save size={16} strokeWidth={2} aria-hidden="true" />
                {saving ? 'Salvando…' : editProtocolId ? 'Concluir' : 'Salvar rotina'}
              </button>
              {saveHintText && (
                <span id="builder-save-hint-desktop" className="builder-save-hint" role="note">
                  {saveHintText}
                </span>
              )}
            </div>
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
  saveHintText: PropTypes.string,
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
  saveHintText: null,
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
  // Tracks whether the trainer has made any mutation in template-edit mode.
  // Starts false so the guard does not fire while the initial data is loading
  // into state — it only activates after the first explicit change.
  const touchedRef = useRef(false);

  const isProtocol = mode === 'protocol';
  const isTemplateEdit = !isProtocol && !!routineId;

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

  // ── Save hint (explains why the primary save action is disabled) ─────────
  // Support text near the button instead of a tooltip — a disabled button does
  // not reliably fire a tooltip, and tooltips do not work on touch at all.

  const saveHintText = useMemo(() => {
    if (editProtocolId) return null;
    const missing = [];
    if (!hasName) missing.push('nome da rotina');
    if (!hasTrainings) missing.push('ao menos um treino');
    if (!hasStartDate) missing.push('data de início');
    if (missing.length === 0) return null;
    // Pristine — none of the three (name, trainings, start date) has been
    // touched yet. Suppress the hint here: the trainer just arrived, there is
    // nothing to explain yet, and a red warning on the very first frame only
    // teaches them to tune it out. Once any one of the three is filled in,
    // the hint starts listing what's still missing.
    const isPristine = !hasName && !hasTrainings && !(isProtocol && hasStartDate);
    if (isPristine) return null;
    return `Para salvar, informe: ${missing.join(', ')}.`;
  }, [editProtocolId, hasName, hasTrainings, hasStartDate, isProtocol]);

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

  // ── Draft meta (protocol create mode only) ────────────────────────────────
  // Unlike template mode, the protocol draft also carries startDate/
  // expirationDate/assigneeId — fields with no template-mode equivalent.

  const protocolDraftMeta = useMemo(
    () => ({
      type: routine.data?.type || '',
      trainingLevel: routine.data?.trainingLevel || '',
      genderOrdination: routine.data?.genderOrdination || '',
      description: routine.data?.description || '',
      startDate: routine.data?.startDate || '',
      expirationDate: routine.data?.expirationDate || '',
      assigneeId: routine.data?.assigneeId || studentId || '',
    }),
    [
      routine.data?.type,
      routine.data?.trainingLevel,
      routine.data?.genderOrdination,
      routine.data?.description,
      routine.data?.startDate,
      routine.data?.expirationDate,
      routine.data?.assigneeId,
      studentId,
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

  // ── Autosave draft (protocol create mode only) ────────────────────────────
  // Protocol create mode is fully deferred (nothing hits the backend until the
  // final save), so this is the only safety net against a failed save or an
  // accidental reload/navigation losing the trainer's work.

  const handleRestoreProtocolDraft = useCallback(
    ({ name: draftName, meta, trainings: draftTrainings }) => {
      if (draftName) setTitleName(draftName);
      routine.hydrateFromDraft({ meta, trainings: draftTrainings });
    },
    [routine]
  );

  const protocolDraft = useProtocolDraft({
    enabled: isProtocol && !editProtocolId && !readOnly && !routine.loading && !!studentId,
    studentId,
    name: titleName,
    meta: protocolDraftMeta,
    trainings,
    onRestore: handleRestoreProtocolDraft,
  });

  // ── Unsaved-changes guard ─────────────────────────────────────────────────
  //
  // Fires the native browser beforeunload prompt when the trainer would lose
  // in-memory work by closing or reloading the window.
  //
  // Protocol EDIT  → eager mutations, always persisted → no guard.
  // Protocol VIEW  → read-only → no guard.
  // Protocol CREATE → dirty when name, trainings, or startDate are non-empty.
  // Template CREATE → dirty when name, trainings, or meta fields are non-empty
  //                   (mirrors the draft flush-on-unmount guard in useRoutineDraft).
  // Template EDIT  → dirty only after the trainer makes an explicit mutation,
  //                   tracked via touchedRef (avoids false-positive on initial load).

  const hasMeta = Object.values(draftMeta).some(
    (v) => v !== null && v !== '' && v !== undefined
  );

  const isDirty = (() => {
    if (readOnly || editProtocolId) return false;
    if (isTemplateEdit) return touchedRef.current;
    if (isProtocol) return hasName || hasTrainings || !!(routine.data?.startDate);
    // Template CREATE
    return hasName || hasTrainings || hasMeta;
  })();

  useUnsavedChangesWarning(isDirty);

  const saveStatusLabel = (() => {
    if (editProtocolId) return 'Editando rotina do aluno';
    if (isProtocol) {
      if (protocolDraft.lastSaved) return `Rascunho salvo ${formatRelativeTime(protocolDraft.lastSaved)}`;
      return 'Rotina do aluno · Pronto para salvar';
    }
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
    touchedRef.current = true;
    routine.updateMeta({ name: titleName });
  }, [routine, titleName]);

  const handleCreateTraining = useCallback(
    async (payload) => {
      touchedRef.current = true;
      const created = await routine.createTraining(payload);
      if (created?.id) setExpandedId(created.id);
      return created;
    },
    [routine]
  );

  const handleImportTrainings = useCallback(
    async (ids) => {
      touchedRef.current = true;
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
        protocolDraft.clearDraft();
        showToast('Rotina salva.', 'success');
        navigate(`/trainer/protocols/${saved.id}`);
      }
    } catch (err) {
      showToast(err.userMessage || translateError(err), 'error');
    }
  }, [canSave, routine, titleName, trainings, draft, protocolDraft, showToast, navigate, isProtocol, studentId, editProtocolId]);

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
      touchedRef.current = true;
      await routine.updateTraining(id, payload);
    },
    [routine]
  );

  const handleImportTemplate = useCallback((templateId) => {
    touchedRef.current = true;
    setImportTemplateSheetOpen(false);
    routine.loadFromTemplate(templateId);
  }, [routine]);

  const handleTitleChange = useCallback((value) => {
    touchedRef.current = true;
    setTitleName(value);
  }, []);

  const handleUpdateMeta = useCallback((patch) => {
    touchedRef.current = true;
    routine.updateMeta(patch);
  }, [routine]);

  const handleDeleteTraining = useCallback((trainingId) => {
    touchedRef.current = true;
    routine.deleteTraining(trainingId);
  }, [routine]);

  // Sets the touched flag then forwards to a routine mutation. Used for inline
  // exercise-level callbacks where extracting a full named handler would add
  // more indirection than clarity.
  const markTouched = useCallback(() => {
    touchedRef.current = true;
  }, []);

  // ── Summary sheet ────────────────────────────────────────────────────────

  const totalExerciseCount = useMemo(
    () => trainings.reduce((sum, t) => sum + (t.exercises?.length || 0), 0),
    [trainings]
  );

  // Flat ordered list of all trainings (assigned first sorted by weekday,
  // then unassigned) for the sheet — mirrors the render order used in the
  // canvas below.
  const orderedTrainings = useMemo(
    () => sortTrainingsByWeekDay(trainings),
    [trainings]
  );

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
        onChange={readOnly ? null : handleTitleChange}
        onBack={handleBack}
        onCancel={readOnly ? null : handleCancel}
        onSave={readOnly ? null : handleSave}
        onEdit={readOnly ? handleEdit : null}
        onImportTemplate={isProtocol && !readOnly ? () => setImportTemplateSheetOpen(true) : null}
        onOpenSummary={() => setSummarySheetOpen(true)}
        saving={routine.saving}
        canSave={canSave}
        saveHintText={readOnly ? null : saveHintText}
      />

      {routine.error && (
        <div className="builder-error-banner" role="alert">
          <AlertTriangle
            size={16}
            strokeWidth={2}
            className="builder-error-banner-icon"
            aria-hidden="true"
          />
          <span>{routine.error}</span>
        </div>
      )}

      <IdentityStrip
        routineData={routine.data}
        mode={mode}
        readOnly={readOnly}
        onUpdateMeta={readOnly ? null : handleUpdateMeta}
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
          const sortedTrainings = sortTrainingsByWeekDay(trainings);
          const assignedTrainings = sortedTrainings.filter((t) => t.weekDay);
          const unassignedTrainings = sortedTrainings.filter((t) => !t.weekDay);
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
              mode={mode}
              onToggleExpand={() => handleToggleExpand(t.id)}
              onEditTraining={readOnly ? null : handleOpenEditTraining}
              onChangeWeekDay={readOnly ? null : (weekDay) => { markTouched(); routine.updateTrainingWeekDay(t.id, weekDay); }}
              onDeleteTraining={readOnly ? null : () => handleDeleteTraining(t.id)}
              onAddExercise={readOnly ? null : (payload) => { markTouched(); return routine.addExercise(t.id, payload); }}
              onEditExercise={readOnly ? null : (exId, payload) => { markTouched(); return routine.updateExercise(t.id, exId, payload); }}
              onImportFromLibrary={readOnly ? null : (ids, templatesById) => {
                markTouched();
                return Promise.all(
                  ids.map((tmplId) =>
                    routine.addExerciseFromTemplate(t.id, tmplId, {
                      template: templatesById?.[tmplId],
                    })
                  )
                );
              }}
              onDeleteExercise={readOnly ? null : (exId) => { markTouched(); return routine.deleteExercise(t.id, exId); }}
              onReplaceExercise={readOnly ? null : (exId, templateId, templateObject) => {
                markTouched();
                return routine.replaceExerciseFromTemplate(t.id, exId, templateId, templateObject);
              }}
              onReorder={
                readOnly
                  ? null
                  : (ids, reordered) => { markTouched(); return routine.reorderExercises(t.id, ids, reordered); }
              }
              onRefetchTraining={
                readOnly || !routine.refetchTrainingExercises
                  ? null
                  : () => routine.refetchTrainingExercises(t.id)
              }
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
          <Pencil size={16} strokeWidth={2} aria-hidden="true" />
          EDITAR
        </button>
      )}

      {/* Edit/create: save FAB — mobile only (desktop hidden via CSS) */}
      {!readOnly && (
        <>
          <button
            className="builder-edit-fab"
            onClick={handleSave}
            disabled={!canSave || routine.saving}
            aria-disabled={!canSave}
            aria-describedby={saveHintText ? 'builder-save-hint-mobile' : undefined}
            aria-label={routine.saving ? 'Salvando' : editProtocolId ? 'Concluir edição' : 'Salvar rotina'}
          >
            <Save size={16} strokeWidth={2} aria-hidden="true" />
            {routine.saving ? 'SALVANDO…' : editProtocolId ? 'CONCLUIR' : 'SALVAR'}
          </button>
          {saveHintText && (
            <span
              id="builder-save-hint-mobile"
              className="builder-save-hint builder-save-hint--fab"
              role="note"
            >
              {saveHintText}
            </span>
          )}
        </>
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
