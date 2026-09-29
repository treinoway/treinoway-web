import PropTypes from 'prop-types';
import { Check } from 'lucide-react';

const getStepModifier = (index, currentIndex) => {
  if (index === currentIndex) return ' anamnesis-stepper-item--active';
  return index < currentIndex ? ' anamnesis-stepper-item--done' : '';
};

const StepItem = ({ step, index, currentIndex, onSelect }) => {
  const isDone = index < currentIndex;
  const isActive = index === currentIndex;
  const modifier = getStepModifier(index, currentIndex);
  const content = (
    <>
      <span className="anamnesis-stepper-dot" aria-hidden="true">
        {isDone ? <Check size={14} strokeWidth={2} /> : index + 1}
      </span>
      <span className="anamnesis-stepper-title">{step.title}</span>
    </>
  );

  return (
    <li className={`anamnesis-stepper-item${modifier}`} aria-current={isActive ? 'step' : undefined}>
      {isDone ? (
        <button type="button" className="anamnesis-stepper-button" onClick={() => onSelect(index)}>
          {content}
        </button>
      ) : (
        <span className="anamnesis-stepper-static">{content}</span>
      )}
    </li>
  );
};

const WizardStepper = ({ steps, currentIndex, onSelect }) => {
  const total = steps.length;
  const current = currentIndex + 1;

  return (
    <nav className="anamnesis-stepper" aria-label="Etapas da anamnese">
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
          <StepItem key={step.id} step={step} index={index} currentIndex={currentIndex} onSelect={onSelect} />
        ))}
      </ol>
    </nav>
  );
};

const stepShape = PropTypes.shape({ id: PropTypes.string.isRequired, title: PropTypes.string.isRequired });

StepItem.propTypes = {
  step: stepShape.isRequired,
  index: PropTypes.number.isRequired,
  currentIndex: PropTypes.number.isRequired,
  onSelect: PropTypes.func.isRequired,
};

WizardStepper.propTypes = {
  steps: PropTypes.arrayOf(stepShape).isRequired,
  currentIndex: PropTypes.number.isRequired,
  onSelect: PropTypes.func.isRequired,
};

export default WizardStepper;
