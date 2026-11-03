import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { t } from '../../i18n';
import { formatDateTimeForDisplay, formatDateForDisplay } from '../../utils/dateFormat';
import Badge from '../../components/ds/Badge';
import Segmented from '../../components/ds/Segmented';
import {
  listUserStudents,
  listUserTrainers,
  listUserProtocols,
  listUserTemplates,
  listUserSessions,
} from '../api';
import { getDisplayName, getNameOrDash, formatDuration, formatValue } from '../format';
import PagedTable from './PagedTable';

const DESKTOP_ONLY = 'table-col-desktop-only';

// Name cell with a keyboard-reachable link-styled button and the email under it on mobile.
const PersonCell = ({ person }) => (
  <td>
    <button type="button" className="manager-row-link type-body-strong">
      {getDisplayName(person)}
    </button>
    <span className="table-col-mobile-only admin-table__sub type-caption">{person.email ?? '—'}</span>
  </td>
);

PersonCell.propTypes = { person: PropTypes.object.isRequired };

// Alunos tab: students linked to a trainer.
export const StudentsTab = ({ userId }) => {
  const navigate = useNavigate();
  const fetchPage = useCallback((params) => listUserStudents(userId, params), [userId]);
  const columns = [
    { key: 'name', label: t('manager.colUser') },
    { key: 'email', label: t('manager.colEmail'), className: DESKTOP_ONLY },
    { key: 'plan', label: t('manager.colPlanStatus') },
    { key: 'lastWorkout', label: t('manager.colLastWorkout'), className: DESKTOP_ONLY },
    { key: 'linked', label: t('manager.colLinkedAt'), className: DESKTOP_ONLY },
  ];
  const renderRow = (student) => (
    <tr key={student.studentId} className="manager-row--link" onClick={() => navigate(`/manager/users/${student.studentId}`)}>
      <PersonCell person={student} />
      <td className={DESKTOP_ONLY}>{student.email ?? '—'}</td>
      <td>
        <Badge tone={student.activeOnPlan ? 'success' : 'neutral'}>
          {t(student.activeOnPlan ? 'manager.activeOnPlan' : 'manager.inactiveOnPlan')}
        </Badge>
      </td>
      <td className={`${DESKTOP_ONLY} admin-table__number`}>{formatDateTimeForDisplay(student.lastWorkoutAt)}</td>
      <td className={`${DESKTOP_ONLY} admin-table__number`}>{formatDateTimeForDisplay(student.linkedAt)}</td>
    </tr>
  );
  return (
    <PagedTable
      fetchPage={fetchPage}
      columns={columns}
      renderRow={renderRow}
      emptyTitle={t('manager.studentsEmpty')}
      loadingLabel={t('manager.loadingTab')}
    />
  );
};

StudentsTab.propTypes = { userId: PropTypes.string.isRequired };

// Treinadores tab: trainers linked to a student.
export const TrainersTab = ({ userId }) => {
  const navigate = useNavigate();
  const fetchPage = useCallback((params) => listUserTrainers(userId, params), [userId]);
  const columns = [
    { key: 'name', label: t('manager.colUser') },
    { key: 'email', label: t('manager.colEmail'), className: DESKTOP_ONLY },
    { key: 'linked', label: t('manager.colLinkedAt') },
  ];
  const renderRow = (trainer) => (
    <tr key={trainer.trainerId} className="manager-row--link" onClick={() => navigate(`/manager/users/${trainer.userId}`)}>
      <PersonCell person={trainer} />
      <td className={DESKTOP_ONLY}>{trainer.email ?? '—'}</td>
      <td className="admin-table__number">{formatDateTimeForDisplay(trainer.linkedAt)}</td>
    </tr>
  );
  return (
    <PagedTable
      fetchPage={fetchPage}
      columns={columns}
      renderRow={renderRow}
      emptyTitle={t('manager.trainersEmpty')}
      loadingLabel={t('manager.loadingTab')}
    />
  );
};

TrainersTab.propTypes = { userId: PropTypes.string.isRequired };

