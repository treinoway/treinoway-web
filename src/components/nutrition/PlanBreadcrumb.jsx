import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

const SEPARATOR = (
  <span className="wizard-breadcrumb-sep" aria-hidden="true">›</span>
);

// Breadcrumb: Meus Pacientes › paciente › Plano alimentar [› Prescrição]; links appear when patientId is known.
const PlanBreadcrumb = ({ patientName, patientId, inPrescription = false }) => {
  const planPath = patientId ? `/nutritionist/patients/${patientId}/plan` : null;
  const planCrumb = inPrescription && planPath
    ? <Link to={planPath} className="wizard-breadcrumb-ancestor">Plano alimentar</Link>
    : <span className="wizard-breadcrumb-current" aria-current="page">Plano alimentar</span>;

  return (
    <nav className="wizard-breadcrumb wizard-breadcrumb--page" aria-label="Você está em">
      <Link to="/nutritionist/patients" className="wizard-breadcrumb-ancestor">Meus Pacientes</Link>
      {SEPARATOR}
      {planPath
        ? <Link to={planPath} className="wizard-breadcrumb-ancestor">{patientName}</Link>
        : <span className="wizard-breadcrumb-ancestor">{patientName}</span>}
      {SEPARATOR}
      {planCrumb}
      {inPrescription && (
        <>
          {SEPARATOR}
          <span className="wizard-breadcrumb-current" aria-current="page">Prescrição</span>
        </>
      )}
    </nav>
  );
};

PlanBreadcrumb.propTypes = {
  patientName: PropTypes.string.isRequired,
  patientId: PropTypes.string,
  inPrescription: PropTypes.bool,
};

export default PlanBreadcrumb;
