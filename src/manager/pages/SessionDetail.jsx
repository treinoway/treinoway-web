import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { ArrowLeft } from 'lucide-react';
import { t, tf } from '../../i18n';
import { formatDateTimeForDisplay, formatTimeForDisplay } from '../../utils/dateFormat';
import Badge from '../../components/ds/Badge';
import Banner from '../../components/ds/Banner';
import SkeletonRows from '../../components/ds/SkeletonRows';
import { getSession } from '../api';
import { getDisplayName, formatDuration, formatLoad, formatRest, formatValue } from '../format';
import useManagerQuery from '../useManagerQuery';

const EMPTY = '—';
const DESKTOP_ONLY = 'table-col-desktop-only';
const SESSION_TONES = { completed: 'success', in_progress: 'warning' };
const EXERCISE_TONES = { completed: 'success', substituted: 'brand', skipped: 'warning' };

// Formats a timestamp as "dd/mm/aaaa HH:mm"; em dash when absent.
const formatDateTime = (value) =>
  value ? `${formatDateTimeForDisplay(value)} ${formatTimeForDisplay(value)}` : EMPTY;

// Formats a logged load as "<n> kg"; em dash when absent.
const formatSetLoad = (load) => formatLoad(true, load);

// Formats the reps of a logged set, falling back to its duration ("45s").
const formatSetReps = ({ repetitions, duration }) => {
  if (repetitions != null) return String(repetitions);
  return duration == null ? EMPTY : `${duration}s`;
};

// Translates a status key under `prefix`, falling back to the raw value.
const statusLabel = (prefix, status) => t(`${prefix}.${status}`) ?? formatValue(status);

// Table header row from a list of [label, className] pairs.
const HeaderRow = ({ columns }) => (
  <thead>
    <tr>
      {columns.map(([label, className]) => (
        <th key={label} className={`type-caption-strong${className ? ` ${className}` : ''}`}>
          {label}
        </th>
      ))}
    </tr>
  </thead>
);

HeaderRow.propTypes = { columns: PropTypes.arrayOf(PropTypes.array).isRequired };

// One logged set row; RPE, rest and notes are hidden on mobile.
const SetRow = ({ set }) => (
  <tr>
    <td className="admin-table__number">{set.setNumber}</td>
    <td className="admin-table__number">{formatSetLoad(set.load)}</td>
    <td className="admin-table__number">{formatSetReps(set)}</td>
    <td className={`${DESKTOP_ONLY} admin-table__number`}>{formatValue(set.rpe)}</td>
    <td className={`${DESKTOP_ONLY} admin-table__number`}>{formatRest(set.restSeconds)}</td>
    <td>
      <Badge tone={set.completed ? 'success' : 'neutral'}>
        {t(`manager.session.setStatus.${set.completed ? 'completed' : 'incomplete'}`)}
      </Badge>
    </td>
    <td className={DESKTOP_ONLY}>{formatValue(set.notes)}</td>
  </tr>
);

SetRow.propTypes = { set: PropTypes.object.isRequired };