// Rotinas tab: protocols created by (`as: trainer`) or assigned to (`as: student`) the user.
export const ProtocolsTab = ({ userId, as }) => {
  const navigate = useNavigate();
  const fetchPage = useCallback((params) => listUserProtocols(userId, { as, ...params }), [userId, as]);
  const columns = [
    { key: 'name', label: t('manager.colRoutine') },
    { key: 'person', label: t(as === 'trainer' ? 'manager.colAssignee' : 'manager.colTrainer'), className: DESKTOP_ONLY },
    { key: 'trainings', label: t('manager.colTrainings') },
    { key: 'start', label: t('manager.colStart'), className: DESKTOP_ONLY },
    { key: 'end', label: t('manager.colEnd'), className: DESKTOP_ONLY },
  ];
  const renderRow = (protocol) => (
    <tr key={protocol.id} className="manager-row--link" onClick={() => navigate(`/manager/protocols/${protocol.id}`)}>
      <td>
        <button type="button" className="manager-row-link type-body-strong">
          {protocol.name}
        </button>
        {protocol.deletedAt && <Badge tone="error">{t('manager.deleted')}</Badge>}
      </td>
      <td className={DESKTOP_ONLY}>{getNameOrDash(as === 'trainer' ? protocol.assigneeName : protocol.trainerName)}</td>
      <td className="admin-table__number">{protocol.trainingsCount}</td>
      <td className={`${DESKTOP_ONLY} admin-table__number`}>{formatDateForDisplay(protocol.startDate)}</td>
      <td className={`${DESKTOP_ONLY} admin-table__number`}>{protocol.endDate ? formatDateForDisplay(protocol.endDate) : '—'}</td>
    </tr>
  );
  return (
    <PagedTable
      fetchPage={fetchPage}
      columns={columns}
      renderRow={renderRow}
      emptyTitle={t('manager.protocolsEmpty')}
      loadingLabel={t('manager.loadingTab')}
    />
  );
};

ProtocolsTab.propTypes = {
  userId: PropTypes.string.isRequired,
  as: PropTypes.oneOf(['trainer', 'student']).isRequired,
};

// Templates tab: training or exercise templates, switchable by type.
export const TemplatesTab = ({ userId }) => {
  const [type, setType] = useState('training');
  const typeItems = useMemo(
    () => [
      { id: 'training', label: t('manager.templateType.training') },
      { id: 'exercise', label: t('manager.templateType.exercise') },
    ],
    []
  );
  const fetchPage = useCallback((params) => listUserTemplates(userId, { type, ...params }), [userId, type]);
  const columns = [
    { key: 'name', label: t('manager.colName') },
    { key: 'created', label: t('manager.colCreated') },
  ];
  const renderRow = (template) => (
    <tr key={template.id}>
      <td>
        <span className="type-body-strong">{template.name}</span>
        {template.deletedAt && <Badge tone="error">{t('manager.deleted')}</Badge>}
      </td>
      <td className="admin-table__number">{formatDateTimeForDisplay(template.createdAt)}</td>
    </tr>
  );
  return (
    <>
      <Segmented ariaLabel={t('manager.templateTypeLabel')} items={typeItems} value={type} onChange={setType} />
      <PagedTable
        key={type}
        fetchPage={fetchPage}
        columns={columns}
        renderRow={renderRow}
        emptyTitle={t('manager.templatesEmpty')}
        loadingLabel={t('manager.loadingTab')}
      />
    </>
  );
};

TemplatesTab.propTypes = { userId: PropTypes.string.isRequired };

// Sessões tab: workout sessions, newest first.
export const SessionsTab = ({ userId }) => {
  const fetchPage = useCallback((params) => listUserSessions(userId, params), [userId]);
  const columns = [
    { key: 'training', label: t('manager.colTraining') },
    { key: 'started', label: t('manager.colStartedAt') },
    { key: 'finished', label: t('manager.colFinishedAt'), className: DESKTOP_ONLY },
    { key: 'duration', label: t('manager.colDuration'), className: DESKTOP_ONLY },
  ];
  const renderRow = (session) => (
    <tr key={session.id}>
      <td className="type-body-strong">{formatValue(session.trainingName)}</td>
      <td className="admin-table__number">{formatDateTimeForDisplay(session.startedAt)}</td>
      <td className={`${DESKTOP_ONLY} admin-table__number`}>{session.finishedAt ? formatDateTimeForDisplay(session.finishedAt) : '—'}</td>
      <td className={`${DESKTOP_ONLY} admin-table__number`}>{formatDuration(session.durationSec)}</td>
    </tr>
  );
  return (
    <PagedTable
      fetchPage={fetchPage}
      columns={columns}
      renderRow={renderRow}
      emptyTitle={t('manager.sessionsEmpty')}
      loadingLabel={t('manager.loadingTab')}
    />
  );
};

SessionsTab.propTypes = { userId: PropTypes.string.isRequired };
