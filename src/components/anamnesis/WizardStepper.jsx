import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Check } from 'lucide-react';

const getStepModifier = (isDone, isActive) => {
  if (isActive) return ' anamnesis-stepper-item--active';
  return isDone ? ' anamnesis-stepper-item--done' : '';
};

const StepItem = ({ step, index, currentIndex, onSelect, allowJumpAhead }) => {
  const itemRef = useRef(null);
  const isActive = index === currentIndex;
  // When steps can be skipped, a passed step with required answers pending is not "done".
  const isDone = index < currentIndex && !(allowJumpAhead && step.pending > 0);
  const isSelectable = allowJumpAhead || isDone;

  // The jumpable list scrolls horizontally on mobile: keep the current step visible.
  useEffect(() => {
    if (allowJumpAhead && isActive) itemRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  }, [allowJumpAhead, isActive]);
  const modifier = getStepModifier(isDone, isActive);
  const content = (
    <>
      <span className="anamnesis-stepper-dot" aria-hidden="true">
        {isDone ? <Check size={14} strokeWidth={2} /> : index + 1}
      </span>
      <span className="anamnesis-stepper-title">{step.title}</span>
    </>
  );

  return (
    <li ref={itemRef} className={`anamnesis-stepper-item${modifier}`} aria-current={isActive ? 'step' : undefined}>
      {isSelectable ? (
        <button type="button" className="anamnesis-stepper-button" onClick={() => onSelect(index)}>
          {content}
        </button>
      ) : (
        <span className="anamnesis-stepper-static">{content}</span>
      )}
    </li>
  );
};

/**
 * `allowJumpAhead` makes every step (including the review) a button and keeps
 * the named list visible on mobile as a horizontal scroller. Without it only
 * completed steps are clickable and the list shows from tablet up.
 */
const WizardStepper = ({ steps, currentIndex, onSelect, allowJumpAhead = false }) => {
  const total = steps.length;
  const current = currentIndex + 1;

  return (
    <nav className={`anamnesis-stepper${allowJumpAhead ? ' anamnesis-stepper--jump' : ''}`} aria-label="Etapas da anamnese">
      <div
        className="anamnesis-stepper-bar"
        role="progressbar"
        aria-label="Progresso da anamnese"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-valuetext={`Etapa ${current} de ${total}: ${steps[currentIndex]?.title ?? ''}`}
      >
        <div className="anamnesis-stepper-fill" style={{ width: `${(current / total) * 100}%` }} />
      </div>
      <p className="anamnesis-stepper-count">Etapa {current} de {total}</p>
      <ol className="anamnesis-stepper-list">
        {steps.map((step, index) => (
          <StepItem
            key={step.id}
            step={step}
            index={index}
            currentIndex={currentIndex}
            onSelect={onSelect}
            allowJumpAhead={allowJumpAhead}
          />
        ))}
      </ol>
    </nav>
  );
};

const stepShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  pending: PropTypes.number,
});

StepItem.propTypes = {
  step: stepShape.isRequired,
  index: PropTypes.number.isRequired,
  currentIndex: PropTypes.number.isRequired,
  onSelect: PropTypes.func.isRequired,
  allowJumpAhead: PropTypes.bool.isRequired,
};

WizardStepper.propTypes = {
  steps: PropTypes.arrayOf(stepShape).isRequired,
  currentIndex: PropTypes.number.isRequired,
  onSelect: PropTypes.func.isRequired,
  allowJumpAhead: PropTypes.bool,
};

export default WizardStepper;
