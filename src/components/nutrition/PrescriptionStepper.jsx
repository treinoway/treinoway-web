import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { PRESCRIPTION_STEPS } from '../../constants/prescriptionSteps';

// Numbered pill of one step: the current one is plain, the others navigate.
const StepPill = ({ step, index, isCurrent, basePath, onLinkClick }) => {
  const content = (
    <>
      <span className="prescription-stepper__dot" aria-hidden="true">{index + 1}</span>
      <span className="prescription-stepper__title">{step.title}</span>
    </>
  );
  return (
    <li className="prescription-stepper__item">
      {isCurrent ? (
        <span className="prescription-stepper__pill prescription-stepper__pill--current" aria-current="step">{content}</span>
      ) : (
        <Link to={`${basePath}/${step.id}`} className="prescription-stepper__pill" onClick={onLinkClick?.(`${basePath}/${step.id}`)}>{content}</Link>
      )}
    </li>
  );
};

StepPill.propTypes = {
  step: PropTypes.shape({ id: PropTypes.string, title: PropTypes.string }).isRequired,
  index: PropTypes.number.isRequired,
  isCurrent: PropTypes.bool.isRequired,
  basePath: PropTypes.string.isRequired,
  onLinkClick: PropTypes.func,
};

// Pill stepper 1-2-3 of the prescription (Metas, Cardápio, Orientações).
const PrescriptionStepper = ({ patientId, currentStep, onLinkClick }) => {
  const basePath = `/nutritionist/patients/${patientId}/plan`;
  return (
    <nav className="wizard-stepper wizard-stepper--prescription" aria-label="Etapas da prescrição">
      <ol className="prescription-stepper__list">
        {PRESCRIPTION_STEPS.map((step, index) => (
          <StepPill key={step.id} step={step} index={index} isCurrent={step.id === currentStep} basePath={basePath} onLinkClick={onLinkClick} />
        ))}
      </ol>
    </nav>
  );
};

PrescriptionStepper.propTypes = {
  patientId: PropTypes.string.isRequired,
  currentStep: PropTypes.oneOf(PRESCRIPTION_STEPS.map((step) => step.id)).isRequired,
  onLinkClick: PropTypes.func,
};

export default PrescriptionStepper;
