import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import RoutineSummarySheetItem from './RoutineSummarySheetItem';

const TRAINING_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const RoutineSummarySheet = ({
  open,
  trainings,
  saveStatusLabel,
  onClose,
  onScrollToTraining,
  onScrollToExercise,
}) => {
  const sheetRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);
  const titleId = 'routine-summary-sheet-title';

  // Focus trap and body scroll lock
  useEffect(() => {
    if (!open) return;

    previousFocusRef.current = document.activeElement;
    document.body.style.overflow = 'hidden';

    // Focus the close button on open
    const frame = requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = '';
      previousFocusRef.current?.focus();
    };
  }, [open]);

  // Escape key handler
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Swipe-down dismissal (mobile drag handle)
  const touchStartY = useRef(null);

  const handleTouchStart = useCallback((e) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e) => {
      if (touchStartY.current === null) return;
      const delta = e.changedTouches[0].clientY - touchStartY.current;
      touchStartY.current = null;
      if (delta > 80) onClose();
    },
    [onClose]
  );

  const exerciseCount = trainings.reduce(
    (sum, t) => sum + (t.exercises?.length || 0),
    0
  );

  const eyebrowText = `Resumo · ${trainings.length} ${trainings.length === 1 ? 'treino' : 'treinos'} · ${exerciseCount} ${exerciseCount === 1 ? 'exercício' : 'exercícios'}`;

  if (!open) return null;

  return createPortal(
    <div
      className="routine-summary-overlay"
      onClick={onClose}
      aria-hidden="false"
    >
      <div
        ref={sheetRef}
        className="routine-summary-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div
          className="routine-summary-sheet-handle"
          aria-hidden="true"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        />

        <div className="routine-summary-sheet-header">
          <div className="routine-summary-sheet-header-main">
            <div className="routine-summary-sheet-eyebrow">{eyebrowText}</div>
            <h2 className="routine-summary-sheet-title" id={titleId}>
              Exercícios da rotina
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="routine-summary-sheet-close"
            onClick={onClose}
            aria-label="Fechar resumo"
          >
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <div className="routine-summary-sheet-body">
          {trainings.length === 0 ? (
            <div className="routine-summary-peek-empty routine-summary-peek-empty--global">
              Nenhum treino adicionado à rotina.
            </div>
          ) : (
            trainings.map((training, i) => {
              const globalIndex = i;
              return (
                <RoutineSummarySheetItem
                  key={training.id}
                  training={training}
                  index={globalIndex}
                  onJumpToTraining={(id) => {
                    onClose();
                    onScrollToTraining(id);
                  }}
                  onJumpToExercise={(trainingId, exId) => {
                    onClose();
                    onScrollToExercise(trainingId, exId);
                  }}
                />
              );
            })
          )}
        </div>

        <div className="routine-summary-sheet-footer">
          <span className="routine-summary-sheet-footer-status">
            <span className="builder-footer-status-dot" aria-hidden="true" />
            {saveStatusLabel}
          </span>
          <span className="routine-summary-sheet-footer-hint">
            Toque num exercício para ir até ele
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
};

RoutineSummarySheet.propTypes = {
  open: PropTypes.bool.isRequired,
  trainings: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      weekDay: PropTypes.string,
      exercises: PropTypes.array,
    })
  ).isRequired,
  saveStatusLabel: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onScrollToTraining: PropTypes.func.isRequired,
  onScrollToExercise: PropTypes.func.isRequired,
};

export default RoutineSummarySheet;
