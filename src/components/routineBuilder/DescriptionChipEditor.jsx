import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { Plus } from 'lucide-react';
import useDismissablePopover from '../../hooks/useDismissablePopover';
import useAnchoredPopoverPosition, { placeBelowStartClamped } from '../../hooks/useAnchoredPopoverPosition';

const CHIP_VALUE_MAX_LENGTH = 20;

const supportsFieldSizing = () =>
  typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('field-sizing', 'content');

const truncate = (text) =>
  text.length > CHIP_VALUE_MAX_LENGTH ? `${text.slice(0, CHIP_VALUE_MAX_LENGTH)}…` : text;

/**
 * Chip that opens a compact floating popover with an auto-growing textarea.
 * The popover is portaled and fixed-positioned (like sibling chips), so it
 * never affects layout; its left edge is clamped to stay inside the viewport.
 */
const DescriptionChipEditor = ({ value, onSave }) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const textareaRef = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const handleDismiss = useCallback((reason) => {
    setOpen(false);
    if (reason === 'escape') triggerRef.current?.focus();
  }, []);

  useDismissablePopover({ open, refs: [triggerRef, popoverRef], onDismiss: handleDismiss });

  useAnchoredPopoverPosition({ open, triggerRef, popoverRef, place: placeBelowStartClamped });

  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  // Fallback for browsers without `field-sizing: content`: the height must be
  // measured from scrollHeight, which CSS alone cannot express.
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!open || !textarea || supportsFieldSizing()) return;
    textarea.style.setProperty('--textarea-autogrow-height', 'auto');
    textarea.style.setProperty('--textarea-autogrow-height', `${textarea.scrollHeight}px`);
  }, [open, draft]);

  const handleToggle = () => {
    if (open) {
      close();
      return;
    }
    setDraft(value || '');
    setOpen(true);
  };

  const handleSave = () => {
    onSave(draft);
    close();
  };

  const handleTextareaKeyDown = (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleSave();
    }
  };

  const isFilled = !!value;

  const popover = open
    ? createPortal(
        <div
          ref={popoverRef}
          className="identity-chip-popover identity-description-popover"
          role="dialog"
          aria-label="Descrição da rotina"
        >
          <label htmlFor="routine-description-input" className="identity-description-label type-caption-strong">
            Descrição da rotina
          </label>
          <textarea
            id="routine-description-input"
            ref={textareaRef}
            className="input identity-description-textarea"
            value={draft}
            rows={2}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            placeholder="Descreva o objetivo e perfil da rotina…"
          />
          <div className="identity-description-actions">
            <button type="button" className="btn btn--secondary" onClick={close}>
              Cancelar
            </button>
            <button type="button" className="btn btn--primary" onClick={handleSave}>
              Salvar
            </button>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className="weekday-chip-wrap identity-description-wrap">
      <button
        ref={triggerRef}
        type="button"
        className={`identity-chip identity-chip--desktop-only${isFilled ? '' : ' identity-chip--empty'}`}
        onClick={handleToggle}
        aria-label="Definir Descrição"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {isFilled ? (
          <>
            <span className="identity-chip-label">Desc.:</span>
            <span className="identity-chip-value">{truncate(value)}</span>
          </>
        ) : (
          <>
            <Plus size={12} strokeWidth={2} aria-hidden="true" />
            Descrição
          </>
        )}
      </button>
      {popover}
    </div>
  );
};

DescriptionChipEditor.propTypes = {
  value: PropTypes.string,
  onSave: PropTypes.func.isRequired,
};

DescriptionChipEditor.defaultProps = {
  value: null,
};

export default DescriptionChipEditor;
