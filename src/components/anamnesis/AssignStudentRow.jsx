import PropTypes from 'prop-types';
import Avatar from '../ds/Avatar';
import Badge from '../ds/Badge';
import { getStudentDisplayName } from '../../utils/studentRow';

/** One selectable student: checkbox + avatar + name/email (same look as the student row). */
const AssignStudentRow = ({ student, checked, linked, onToggle }) => {
  const name = getStudentDisplayName(student);
  return (
    <label className={`assign-student${linked ? ' assign-student--disabled' : ''}`}>
      <input
        type="checkbox"
        className="assign-student__checkbox"
        checked={checked}
        disabled={linked}
        onChange={() => onToggle(student.id)}
      />
      <Avatar name={name} />
      <span className="assign-student__identity">
        <span className="assign-student__name type-h4">{name}</span>
        {student.email && <span className="assign-student__email type-caption">{student.email}</span>}
      </span>
      {linked && <Badge tone="warning" variant="tag">Já enviada</Badge>}
    </label>
  );
};

AssignStudentRow.propTypes = {
  student: PropTypes.shape({
    id: PropTypes.string.isRequired,
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    email: PropTypes.string,
  }).isRequired,
  checked: PropTypes.bool,
  linked: PropTypes.bool,
  onToggle: PropTypes.func.isRequired,
};

export default AssignStudentRow;
