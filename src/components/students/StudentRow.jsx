import PropTypes from 'prop-types';
import { t } from '../../i18n';
import Avatar from '../ds/Avatar';
import Badge from '../ds/Badge';
import RowMenu from '../RowMenu';
import {
  formatAdherence,
  formatLastWorkout,
  getAdherenceTone,
  getLastWorkoutTone,
  getStudentDisplayName,
  resolveAdherence,
} from '../../utils/studentRow';
import { StudentStatus, getStudentStatus } from '../../utils/studentStatus';

export const PLATFORM_BLOCKER = 'blocked_on_plan';

const STATUS_BADGE = {
  [StudentStatus.ACTIVE]: { tone: 'success', label: 'Ativo' },
  [StudentStatus.PENDING]: { tone: 'warning', label: 'Pendente' },
  [StudentStatus.OVERDUE]: { tone: 'error', label: 'Vencido' },
};

const hasBlockers = (student) => Array.isArray(student.blockers) && student.blockers.length > 0;

const getRowAriaLabel = (student, fullName) => {
  if (!hasBlockers(student)) {
    return (t('students.viewProfileAria') || 'Ver perfil de {name}.').replace('{name}', fullName);
  }
  const labels = Array.isArray(student.blockersLabel) ? student.blockersLabel.filter(Boolean) : [];
  return (t('students.rowBlockersAria') || '{name} — {blockers}. Ver perfil.')
    .replace('{name}', fullName)
    .replace('{blockers}', labels.join(', '));
};

/* Backend-supplied `blockersLabel[i]` (pre-translated pt-BR) rendered as Tag badges, ordered by
   `blockers[i]`. Student issues are Warning; the trainer's own seat-quota gate is Neutral. */
const BlockerTags = ({ blockers, blockersLabel }) => (
  <div className="student-row__tags">
    {blockers.map((code, index) => (
      <Badge
        key={`${code}-${index}`}
        variant="tag"
        tone={code === PLATFORM_BLOCKER ? 'neutral' : 'warning'}
      >
        {blockersLabel?.[index] || ''}
      </Badge>
    ))}
  </div>
);

BlockerTags.propTypes = {
  blockers: PropTypes.arrayOf(PropTypes.string).isRequired,
  blockersLabel: PropTypes.arrayOf(PropTypes.string),
};

const toneClass = (tone) => (tone ? ` kpi-value--${tone}` : '');

const AdherenceKpi = ({ student }) => {
  const adherence = resolveAdherence(student);
  const value = formatAdherence(adherence);
  const hasCounts =
    student.adherenceCompleted != null && student.adherenceExpected != null && adherence != null;
  const valueClass = value ? toneClass(getAdherenceTone(adherence)) : ' kpi-value--muted';
  return (
    <div className="kpi">
      <span className="kpi-line">
        <span className={`kpi-value type-h4${valueClass}`}>{value ?? '–'}</span>
        {hasCounts && (
          <span className="kpi-support type-caption">
            {student.adherenceCompleted}/{student.adherenceExpected} treinos
          </span>
        )}
      </span>
      <span className="kpi-label type-overline">Aderência</span>
    </div>
  );
};

AdherenceKpi.propTypes = { student: PropTypes.object.isRequired };

const LastWorkoutKpi = ({ lastWorkoutAt }) => (
  <div className="kpi">
    <span className={`kpi-value type-body-strong${toneClass(getLastWorkoutTone(lastWorkoutAt))}`}>
      {formatLastWorkout(lastWorkoutAt) ?? 'Nunca'}
    </span>
    <span className="kpi-label type-overline">Último treino</span>
  </div>
);

LastWorkoutKpi.propTypes = { lastWorkoutAt: PropTypes.string };

const StudentRow = ({ student, onOpen, onUnlink }) => {
  const fullName = getStudentDisplayName(student);
  const status = STATUS_BADGE[getStudentStatus(student)];

  return (
    <div className="student-row">
      <Avatar name={fullName} />
      <div className="student-row__identity">
        <button
          type="button"
          className="student-row__link type-h4"
          aria-label={getRowAriaLabel(student, fullName)}
          onClick={() => onOpen(student)}
        >
          {fullName}
        </button>
        <div className="student-row__meta">
          <Badge tone={status.tone}>{status.label}</Badge>
          {student.email && <span className="student-row__email type-caption">{student.email}</span>}
        </div>
        {hasBlockers(student) && (
          <BlockerTags blockers={student.blockers} blockersLabel={student.blockersLabel} />
        )}
      </div>
      <div className="student-row__kpis">
        <AdherenceKpi student={student} />
        <LastWorkoutKpi lastWorkoutAt={student.lastWorkoutAt} />
      </div>
      <div className="student-row__action">
        <RowMenu
          ariaLabel={`Ações de ${fullName}`}
          onDelete={() => onUnlink(student)}
          deleteLabel="Desvincular"
        />
      </div>
    </div>
  );
};

StudentRow.propTypes = {
  student: PropTypes.shape({
    id: PropTypes.string,
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    email: PropTypes.string,
    billingStatus: PropTypes.oneOf(['overdue', 'due_soon', 'ok', 'none']),
    adherence: PropTypes.number,
    adherenceCompleted: PropTypes.number,
    adherenceExpected: PropTypes.number,
    lastWorkoutAt: PropTypes.string,
    blockers: PropTypes.arrayOf(PropTypes.string),
    blockersLabel: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  onOpen: PropTypes.func.isRequired,
  onUnlink: PropTypes.func.isRequired,
};

export default StudentRow;
