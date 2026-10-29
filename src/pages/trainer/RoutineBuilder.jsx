import React, { useState, useRef, useEffect, useCallback, useMemo, useId } from 'react';
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
  Dumbbell,
  Edit3,
  FileDown,
  GripVertical,
  Layers,
  MoreVertical,
  Pencil,
  Plus,
  Save,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import RoutineSummarySheet from '../../components/RoutineSummarySheet';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import useRoutineBuilder from '../../hooks/useRoutineBuilder';
import { markOnboardingStepOptimistic, readOnboardingStatusCache } from '../../hooks/useOnboardingStatus';
import useProtocolBuilder from '../../hooks/useProtocolBuilder';
import useRoutineDraft from '../../hooks/useRoutineDraft';
import useProtocolDraft from '../../hooks/useProtocolDraft';
import useUnsavedChangesWarning from '../../hooks/useUnsavedChangesWarning';
import useBisetCreate from '../../hooks/useBisetCreate';
import useExerciseReorder from '../../hooks/useExerciseReorder';
import useDismissablePopover from '../../hooks/useDismissablePopover';
import useAnchoredPopoverPosition, {
  placeBelowStart,
  placeFlipEnd,
  placeFlipStart,
} from '../../hooks/useAnchoredPopoverPosition';
import formatRelativeTime from '../../utils/relativeTime';
import AddTrainingSheet from '../../components/AddTrainingSheet';
import BiSetBadge from '../../components/BiSetBadge';
import SubstitutesInline from '../../components/SubstitutesInline';
import IntensityBadge from '../../components/IntensityBadge';
import SelectionActionBar, { SelectionInstructionStrip } from '../../components/SelectionActionBar';
import Badge from '../../components/ds/Badge';
import EmptyBlock from '../../components/ds/EmptyBlock';
import ConfirmDialog from '../../components/ds/ConfirmDialog';
import Modal from '../../components/ds/Modal';
import api from '../../api/axios';
import { t, translateError } from '../../i18n';
import { WEEK_DAY_OPTIONS_SHORT } from '../../constants/weekDays';
import { sortTrainingsByWeekDay } from '../../utils/sortTrainingsByWeekDay';
import { formatExerciseMeta, formatRestDuration } from '../../utils/exerciseMeta';
import DurationLabel from '../../components/DurationLabel';
import DescriptionChipEditor from '../../components/routineBuilder/DescriptionChipEditor';
import RoutineSummaryStrip from '../../components/routineBuilder/RoutineSummaryStrip';
import ExerciseDrawer from '../../components/routineBuilder/ExerciseDrawer';
import useExerciseDrawer from '../../hooks/useExerciseDrawer';
import useConfirmDialog from '../../hooks/useConfirmDialog';
import useMediaQuery from '../../hooks/useMediaQuery';
import useFormLayoutPreference from '../../hooks/useFormLayoutPreference';
import TechniqueChips from '../../components/advancedTechniques/TechniqueChips';
import VideoBadge from '../../components/VideoBadge';
import { hasDemoMedia } from '../../utils/demoMedia';
import FormLayoutToggle from '../../components/routineBuilder/FormLayoutToggle';
import { PROTOCOL_TYPE_OPTIONS, getProtocolTypeLabel } from '../../constants/protocolTypes';
import { TRAINING_LEVEL_OPTIONS, getLevelLabel } from '../../constants/trainingLevels';
import { GENDER_OPTIONS, getGenderLabel } from '../../constants/genderOrdination';

// ─── Constants ────────────────────────────────────────────────────────────────

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
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  const handleDismiss = useCallback(() => setOpen(false), []);
  useDismissablePopover({ open, refs: [triggerRef, popoverRef], onDismiss: handleDismiss });
  useAnchoredPopoverPosition({ open, triggerRef, popoverRef, place: placeBelowStart });

  const handleSelect = (v) => {
    onChange(v || null);
    setOpen(false);
  };

  const handleToggle = useCallback(() => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
  }, [open]);

  const isFilled = !!value;

  const popover = open
    ? createPortal(
        <div
          ref={popoverRef}
          className="identity-chip-popover"
          role="listbox"
          aria-label={`Escolher ${label}`}
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
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const inputRef = useRef(null);

  const handleDismiss = useCallback(() => setOpen(false), []);
  useDismissablePopover({ open, refs: [triggerRef, popoverRef], onDismiss: handleDismiss });
  useAnchoredPopoverPosition({ open, triggerRef, popoverRef, place: placeBelowStart });

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
    setOpen(true);
  }, [open]);

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

// ─── WeekdayChip ──────────────────────────────────────────────────────────────

