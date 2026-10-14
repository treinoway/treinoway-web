import PropTypes from 'prop-types';
import Avatar from './ds/Avatar';
import SkeletonText from './ds/SkeletonText';
import { getStudentDisplayName } from '../utils/studentRow';
import { td } from '../utils/studentCockpit';

/** Name slot: the known name, or a heading-sized placeholder that still reads as "Carregando…". */
const HeroName = ({ name }) => (
  <h1 className="student-hero__name type-h1">
    {name || (
      <>
        <SkeletonText typeClass="type-h1" />
        <span className="visually-hidden">{td('loading.student')}</span>
      </>
    )}
  </h1>
);

HeroName.propTypes = { name: PropTypes.string };

const buildContextLine = (routineName, planName) =>
  [routineName || td('hero.noRoutine'), planName].filter(Boolean).join(' · ');

/**
 * Student detail header: identity (avatar, name, email), the active routine and
 * plan, and the trainer responsible for the student (the logged-in trainer).
 *
 * While `loading`, any identity already known (router state) shows; the rest keeps
 * its slot with a same-height placeholder. The context line always renders (with a
 * "no routine" fallback) so the header never changes height after load.
 */
const StudentCockpitHero = ({ student, routineName, planName, trainerName, loading = false }) => {
  const knownName = student ? getStudentDisplayName(student) : '';
  const studentName = knownName || (loading ? '' : '—');
  const showEmail = Boolean(student?.email) && student.email !== studentName;
  const showEmailPlaceholder = loading && !student;

  return (
    <header className="student-hero" aria-busy={loading}>
      {studentName
        ? <Avatar name={studentName} src={student?.avatarUrl ?? undefined} size="lg" />
        : <span className="avatar avatar--lg avatar--skeleton" aria-hidden="true" />}
      <div className="student-hero__identity">
        <HeroName name={studentName} />
        {showEmail && <span className="student-hero__meta type-body">{student.email}</span>}
        {showEmailPlaceholder && <SkeletonText typeClass="type-body" width="long" />}
        {loading
          ? <SkeletonText typeClass="type-caption" />
          : <span className="student-hero__meta type-caption">{buildContextLine(routineName, planName)}</span>}
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
  loading: PropTypes.bool,
};

export default StudentCockpitHero;
