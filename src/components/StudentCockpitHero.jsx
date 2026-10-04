import PropTypes from 'prop-types';
import Avatar from './ds/Avatar';
import { getStudentDisplayName } from '../utils/studentRow';
import { td } from '../utils/studentCockpit';

/**
 * Student detail header: identity (avatar, name, email), the active routine and
 * plan, and the trainer responsible for the student (the logged-in trainer).
 */
const StudentCockpitHero = ({ student, routineName, planName, trainerName }) => {
  const studentName = student ? getStudentDisplayName(student) || '—' : '—';
  const contextLine = [routineName, planName].filter(Boolean).join(' · ');
  const showEmail = Boolean(student?.email) && student.email !== studentName;

  return (
    <header className="student-hero">
      <Avatar name={studentName} src={student?.avatarUrl ?? undefined} size="lg" />
      <div className="student-hero__identity">
        <h1 className="student-hero__name type-h1">{studentName}</h1>
        {showEmail && <span className="student-hero__meta type-body">{student.email}</span>}
        {contextLine && <span className="student-hero__meta type-caption">{contextLine}</span>}
      </div>
      {trainerName && (
        <div className="student-hero__trainer kpi">
          <span className="kpi-label type-overline">{td('trainerInCharge')}</span>
          <span className="type-body-strong">{trainerName}</span>
        </div>
      )}
    </header>
  );
};

StudentCockpitHero.propTypes = {
  student: PropTypes.shape({
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    email: PropTypes.string,
    avatarUrl: PropTypes.string,
  }),
  routineName: PropTypes.string,
  planName: PropTypes.string,
  trainerName: PropTypes.string,
};

export default StudentCockpitHero;
