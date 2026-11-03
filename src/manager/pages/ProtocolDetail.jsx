import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { ArrowLeft } from 'lucide-react';
import { t, tf } from '../../i18n';
import { formatDateForDisplay } from '../../utils/dateFormat';
import Banner from '../../components/ds/Banner';
import SkeletonRows from '../../components/ds/SkeletonRows';
import { getProtocol } from '../api';
import { getNameOrDash, formatPrescription, formatLoad, formatRest, formatValue } from '../format';
import useManagerQuery from '../useManagerQuery';

// One read-only exercise row; every value is a single text node in its own cell.
const ExerciseRow = ({ exercise }) => (
  <tr>
    <td className="type-body-strong">{exercise.name}</td>
    <td className="admin-table__number">{formatValue(exercise.sets)}</td>
    <td className="admin-table__number">{formatPrescription(exercise)}</td>
    <td className="admin-table__number">{formatLoad(exercise.hasLoad, exercise.suggestedLoad)}</td>
    <td className="table-col-desktop-only admin-table__number">{formatRest(exercise.restInterval)}</td>
    <td className="table-col-desktop-only">{formatValue(exercise.notes)}</td>
  </tr>
);

ExerciseRow.propTypes = { exercise: PropTypes.object.isRequired };

// One training card with its exercises table.
const TrainingCard = ({ training }) => (
  <section className="section-card manager-training">
    <h2 className="type-h3">{training.name}</h2>
    <div className="admin-table-wrap">
      <table className="admin-table type-body">
        <thead>
          <tr>
            <th className="type-caption-strong">{t('manager.colExercise')}</th>
            <th className="type-caption-strong">{t('manager.colSets')}</th>
            <th className="type-caption-strong">{t('manager.colReps')}</th>
            <th className="type-caption-strong">{t('manager.colLoad')}</th>
            <th className="type-caption-strong table-col-desktop-only">{t('manager.colRest')}</th>
            <th className="type-caption-strong table-col-desktop-only">{t('manager.colNotes')}</th>
          </tr>
        </thead>
        <tbody>
          {training.exercises.map((exercise) => (
            <ExerciseRow key={exercise.id} exercise={exercise} />
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

TrainingCard.propTypes = { training: PropTypes.object.isRequired };

// Formats the protocol period as "start – end".
const formatPeriod = (protocol) =>
  `${formatDateForDisplay(protocol.startDate)} – ${protocol.endDate ? formatDateForDisplay(protocol.endDate) : '—'}`;

// Header with the back button, name and trainer/assignee/period lines.
const ProtocolHeader = ({ protocol, onBack }) => (
  <header className="manager-user-header">
    <button type="button" className="btn btn--ghost" onClick={onBack}>
      <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
      {t('manager.back')}
    </button>
    <h1 className="type-h1">{protocol.name}</h1>
    <p className="type-body">
      {tf('manager.protocolTrainer', {
        name: getNameOrDash(protocol.trainerName),
      })}
    </p>
    <p className="type-body">
      {tf('manager.protocolAssignee', {
        name: getNameOrDash(protocol.assigneeName),
      })}
    </p>
    <p className="type-body">{tf('manager.protocolPeriod', { period: formatPeriod(protocol) })}</p>
  </header>
);

ProtocolHeader.propTypes = {
  protocol: PropTypes.object.isRequired,
  onBack: PropTypes.func.isRequired,
};

// Backoffice protocol detail: read-only trainings and exercises.
const ProtocolDetail = () => {
  const { protocolId } = useParams();
  const navigate = useNavigate();
  const request = useCallback(() => getProtocol(protocolId), [protocolId]);
  const { data, message, loading } = useManagerQuery(request);

  if (loading) return <SkeletonRows label={t('manager.loadingProtocol')} count={4} />;
  if (message) return <Banner tone="error">{message}</Banner>;
  return (
    <div className="admin-page">
      <ProtocolHeader protocol={data} onBack={() => navigate(-1)} />
      {data.trainings.map((training) => (
        <TrainingCard key={training.id} training={training} />
      ))}
    </div>
  );
};

export default ProtocolDetail;