// Logged sets of one exercise, or an empty line when none were recorded.
const SetsTable = ({ setLogs }) => {
  if (!setLogs.length) return <p className="type-body">{t('manager.session.setsEmpty')}</p>;
  const columns = [
    [t('manager.session.colSet')],
    [t('manager.session.colLoad')],
    [t('manager.session.colReps')],
    [t('manager.session.colRpe'), DESKTOP_ONLY],
    [t('manager.session.colRest'), DESKTOP_ONLY],
    [t('manager.session.colStatus')],
    [t('manager.session.colNotes'), DESKTOP_ONLY],
  ];
  return (
    <div className="admin-table-wrap">
      <table className="admin-table type-body">
        <HeaderRow columns={columns} />
        <tbody>
          {setLogs.map((set) => (
            <SetRow key={set.id} set={set} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

SetsTable.propTypes = { setLogs: PropTypes.array.isRequired };

// The student's previous completed sets for this exercise and the best set among them.
const PreviousLog = ({ previousLog }) => {
  if (!previousLog) return <p className="type-body">{t('manager.session.previousEmpty')}</p>;
  const { bestSet } = previousLog;
  const columns = [[t('manager.session.colSet')], [t('manager.session.colLoad')], [t('manager.session.colReps')]];
  return (
    <>
      <h3 className="type-body-strong">
        {tf('manager.session.previousTitle', { date: formatDateTimeForDisplay(previousLog.finishedAt) })}
      </h3>
      <div className="admin-table-wrap">
        <table className="admin-table type-body">
          <HeaderRow columns={columns} />
          <tbody>
            {previousLog.setLogs.map((set) => (
              <tr key={set.setNumber}>
                <td className="admin-table__number">{set.setNumber}</td>
                <td className="admin-table__number">{formatSetLoad(set.load)}</td>
                <td className="admin-table__number">{formatSetReps(set)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {bestSet && (
        <p className="type-body">
          {tf('manager.session.bestSet', { load: formatSetLoad(bestSet.load), reps: formatSetReps(bestSet) })}
        </p>
      )}
    </>
  );
};

PreviousLog.propTypes = { previousLog: PropTypes.object };

// One exercise card: name, status, substitution, notes, logged sets and previous log.
const ExerciseCard = ({ exerciseLog }) => (
  <section className="section-card manager-training">
    <h2 className="type-h3">{exerciseLog.exercise.name}</h2>
    <div className="manager-badges">
      <Badge tone={EXERCISE_TONES[exerciseLog.status] ?? 'neutral'}>
        {statusLabel('manager.session.exerciseStatus', exerciseLog.status)}
      </Badge>
    </div>
    {exerciseLog.substitutedByExerciseName && (
      <p className="type-body">{tf('manager.session.substitutedBy', { name: exerciseLog.substitutedByExerciseName })}</p>
    )}
    {exerciseLog.notes && <p className="type-body">{exerciseLog.notes}</p>}
    <SetsTable setLogs={exerciseLog.setLogs} />
    <PreviousLog previousLog={exerciseLog.previousLog} />
  </section>
);

ExerciseCard.propTypes = { exerciseLog: PropTypes.object.isRequired };

// Header with the back button, training name, status and the session's metadata lines.
const SessionHeader = ({ session, onBack }) => (
  <header className="manager-user-header">
    <button type="button" className="btn btn--ghost" onClick={onBack}>
      <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
      {t('manager.back')}
    </button>
    <h1 className="type-h1">{session.training.name}</h1>
    <div className="manager-badges">
      <Badge tone={SESSION_TONES[session.status] ?? 'neutral'}>
        {statusLabel('manager.session.status', session.status)}
      </Badge>
      {session.deletedAt && <Badge tone="error">{t('manager.deleted')}</Badge>}
    </div>
    <p className="type-body">{tf('manager.session.student', { name: getDisplayName(session.student) })}</p>
    <p className="type-body">{tf('manager.session.startedAt', { date: formatDateTime(session.startedAt) })}</p>
    <p className="type-body">{tf('manager.session.finishedAt', { date: formatDateTime(session.finishedAt) })}</p>
    <p className="type-body">{tf('manager.session.duration', { duration: formatDuration(session.durationSec) })}</p>
    {session.notes && <p className="type-body">{tf('manager.session.notes', { notes: session.notes })}</p>}
  </header>
);

SessionHeader.propTypes = {
  session: PropTypes.object.isRequired,
  onBack: PropTypes.func.isRequired,
};

// Backoffice workout session detail: read-only exercise logs, sets and previous logs.
const SessionDetail = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const request = useCallback(() => getSession(sessionId), [sessionId]);
  const { data, message, loading } = useManagerQuery(request);

  if (loading) return <SkeletonRows label={t('manager.session.loading')} count={4} />;
  if (message) return <Banner tone="error">{message}</Banner>;
  return (
    <div className="admin-page">
      <SessionHeader session={data} onBack={() => navigate(-1)} />
      {data.exerciseLogs.map((exerciseLog) => (
        <ExerciseCard key={exerciseLog.id} exerciseLog={exerciseLog} />
      ))}
    </div>
  );
};

export default SessionDetail;
