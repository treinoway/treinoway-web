import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import { t } from '../i18n';
import { formatExerciseMeta } from '../utils/exerciseMeta';

const interpolate = (template, values) =>
  template.replace(/\{(\w+)\}/g, (_, key) =>
    values[key] !== undefined ? String(values[key]) : `{${key}}`
  );

/**
 * Bottom sheet shown to the student when tapping "Trocar" on an exercise.
 * The substitutes list is rendered in the trainer-defined `substituteOrder`.
 * Each row is a single tap target — once tapped, the row becomes the
 * pending one and the sheet shows a spinner until the parent resolves
 * the swap promise. Tap outside or the close button dismisses the sheet
 * (only when no swap is in flight).
 */
const SwapExerciseSheet = ({
  open,
  principalName = '',
  substitutes = [],
  onSwap,
  onClose,
}) => {
  const [pendingId, setPendingId] = useState(null);
  const closeRef = useRef(null);

  // Focus the close button on mount so keyboard users land in the sheet.
  useEffect(() => {
    if (open && closeRef.current) closeRef.current.focus();
  }, [open]);

  // Reset pending state whenever the sheet opens fresh.
  useEffect(() => {
    if (open) setPendingId(null);
  }, [open]);

  // Escape key dismisses the sheet (when not in flight).
  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (e) => {
      if (e.key === 'Escape' && !pendingId) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, pendingId, onClose]);

  if (!open) return null;

  const handleSelect = async (substitute) => {
    if (pendingId) return;
    setPendingId(substitute.id);
    try {
      await onSwap(substitute);
    } finally {
      // Parent decides whether to close the sheet on success.
      // On error we keep the sheet open and clear pending so user can retry.
      setPendingId(null);
    }
  };

  const sortedSubstitutes = [...substitutes].sort(
    (a, b) => (a.substituteOrder ?? 0) - (b.substituteOrder ?? 0)
  );

  const titleTemplate = t('substitute.swapTitle') || 'Trocar {name} por:';
  const title = interpolate(titleTemplate, { name: principalName || '' });
  const closeLabel = t('substitute.swapClose') || 'Fechar';

  return (
    <div
      className="overlay"
      onClick={() => !pendingId && onClose()}
      role="presentation"
    >
      <div
        className="bottom-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="bottom-sheet-header">
          <h2 className="bottom-sheet-title">{title}</h2>
          <button
            ref={closeRef}
            type="button"
            className="bottom-sheet-close"
            onClick={onClose}
            disabled={!!pendingId}
            aria-label={closeLabel}
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>
        <div className="bottom-sheet-body">
          {sortedSubstitutes.length === 0 ? (
            <p className="text-sm text-muted">—</p>
          ) : (
            <div className="swap-substitute-list">
              {sortedSubstitutes.map((substitute) => {
                const isPending = pendingId === substitute.id;
                const meta = formatExerciseMeta(substitute);
                return (
                  <button
                    key={substitute.id}
                    type="button"
                    className="swap-substitute-row"
                    onClick={() => handleSelect(substitute)}
                    disabled={!!pendingId}
                    aria-label={`Trocar por ${substitute.name}`}
                  >
                    <span className="swap-substitute-row-body">
                      <span className="swap-substitute-row-name">
                        {substitute.name}
                      </span>
                      {meta && (
                        <span className="swap-substitute-row-meta">{meta}</span>
                      )}
                    </span>
                    {isPending && (
                      <span
                        className="swap-substitute-row-spinner"
                        aria-label={t('substitute.swapping') || 'Trocando…'}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

SwapExerciseSheet.propTypes = {
  open: PropTypes.bool.isRequired,
  principalName: PropTypes.string,
  substitutes: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      substituteOrder: PropTypes.number,
    })
  ),
  onSwap: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default SwapExerciseSheet;
