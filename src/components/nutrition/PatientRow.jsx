import PropTypes from 'prop-types';
import { Link, useNavigate } from 'react-router-dom';
import Avatar from '../ds/Avatar';
import RowMenu from '../RowMenu';
import PlanStatusBadges from './PlanStatusBadges';
import { formatFlexible, formatInteger, personName } from '../../utils/nutritionFormat';

// Text with "-" fallback for unknown values.
const orDash = (value, suffix) => (value == null ? '-' : `${formatFlexible(value)}${suffix}`);

// One linked patient: identity, plan status, 7-day adherence and the row menu.
const PatientRow = ({ patient, onUnlink }) => {
  const navigate = useNavigate();
  const name = personName(patient);
  const planPath = `/nutritionist/patients/${patient.id}/plan`;
  const { adherence7d } = patient;

  return (
    <tr>
      <td>
        <div className="patient-row__identity">
          <Avatar name={name} src={patient.avatarUrl ?? undefined} />
          <div className="patient-row__text">
            <Link to={planPath} className="patient-row__name type-h4">{name}</Link>
            <span className="patient-row__meta type-caption">
              <span>{orDash(patient.age, ' anos')}</span>
              <span>{orDash(patient.weightKg, ' kg')}</span>
            </span>
          </div>
        </div>
      </td>
      <td data-label="Plano"><PlanStatusBadges plan={patient.plan} /></td>
      <td className="patient-row__adherence" data-label="Adesão 7 dias">
        {adherence7d ? (
          <>
            <span className="patient-row__percent">{`${formatFlexible(adherence7d.percent)}%`}</span>
            <span className="patient-row__meta type-caption">{`${formatInteger(adherence7d.done)} de ${formatInteger(adherence7d.expected)} refeições`}</span>
          </>
        ) : '-'}
      </td>
      <td>
        <RowMenu
          ariaLabel={`Ações de ${name}`}
          extraItems={[{ label: 'Ver plano alimentar', onClick: () => navigate(planPath) }]}
          onDelete={() => onUnlink(patient)}
          deleteLabel="Desvincular"
        />
      </td>
    </tr>
  );
};

PatientRow.propTypes = {
  patient: PropTypes.object.isRequired,
  onUnlink: PropTypes.func.isRequired,
};

export default PatientRow;
