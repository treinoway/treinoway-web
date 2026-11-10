import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import Badge from '../ds/Badge';
import PlanBreadcrumb from './PlanBreadcrumb';
import PrescriptionFooter from './PrescriptionFooter';
import PrescriptionStepper from './PrescriptionStepper';
import SegmentedChoice from './SegmentedChoice';
import { formatFlexible, personName } from '../../utils/nutritionFormat';

const VIEWS = [
  { id: 'simple', label: 'Prescrição simples' },
  { id: 'detailed', label: 'Prescrição detalhada' },
];

// Whether a click is a plain left click (modified clicks keep the browser behaviour).
const isPlainClick = (event) => event.button === 0 && !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey);

// Eyebrow "Prescrição · NOME · 66 kg" (uppercase by CSS), skipping what is unknown.
const eyebrowText = (patient) => {
  const weight = patient.weightKg == null ? null : `${formatFlexible(patient.weightKg)} kg`;
  return ['Prescrição', personName(patient), weight].filter(Boolean).join(' · ');
};

// Shell shared by the three prescription steps: breadcrumb, header, stepper, sticky save/navigation bar.
const PrescriptionLayout = ({
  step, patient, plan, title, subtitle, saveStatusText, saveStatus, onRetrySave, onBeforeNavigate, footerExtra, children,
}) => {
  const navigate = useNavigate();
  const basePath = `/nutritionist/patients/${patient.id}/plan`;

  // why: leaving the step must wait for the pending autosave, and stay on the page when it fails.
  const guardedNavigate = async (to) => {
    const proceed = onBeforeNavigate ? await onBeforeNavigate() : true;
    if (proceed !== false) navigate(to);
  };
  const guardedLinkClick = (to) => async (event) => {
    if (event.defaultPrevented || !isPlainClick(event)) return;
    event.preventDefault();
    await guardedNavigate(to);
  };

  return (
    <div className="prescription">
      <PlanBreadcrumb patientName={personName(patient)} patientId={patient.id} inPrescription />
      <header className="prescription__header">
        <div className="prescription__heading">
          <p className="prescription__eyebrow">{eyebrowText(patient)}</p>
          <h1 className="prescription__title">{title}</h1>
          {subtitle && <p className="prescription__subtitle">{subtitle}</p>}
          {plan?.hasUnpublishedChanges && <Badge tone="warning" variant="tag">Alterações não publicadas</Badge>}
        </div>
        <div className="prescription__view">
          <SegmentedChoice
            ariaLabel="Visualização do plano"
            items={VIEWS}
            value="detailed"
            onChange={(view) => view === 'simple' && guardedNavigate(basePath)}
          />
        </div>
      </header>
      <PrescriptionStepper patientId={patient.id} currentStep={step} onLinkClick={guardedLinkClick} />
      {children}
      <PrescriptionFooter
        step={step}
        basePath={basePath}
        saveStatusText={saveStatusText}
        saveFailed={saveStatus === 'error'}
        onRetrySave={onRetrySave}
        onLinkClick={guardedLinkClick}
        extra={footerExtra}
      />
    </div>
  );
};

PrescriptionLayout.propTypes = {
  step: PropTypes.oneOf(['goals', 'menu', 'guidance']).isRequired,
  patient: PropTypes.shape({
    id: PropTypes.string.isRequired,
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    email: PropTypes.string,
    weightKg: PropTypes.number,
  }).isRequired,
  plan: PropTypes.shape({ hasUnpublishedChanges: PropTypes.bool }),
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  saveStatusText: PropTypes.string,
  saveStatus: PropTypes.string,
  onRetrySave: PropTypes.func,
  onBeforeNavigate: PropTypes.func,
  footerExtra: PropTypes.node,
  children: PropTypes.node,
};

export default PrescriptionLayout;