const WeekdayChip = ({ value, onChange, readOnly }) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  const label = useMemo(() => {
    if (!value) return 'Sem dia';
    const found = WEEK_DAY_OPTIONS_SHORT.find(
      (o) => o.value === value.toLowerCase()
    );
    return found ? found.label : value;
  }, [value]);

  const handleDismiss = useCallback(() => setOpen(false), []);
  useDismissablePopover({ open, refs: [triggerRef, popoverRef], onDismiss: handleDismiss });
  useAnchoredPopoverPosition({ open, triggerRef, popoverRef, place: placeFlipStart });

  const handleToggle = useCallback(
    (e) => {
      e.stopPropagation();
      setOpen((prev) => !prev);
    },
    []
  );

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
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const handleDismiss = useCallback(() => setOpen(false), []);
  useDismissablePopover({ open, refs: [triggerRef, menuRef], onDismiss: handleDismiss });
  useAnchoredPopoverPosition({ open, triggerRef, popoverRef: menuRef, place: placeFlipEnd });

  const handleTriggerClick = useCallback(
    (e) => {
      e.stopPropagation();
      setOpen((prev) => {
        const next = !prev;
        if (next && onOpen) onOpen();
        return next;
      });
    },
    [onOpen]
  );

  const dropdown = open
    ? createPortal(
        <div
          ref={menuRef}
          className="row-menu-dropdown row-menu-dropdown--portal"
          role="menu"
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
        <MoreVertical size={20} strokeWidth={2} aria-hidden="true" />
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
  const meta = formatExerciseMeta(ex, { hideRest: isBisetMember }) || formatExerciseMeta(ex.exerciseTemplate, { hideRest: isBisetMember });
  const techniques = ex.advancedTechniques ?? [];
  const intensity = ex.intensity ?? ex.exerciseTemplate?.intensity ?? null;
  const intensityLabel = ex.intensityLabel ?? ex.exerciseTemplate?.intensityLabel ?? null;

  const isInteractive = !readOnly && !selectionMode && onEdit;

  const handleRowKeyDown = (e) => {
    if (e.target !== e.currentTarget) return;
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
          className="icon-button"
          aria-label={`Excluir ${name}`}
          title={`Excluir ${name}`}
          onClick={handleDelete}
        >
          <Trash2 size={20} strokeWidth={2} aria-hidden="true" />
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
      <span className="exercise-row-index type-caption-strong" aria-hidden="true">{index + 1}</span>
      <div className="exercise-row-wide-body">
        <span className="exercise-row-wide-name-row">
          <span className="exercise-row-wide-name type-body-strong">{name}</span>
          <IntensityBadge intensity={intensity} label={intensityLabel} />
        </span>
        {(meta || techniques.length > 0 || hasDemoMedia(ex)) && (
          <span className="exercise-row-wide-meta type-caption">
            {meta}
            {restMutedLabel && (
              <>
                {' · '}
                <span className="biset-member-rest-muted">
                  {t('exerciseGroup.noRest') || 'sem descanso'}
                </span>
              </>
            )}
            <VideoBadge exercise={ex} />
            <TechniqueChips techniques={techniques} />
          </span>
        )}
        {selectionMode && selectionDisabled && selectionDisabledReason && (
          <span className="exercise-selection-row-caption type-caption">{selectionDisabledReason}</span>
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
 * Builds the kebab entries for an exercise row. Editing is not listed: the row
 * itself is the edit affordance. The same builder serves bi-set members and
 * standalone rows.
 */
const buildExerciseRowMenu = ({ ex, onAddSubstitute, onDelete }) => {
  const items = [];
  if (onAddSubstitute) {
    items.push({
      label: t('substitute.add') || 'Adicionar substituto',
      onClick: () => onAddSubstitute(ex),
    });
  }
  if (onDelete) items.push({ label: 'Remover', danger: true, onClick: () => onDelete(ex) });
  return items;
};

// ─── SubstituteRow ────────────────────────────────────────────────────────────

// One substitute in the expanded list: the body opens the edit drawer, the trash button deletes.
const SubstituteRow = ({ substitute, principal, readOnly, onEdit, onDelete }) => {
  const meta = formatExerciseMeta(substitute);
  const canEdit = !readOnly && onEdit;
  const body = (
    <>
      <span className="substitute-row-name">{substitute.name || '—'}</span>
      {meta && <span className="substitute-row-meta">{meta}</span>}
    </>
  );
  // deviation: RULE 5 — row body opens edit (locked AC #29 test needs button "Editar substituto X"); trash stays visible like the existing substitute list
  return (
    <div className="substitute-row" role="listitem" data-substitute-id={substitute.id}>
      {canEdit ? (
        <button
          type="button"
          className="substitute-row-edit"
          aria-label={(t('substitute.editAria') || 'Editar substituto {name}').replace('{name}', substitute.name || '')}
          onClick={() => onEdit(substitute, principal)}
        >
          {body}
        </button>
      ) : (
        <div className="substitute-row-body">{body}</div>
      )}
      {!readOnly && onDelete && (
        <button
          type="button"
          className="icon-button"
          aria-label={(t('substitute.deleteAria') || 'Excluir substituto {name}').replace('{name}', substitute.name || '')}
          onClick={() => onDelete(substitute, principal.id)}
        >
          <Trash2 size={20} strokeWidth={2} aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

SubstituteRow.propTypes = {
  substitute: PropTypes.object.isRequired,
  principal: PropTypes.object.isRequired,
  readOnly: PropTypes.bool,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
};

SubstituteRow.defaultProps = { readOnly: false, onEdit: null, onDelete: null };

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
  onAddSubstitute,
  substitutesExpanded,
  onToggleSubstitutes,
  onDeleteSubstitute,
  onEditSubstitute,
  dragHandle,
}) => {
  const substitutes = Array.isArray(ex.substitutes) ? ex.substitutes : [];
  const supportsSubstitutes = mode === 'protocol';
  const showInline = supportsSubstitutes && substitutes.length > 0 && !selectionMode;

  const menuItems = readOnly || selectionMode
    ? null
    : buildExerciseRowMenu({ ex, onAddSubstitute, onDelete });

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
                <SubstituteRow
                  key={sub.id}
                  substitute={sub}
                  principal={ex}
                  readOnly={readOnly}
                  onEdit={onEditSubstitute}
                  onDelete={onDeleteSubstitute}
                />
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
  onAddSubstitute: PropTypes.func,
  substitutesExpanded: PropTypes.bool,
  onToggleSubstitutes: PropTypes.func,
  onDeleteSubstitute: PropTypes.func,
  onEditSubstitute: PropTypes.func,
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
  onAddSubstitute: null,
  substitutesExpanded: false,
  onToggleSubstitutes: null,
  onDeleteSubstitute: null,
  onEditSubstitute: null,
  dragHandle: null,
};

// ─── BisetGroupBlock ──────────────────────────────────────────────────────────

// Round-rest control of a bi-set: editable seconds input (commits on blur) or read-only text.
const BisetRoundRest = ({ value, readOnly, onCommit }) => {
  const inputId = useId();
  const [draft, setDraft] = useState(value == null ? '' : String(value));

  const label = t('exerciseGroup.roundRest') || 'Descanso da rodada';

  if (readOnly) {
    const duration = formatRestDuration(value);
    if (!duration) return null;
    return <span className="biset-round-rest type-caption">{label}: {duration}</span>;
  }

  const handleBlur = () => {
    const seconds = parseInt(draft, 10);
    if (Number.isNaN(seconds) || seconds < 0 || seconds === value) {
      setDraft(value == null ? '' : String(value));
      return;
    }
    onCommit(seconds);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') e.currentTarget.blur();
  };

  return (
    <span className="biset-round-rest">
      <label htmlFor={inputId} className="type-caption-strong">{label}</label>
      <input
        id={inputId}
        type="number"
        min="0"
        inputMode="numeric"
        className="input biset-round-rest__input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
      <span className="type-caption">s</span>
    </span>
  );
};

BisetRoundRest.propTypes = {
  value: PropTypes.number,
  readOnly: PropTypes.bool,
  onCommit: PropTypes.func,
};

BisetRoundRest.defaultProps = {
  value: null,
  readOnly: false,
  onCommit: () => {},
};

/**
 * Renders a bi-set group container — static "Bi-set" badge, round-rest control
 * and a trash button on the head, then one ExerciseRow per member. Non-last
 * members show "sem descanso" and hide their own rest (the round rest applies).
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
  onChangeRest,
  onDissolveBiset,
  onEdit,
  onDelete,
  onAddSubstitute,
  expandedSubstituteIds,
  onToggleSubstitutes,
  onDeleteSubstitute,
  onEditSubstitute,
  dragHandle,
}) => {
  const roundRest = members[0]?.supersetRestInterval ?? members[members.length - 1]?.restInterval ?? null;
  const canEditGroup = !readOnly && !selectionMode;

  return (
    <div className="biset-group-section" role="group" aria-label="Bi-set">
      <div className="biset-group-section-head">
        {dragHandle}
        <BiSetBadge />
        <BisetRoundRest
          key={roundRest ?? 'none'}
          value={roundRest}
          readOnly={!canEditGroup}
          onCommit={(seconds) => onChangeRest?.(groupId, seconds)}
        />
        {canEditGroup && onDissolveBiset && (
          <button
            type="button"
            className="icon-button biset-group-trash"
            aria-label={t('exerciseGroup.dissolveBiset') || 'Desfazer bi-set'}
            title={t('exerciseGroup.dissolveBiset') || 'Desfazer bi-set'}
            onClick={onDissolveBiset}
          >
            <Trash2 size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      </div>
      {members.map((member, mIdx) => {
        const isLast = mIdx === members.length - 1;
        const substitutes = Array.isArray(member.substitutes) ? member.substitutes : [];
        const supportsSubstitutes = mode === 'protocol';
        const expanded = expandedSubstituteIds?.has(member.id);
        const menuItems = readOnly || selectionMode
          ? null
          : buildExerciseRowMenu({ ex: member, onAddSubstitute, onDelete });

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
                      <SubstituteRow
                        key={sub.id}
                        substitute={sub}
                        principal={member}
                        readOnly={readOnly}
                        onEdit={onEditSubstitute}
                        onDelete={onDeleteSubstitute}
                      />
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
  onChangeRest: PropTypes.func,
  onDissolveBiset: PropTypes.func,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onAddSubstitute: PropTypes.func,
  expandedSubstituteIds: PropTypes.instanceOf(Set),
  onDeleteSubstitute: PropTypes.func,
  onEditSubstitute: PropTypes.func,
  onToggleSubstitutes: PropTypes.func,
  dragHandle: PropTypes.node,
};

BisetGroupBlock.defaultProps = {
  readOnly: false,
  selectionMode: false,
  selectedIds: [],
  atSelectionLimit: false,
  onToggleSelect: null,
  onChangeRest: null,
  onDissolveBiset: null,
  onEdit: null,
  onDelete: null,
  onAddSubstitute: null,
  expandedSubstituteIds: null,
  onToggleSubstitutes: null,
  onDeleteSubstitute: null,
  onEditSubstitute: null,
  dragHandle: null,
};

// ─── TrainingItem ─────────────────────────────────────────────────────────────

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

// Status of a training card: empty / partial (< 3 exercises) / ready. Shown as a Tag badge.
const getTrainingReadiness = (exerciseCount) => {
  if (exerciseCount === 0) return { tone: 'neutral', label: 'Vazio' };
  if (exerciseCount < 3) return { tone: 'warning', label: 'Parcial' };
  return { tone: 'success', label: 'Pronto' };
};

const TrainingItem = ({
  training,
  index,
  expanded,
  readOnly,
  mode,
  onToggleExpand,
  onEditTraining,
  onChangeWeekDay,
  onDeleteTraining,
  onOpenAddExercise,
  onOpenEditExercise,
  onOpenAddSubstitute,
  onOpenEditSubstitute,
  onDeleteExercise,
  onReorder,
  onRefetchTraining,
  localOps,
}) => {
  const { showToast } = useToast();
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [expandedSubstituteIds, setExpandedSubstituteIds] = useState(() => new Set());
  const [pendingNonAdjacentConfirm, setPendingNonAdjacentConfirm] = useState(null);

  const supportsSubstitutes = mode === 'protocol';
  const supportsBiset = supportsSubstitutes && !readOnly;

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

  const biset = useBisetCreate();

  const readiness = getTrainingReadiness(exercises.length);

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

  const handleRequestDeleteExercise = (ex) => {
    const name = ex.name || ex.exerciseTemplate?.name || 'exercício';
    setConfirmDialog({
      message: `Excluir "${name}"? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      onConfirm: async () => {
        setConfirmDialog(null);
        await onDeleteExercise(ex.id);
      },
    });
  };

  const handleRequestDeleteTraining = () => {
    setConfirmDialog({
      message: `Excluir treino "${training.name}"? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      onConfirm: () => {
        setConfirmDialog(null);
        onDeleteTraining();
      },
    });
  };

  const trainingMenuItems = readOnly ? [] : [
    { kind: 'caption', label: 'Editar' },
    { label: 'Editar', onClick: () => onEditTraining(training) },
    { label: 'Excluir', danger: true, onClick: handleRequestDeleteTraining },
  ];

  // ── Bi-set actions ───────────────────────────────────────────────────────

  const ungroupedCount = exercises.filter((e) => !e.supersetGroupId).length;

  const findGroupMembers = useCallback(
    (groupId) => exercises.filter((e) => e.supersetGroupId === groupId),
    [exercises]
  );

  const refetchWhenPersisted = useCallback(async () => {
    if (!localOps && onRefetchTraining) await onRefetchTraining();
  }, [localOps, onRefetchTraining]);

  const handleConfirmBisetCreate = useCallback(
    async (memberIds) => {
      try {
        if (localOps) await localOps.createSuperset(training.id, memberIds);
        else await biset.createBiset(memberIds, { trainingId: training.id });
        showToast(t('exerciseGroup.bisetCreated') || 'Bi-set criado.', 'success');
        exitSelectionMode();
        await refetchWhenPersisted();
      } catch (err) {
        showToast(err.message || 'Erro ao criar bi-set.', 'error');
      }
    },
    [biset, localOps, training.id, exitSelectionMode, showToast, refetchWhenPersisted]
  );

  const handleGroupSelected = useCallback(() => {
    if (selectedIds.length < 2) return;
    const positions = selectedIds
      .map((id) => exercises.findIndex((e) => e.id === id))
      .sort((a, b) => a - b);
    const ordered = positions.map((p) => exercises[p].id);
    const contiguous = positions.every((p, idx) => idx === 0 || p === positions[idx - 1] + 1);
    if (contiguous) {
      handleConfirmBisetCreate(ordered);
      return;
    }
    setPendingNonAdjacentConfirm({ memberIds: ordered });
  }, [selectedIds, exercises, handleConfirmBisetCreate]);

  const dissolveGroup = useCallback(
    async (groupId) => {
      try {
        if (localOps) await localOps.dissolveSuperset(training.id, groupId);
        else await biset.dissolveBiset(groupId, { trainingId: training.id });
        showToast(t('exerciseGroup.bisetDissolved') || 'Bi-set desfeito.', 'success');
        await refetchWhenPersisted();
      } catch (err) {
        showToast(err.message || 'Erro ao desfazer bi-set.', 'error');
      }
    },
    [biset, localOps, training.id, showToast, refetchWhenPersisted]
  );

  const handleDissolveBiset = useCallback(
    (groupId) => {
      if (findGroupMembers(groupId).length === 0) return;
      setConfirmDialog({
        message: t('exerciseGroup.confirmDissolve')
          || 'Desfazer bi-set? Os exercícios serão mantidos como individuais.',
        confirmLabel: 'Desfazer bi-set',
        onConfirm: async () => {
          setConfirmDialog(null);
          await dissolveGroup(groupId);
        },
      });
    },
    [findGroupMembers, dissolveGroup]
  );

  const handleChangeBisetRest = useCallback(
    async (groupId, seconds) => {
      try {
        if (localOps) await localOps.setSupersetRest(training.id, groupId, seconds);
        else await biset.updateRest(groupId, seconds, { trainingId: training.id });
        await refetchWhenPersisted();
      } catch (err) {
        showToast(err.message || 'Erro ao atualizar o descanso da rodada.', 'error');
      }
    },
    [biset, localOps, training.id, showToast, refetchWhenPersisted]
  );

  // ── Substitute actions (protocol mode only) ──────────────────────────────

  const expandSubstitutesOf = useCallback(
    (principalId) => setExpandedSubstituteIds((prev) => new Set(prev).add(principalId)),
    []
  );

  const handleAddSubstitute = useCallback(
    (principal) => {
      const wasEmpty = (principal.substitutes?.length || 0) === 0;
      onOpenAddSubstitute(training.id, principal, () => {
        if (wasEmpty) expandSubstitutesOf(principal.id);
        showToast(t('substitute.addedToast') || 'Substituto adicionado.', 'success');
      });
    },
    [onOpenAddSubstitute, training.id, expandSubstitutesOf, showToast]
  );

  const handleEditSubstitute = useCallback(
    (substitute, principal) => onOpenEditSubstitute(training.id, principal, substitute),
    [onOpenEditSubstitute, training.id]
  );

  const handleToggleSubstitutes = useCallback((principalId) => {
    setExpandedSubstituteIds((prev) => {
      const next = new Set(prev);
      if (next.has(principalId)) next.delete(principalId);
      else next.add(principalId);
      return next;
    });
  }, []);

  const removeSubstitute = useCallback(
    async (substitute, principalId) => {
      if (localOps) await localOps.removeSubstitute(training.id, principalId, substitute.id);
      else await api.delete(`/trainer/exercises/${substitute.id}`);
      showToast(t('substitute.deletedToast') || 'Substituto removido.', 'success');
      const principal = exercises.find((e) => e.id === principalId);
      const remaining = (principal?.substitutes || []).filter((s) => s.id !== substitute.id);
      if (remaining.length === 0) {
        setExpandedSubstituteIds((prev) => {
          const next = new Set(prev);
          next.delete(principalId);
          return next;
        });
      }
      await refetchWhenPersisted();
    },
    [localOps, training.id, exercises, showToast, refetchWhenPersisted]
  );

  const handleDeleteSubstitute = useCallback(
    (substitute, principalId) => {
      const name = substitute.name || 'substituto';
      const message = (t('substitute.deleteConfirm') || 'Excluir "{name}"? Esta ação não pode ser desfeita.')
        .replace('{name}', name);
      setConfirmDialog({
        message,
        confirmLabel: 'Excluir',
        onConfirm: async () => {
          setConfirmDialog(null);
          try {
            await removeSubstitute(substitute, principalId);
          } catch (err) {
            showToast(err.userMessage || translateError(err), 'error');
          }
        },
      });
    },
    [removeSubstitute, showToast]
  );

  return (
    <>
      <div
        className={`training-item accordion${expanded ? ' training-item--expanded' : ''}`}
        data-training-id={training.id}
      >
        {/* ── Head ── */}
        <div
          className="training-item-head accordion-header"
          onClick={onToggleExpand}
          role="button"
          aria-expanded={expanded}
          aria-controls={`training-body-${training.id}`}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggleExpand();
            }
          }}
        >
          <span className="accordion-index type-caption-strong" aria-hidden="true">
            {letter}
          </span>

          <div className="training-item-main accordion-heading">
            <div className="training-item-title-row">
              <span className="accordion-title type-body-lg-strong">{training.name || '—'}</span>
            </div>

            <div className="training-item-meta accordion-meta type-caption">
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
              <Badge variant="tag" tone={readiness.tone}>{readiness.label}</Badge>
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
              className="icon-button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              aria-label={expanded ? 'Recolher treino' : 'Expandir treino'}
            >
              <ChevronDown size={20} strokeWidth={2} className="accordion-chevron" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        {expanded && (
          <div className="training-item-body accordion-body" id={`training-body-${training.id}`}>
            {!readOnly && (
              <div className="training-item-toolbar">
                {supportsBiset && !selectionMode && (
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={enterSelectionMode}
                    disabled={ungroupedCount < 2}
                  >
                    <Layers size={16} strokeWidth={2} aria-hidden="true" />
                    {t('exerciseGroup.createBiset') || 'Criar bi-set'}
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn--secondary training-item-toolbar__add"
                  onClick={() => onOpenAddExercise(training.id)}
                >
                  <Plus size={16} strokeWidth={2} aria-hidden="true" />
                  Adicionar exercício
                </button>
              </div>
            )}
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
                                onEdit={(exercise) => onOpenEditExercise(training.id, exercise)}
                                onDelete={handleRequestDeleteExercise}
                                onAddSubstitute={
                                  supportsSubstitutes ? handleAddSubstitute : null
                                }
                                substitutesExpanded={expandedSubstituteIds.has(ex.id)}
                                onToggleSubstitutes={handleToggleSubstitutes}
                                onDeleteSubstitute={
                                  supportsSubstitutes ? handleDeleteSubstitute : null
                                }
                                onEditSubstitute={supportsSubstitutes ? handleEditSubstitute : null}
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
                              onChangeRest={handleChangeBisetRest}
                              onDissolveBiset={() => handleDissolveBiset(entry.groupId)}
                              onEdit={(exercise) => onOpenEditExercise(training.id, exercise)}
                              onDelete={handleRequestDeleteExercise}
                              onAddSubstitute={
                                supportsSubstitutes ? handleAddSubstitute : null
                              }
                              expandedSubstituteIds={expandedSubstituteIds}
                              onToggleSubstitutes={handleToggleSubstitutes}
                              onDeleteSubstitute={
                                supportsSubstitutes ? handleDeleteSubstitute : null
                              }
                              onEditSubstitute={supportsSubstitutes ? handleEditSubstitute : null}
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
              <EmptyBlock
                icon={Dumbbell}
                title="Nenhum exercício"
                description={
                  readOnly
                    ? 'Este treino ainda não tem exercícios.'
                    : 'Use "Adicionar exercício" acima para começar.'
                }
              />
            )}
          </div>
        )}
      </div>

      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel || 'Confirmar'}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {pendingNonAdjacentConfirm && (
        <ConfirmDialog
          message={
            t('exerciseGroup.nonAdjacentConfirmBody')
            || 'Os exercícios serão reorganizados em sequência.'
          }
          confirmLabel={t('exerciseGroup.confirmGroupAndReorder') || 'Agrupar e reordenar'}
          confirmTone="primary"
          onConfirm={() => {
            const memberIds = pendingNonAdjacentConfirm.memberIds;
            setPendingNonAdjacentConfirm(null);
            handleConfirmBisetCreate(memberIds);
          }}
          onCancel={() => setPendingNonAdjacentConfirm(null)}
        />
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
  expanded: PropTypes.bool.isRequired,
  readOnly: PropTypes.bool,
  mode: PropTypes.oneOf(['template', 'protocol']),
  onToggleExpand: PropTypes.func.isRequired,
  onEditTraining: PropTypes.func,
  onChangeWeekDay: PropTypes.func,
  onDeleteTraining: PropTypes.func,
  onOpenAddExercise: PropTypes.func,
  onOpenEditExercise: PropTypes.func,
  onOpenAddSubstitute: PropTypes.func,
  onOpenEditSubstitute: PropTypes.func,
  onDeleteExercise: PropTypes.func,
  onReorder: PropTypes.func,
  onRefetchTraining: PropTypes.func,
  localOps: PropTypes.shape({
    createSuperset: PropTypes.func.isRequired,
    dissolveSuperset: PropTypes.func.isRequired,
    setSupersetRest: PropTypes.func.isRequired,
    addSubstitute: PropTypes.func.isRequired,
    removeSubstitute: PropTypes.func.isRequired,
  }),
};

TrainingItem.defaultProps = {
  readOnly: false,
  mode: 'template',
  onEditTraining: null,
  onChangeWeekDay: null,
  onDeleteTraining: null,
  onOpenAddExercise: null,
  onOpenEditExercise: null,
  onOpenAddSubstitute: null,
  onOpenEditSubstitute: null,
  onDeleteExercise: null,
  onReorder: null,
  onRefetchTraining: null,
  localOps: null,
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
  behindModal,
  formLayout,
  onChangeFormLayout,
}) => {
  const inputRef = useRef(null);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const isWide = useMediaQuery('(min-width: 1024px)');

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

  const saveButtonLabel = (() => {
    if (saving) return 'Salvando…';
    return editProtocolId ? 'Concluir' : 'Salvar rotina';
  })();
  const statusTone = saveStatusLabel.startsWith('Rascunho salvo') ? 'success' : 'neutral';

  return (
    <div className={`builder-topbar${scrolled ? ' builder-topbar--scrolled' : ''}`} aria-hidden={behindModal || undefined}>
      <button
        type="button"
        className="icon-button builder-topbar-back"
        onClick={onBack}
        aria-label={isProtocol ? 'Voltar para o aluno' : 'Voltar para rotinas'}
        title={isProtocol ? 'Voltar para o aluno' : 'Voltar para rotinas'}
      >
        <ArrowLeft size={20} strokeWidth={2} aria-hidden="true" />
      </button>

      <div className="builder-title-wrap">
        <div className="builder-eyebrow type-caption">{eyebrow}</div>

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
                size={16}
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
          className="btn btn--ghost builder-topbar-import-mobile"
          onClick={onImportTemplate}
          aria-label="Importar"
        >
          <FileDown size={16} strokeWidth={2} aria-hidden="true" />
          Importar
        </button>
      )}

      {onOpenSummary && (
        <button
          type="button"
          className="icon-button routine-summary-trigger"
          onClick={onOpenSummary}
          aria-label="Ver resumo"
          title="Ver resumo"
        >
          <AlignLeft size={20} strokeWidth={2} aria-hidden="true" />
        </button>
      )}

      {/* Desktop: status + action buttons (hidden on mobile via CSS) */}
      <div className="builder-topbar-actions builder-topbar-actions--responsive">
        {!readOnly && isWide && <FormLayoutToggle value={formLayout} onChange={onChangeFormLayout} />}
        {onOpenSummary && isDesktop && (
          <button type="button" className="btn btn--secondary" onClick={onOpenSummary}>
            <AlignLeft size={16} strokeWidth={2} aria-hidden="true" />
            Resumo
          </button>
        )}
        {readOnly ? (
          <>
            <Badge variant="tag" tone="neutral">Visualizando rotina</Badge>
            <button type="button" className="btn btn--secondary" onClick={onBack}>
              <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
              Voltar
            </button>
            <button type="button" className="btn btn--primary" onClick={onEdit}>
              <Pencil size={16} strokeWidth={2} aria-hidden="true" />
              Editar
            </button>
          </>
        ) : (
          <>
            <Badge variant="tag" tone={statusTone}>{saveStatusLabel}</Badge>
            {isProtocol && onImportTemplate && (
              <button
                type="button"
                className="btn btn--secondary"
                onClick={onImportTemplate}
                aria-label="Importar de template"
                title="Importar de template"
              >
                <FileDown size={16} strokeWidth={2} aria-hidden="true" />
                <span className="builder-topbar-import-label">Importar de template</span>
              </button>
            )}
            <button type="button" className="btn btn--secondary" onClick={onCancel}>
              <X size={16} strokeWidth={2} aria-hidden="true" />
              Cancelar
            </button>
            <div className="builder-topbar-save-group">
              <button
                type="button"
                className="btn btn--primary"
                onClick={onSave}
                disabled={!canSave || saving}
                aria-disabled={!canSave}
                aria-describedby={saveHintText ? 'builder-save-hint-desktop' : undefined}
              >
                <Save size={16} strokeWidth={2} aria-hidden="true" />
                {saveButtonLabel}
              </button>
              {saveHintText && (
                <span id="builder-save-hint-desktop" className="builder-save-hint type-caption" role="note">
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
  behindModal: PropTypes.bool,
  formLayout: PropTypes.oneOf(['modal', 'side']),
  onChangeFormLayout: PropTypes.func,
};

BuilderTopbar.defaultProps = {
  behindModal: false,
  formLayout: 'modal',
  onChangeFormLayout: () => {},
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

const FirstTrainingHero = ({ onAddTraining }) => (
  <div className="section-card">
    <EmptyBlock
      icon={Dumbbell}
      title="Comece pelo treino"
      description="Crie Treino A, B, C… adicione exercícios e, quando quiser, atribua dias da semana a cada um. A distribuição acima mostra a semana em tempo real."
      actionLabel="Adicionar primeiro treino"
      onAction={onAddTraining}
    />
  </div>
);

FirstTrainingHero.propTypes = {
  onAddTraining: PropTypes.func.isRequired,
};

// ─── ImportTemplateSheet ──────────────────────────────────────────────────────

/**
 * Bottom sheet for selecting a protocol-template to import in protocol mode.
 */
const ImportTemplateSheet = ({ open, protocolTemplates, loading, onSelect, onClose }) => {
  if (!open) return null;

  return createPortal(
    <Modal title="Importar de template" onClose={onClose}>
      {loading && <p className="builder-template-sheet-empty type-body">Carregando templates…</p>}
      {!loading && protocolTemplates.length === 0 && (
        <p className="builder-template-sheet-empty type-body">Nenhum template disponível.</p>
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
              <span className="type-body-strong">{tmpl.name}</span>
              {tmpl.type && (
                <span className="type-caption builder-template-sheet-item-meta">
                  {getProtocolTypeLabel(tmpl.type)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </Modal>,
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

  const { user: authUser } = useAuth();
  const [formLayout, setFormLayout] = useFormLayoutPreference();
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

  const navigateAfterTemplateSave = useCallback(() => {
    const alreadyOnboarded = readOnboardingStatusCache(authUser?.id)?.onboarding?.firstProtocolCreated;
    if (isTemplateEdit || alreadyOnboarded) {
      navigate('/trainer/routines');
      return;
    }
    markOnboardingStepOptimistic('firstProtocolCreated');
    navigate('/', { state: { justCompleted: 'firstRoutine' } });
  }, [authUser, isTemplateEdit, navigate]);

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
        navigateAfterTemplateSave();
      } else {
        protocolDraft.clearDraft();
        showToast('Rotina salva.', 'success');
        navigate(`/trainer/protocols/${saved.id}`);
      }
    } catch (err) {
      showToast(err.userMessage || translateError(err), 'error');
    }
  }, [canSave, routine, titleName, trainings, draft, protocolDraft, showToast, navigate, navigateAfterTemplateSave, isProtocol, studentId, editProtocolId]);

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

  const weekDayCounts = useMemo(
    () => trainings.reduce((counts, training) => {
      const day = training.weekDay?.toLowerCase();
      return day ? { ...counts, [day]: (counts[day] ?? 0) + 1 } : counts;
    }, {}),
    [trainings]
  );

  const handleAssignWeekDay = useCallback((trainingId, weekDay) => {
    touchedRef.current = true;
    routine.updateTrainingWeekDay(trainingId, weekDay);
  }, [routine]);

  const handleExerciseCreated = useCallback((created) => {
    if (!created?.id) return;
    // why: first frame commits the new row, second runs after layout so getBoundingClientRect() is accurate
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        smoothScrollTo(document.querySelector(`[data-exercise-id="${created.id}"]`), 'center');
      });
    });
  }, []);

  const exerciseDrawer = useExerciseDrawer({
    routine,
    onMutate: markTouched,
    onExerciseCreated: handleExerciseCreated,
    localSubstitutes: isProtocol && !editProtocolId && !readOnly,
  });
  const { dialogProps: deleteDialogProps, requestConfirm: requestDeleteConfirm } = useConfirmDialog();

  const handleRequestDeleteDrawerExercise = () => {
    const { exercise } = exerciseDrawer.target;
    const name = exercise.name || exercise.exerciseTemplate?.name || 'exercício';
    requestDeleteConfirm({
      message: `Excluir "${name}"? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      onConfirm: exerciseDrawer.handleDelete,
    });
  };

  // ── Summary sheet ────────────────────────────────────────────────────────

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
          <span className="loading-text type-body">Carregando...</span>
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
        behindModal={addTrainingSheetOpen || !!exerciseDrawer.target}
        formLayout={formLayout}
        onChangeFormLayout={setFormLayout}
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

      <RoutineSummaryStrip trainings={trainings} onSelectTraining={handleScrollToTraining} />

      <div className="training-canvas">
        {/* Scroll-boundary sentinel — observed by IntersectionObserver */}
        <div ref={sentinelRef} className="training-canvas-sentinel" aria-hidden="true" />

        {/* Training list section */}
        <div className="canvas-section-header builder-canvas-trainings-header">
          <span className="canvas-section-title type-h4">
            Treinos da rotina{' '}
            <span className="canvas-section-title-count">{trainings.length}</span>
          </span>
          {!readOnly && trainings.length > 0 && (
            <button
              type="button"
              className="btn btn--secondary builder-add-action"
              onClick={() => setAddTrainingSheetOpen(true)}
            >
              <Plus size={16} strokeWidth={2} aria-hidden="true" />
              Adicionar treino
            </button>
          )}
        </div>

        {trainings.length === 0 && !readOnly && (
          <FirstTrainingHero onAddTraining={() => setAddTrainingSheetOpen(true)} />
        )}

        {trainings.length === 0 && readOnly && (
          <div className="section-card">
            <EmptyBlock
              icon={Dumbbell}
              title="Sem treinos"
              description="Esta rotina ainda não tem treinos cadastrados."
            />
          </div>
        )}

        {trainings.length > 0 && (() => {
          const sortedTrainings = sortTrainingsByWeekDay(trainings);
          const assignedTrainings = sortedTrainings.filter((t) => t.weekDay);
          const unassignedTrainings = sortedTrainings.filter((t) => !t.weekDay);
          const showUnassignedHeader = assignedTrainings.length > 0 && unassignedTrainings.length > 0;

          const localOps = isProtocol && !editProtocolId && !readOnly
            ? {
                createSuperset: (...args) => { markTouched(); return routine.createLocalSuperset(...args); },
                dissolveSuperset: (...args) => { markTouched(); return routine.dissolveLocalSuperset(...args); },
                setSupersetRest: (...args) => { markTouched(); return routine.setLocalSupersetRest(...args); },
                addSubstitute: (...args) => { markTouched(); return routine.addLocalSubstitute(...args); },
                removeSubstitute: (...args) => { markTouched(); return routine.removeLocalSubstitute(...args); },
              }
            : null;

          const renderTrainingItem = (t, i) => (
            <TrainingItem
              key={t.id}
              training={t}
              index={i}
              expanded={expandedId === t.id}
              readOnly={readOnly}
              mode={mode}
              localOps={localOps}
              onToggleExpand={() => handleToggleExpand(t.id)}
              onEditTraining={readOnly ? null : handleOpenEditTraining}
              onChangeWeekDay={readOnly ? null : (weekDay) => { markTouched(); routine.updateTrainingWeekDay(t.id, weekDay); }}
              onDeleteTraining={readOnly ? null : () => handleDeleteTraining(t.id)}
              onOpenAddExercise={readOnly ? null : exerciseDrawer.openAdd}
              onOpenEditExercise={readOnly ? null : exerciseDrawer.openEdit}
              onOpenAddSubstitute={readOnly ? null : exerciseDrawer.openAddSubstitute}
              onOpenEditSubstitute={readOnly ? null : exerciseDrawer.openEditSubstitute}
              onDeleteExercise={readOnly ? null : (exId) => { markTouched(); return routine.deleteExercise(t.id, exId); }}
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
                  <span className="training-group-title type-caption-strong">
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
          layout={formLayout}
          weekDayCounts={weekDayCounts}
          onAssignWeekDay={handleAssignWeekDay}
          eyebrow={
            editingTraining
              ? `${titleName || 'Rotina'} · Editar treino`
              : titleName
              ? `${titleName} · Novo treino`
              : 'Nova rotina · Novo treino'
          }
        />
      )}

      {!readOnly && exerciseDrawer.target && (
        <ExerciseDrawer
          key={exerciseDrawer.target.exercise?.id ?? `new-${exerciseDrawer.target.principal?.id ?? exerciseDrawer.target.trainingId}`}
          exercise={exerciseDrawer.target.exercise}
          principal={exerciseDrawer.target.principal}
          exerciseTemplates={routine.exerciseTemplates}
          saving={routine.saving || exerciseDrawer.submitting}
          layout={formLayout}
          onCreate={exerciseDrawer.handleCreate}
          onEdit={exerciseDrawer.handleEdit}
          onImport={exerciseDrawer.handleImport}
          onAddFromTemplate={exerciseDrawer.handleAddFromTemplate}
          onRequestDelete={exerciseDrawer.target.exercise && !exerciseDrawer.target.principal ? handleRequestDeleteDrawerExercise : null}
          onClose={exerciseDrawer.close}
        />
      )}

      {deleteDialogProps && <ConfirmDialog {...deleteDialogProps} />}

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
          type="button"
          className="btn btn--primary builder-edit-fab"
          onClick={handleEdit}
          aria-label="Editar rotina"
        >
          <Pencil size={16} strokeWidth={2} aria-hidden="true" />
          Editar
        </button>
      )}

      {/* Edit/create: save FAB — mobile only (desktop hidden via CSS) */}
      {!readOnly && (
        <>
          <button
            type="button"
            className="btn btn--primary builder-edit-fab"
            onClick={handleSave}
            disabled={!canSave || routine.saving}
            aria-disabled={!canSave}
            aria-describedby={saveHintText ? 'builder-save-hint-mobile' : undefined}
            aria-label={routine.saving ? 'Salvando' : editProtocolId ? 'Concluir edição' : 'Salvar rotina'}
          >
            <Save size={16} strokeWidth={2} aria-hidden="true" />
            {routine.saving ? 'Salvando…' : editProtocolId ? 'Concluir' : 'Salvar'}
          </button>
          {saveHintText && (
            <span
              id="builder-save-hint-mobile"
              className="builder-save-hint builder-save-hint--fab type-caption"
              role="note"
            >
              {saveHintText}
            </span>
          )}
        </>
      )}

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
