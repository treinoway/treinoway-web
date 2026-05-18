import { useEffect, useId, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Info } from 'lucide-react';

/**
 * Anchored informational popover triggered by a small Info icon button.
 *
 * Accessibility:
 *  - Trigger is a real <button> with aria-label and aria-haspopup="dialog".
 *  - Popover has role="dialog" and aria-modal="false" (informational, non-blocking).
 *  - Escape closes the popover and returns focus to the trigger.
 *  - Outside click closes the popover.
 *  - No focus trap — this is informational, not a modal.
 *
 * @param {object} props
 * @param {string} props.triggerAriaLabel — Required label for the icon button.
 * @param {string} props.title            — Popover heading shown to the user.
 * @param {React.ReactNode} props.children — Popover body content.
 * @param {string} [props.className]      — Optional class added to the wrapper.
 */
const InfoPopover = ({ triggerAriaLabel, title, children, className }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const dialogId = useId();

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [open]);

  const handleToggle = () => {
    setOpen((prev) => !prev);
  };

  const wrapperClass = ['info-popover-wrapper', className].filter(Boolean).join(' ');

  return (
    <span className={wrapperClass} ref={wrapperRef}>
      <button
        ref={triggerRef}
        type="button"
        className="info-popover-trigger"
        onClick={handleToggle}
        aria-label={triggerAriaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
      >
        <Info size={14} strokeWidth={2} aria-hidden="true" />
      </button>

      {open && (
        <div
          id={dialogId}
          className="info-popover"
          role="dialog"
          aria-modal="false"
          aria-label={title}
        >
          <p className="info-popover-title">{title}</p>
          <div className="info-popover-body">{children}</div>
        </div>
      )}
    </span>
  );
};

InfoPopover.propTypes = {
  triggerAriaLabel: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

export default InfoPopover;
