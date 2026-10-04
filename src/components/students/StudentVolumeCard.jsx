import PropTypes from 'prop-types';
import PulseWaveform from '../PulseWaveform';
import PulseHeatmap from '../PulseHeatmap';
import { td } from '../../utils/studentCockpit';

const DEFAULT_DOW_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const hasActivity = (vizData) =>
  vizData.type === 'heatmap'
    ? (vizData.weeks ?? []).length > 0
    : (vizData.days ?? []).some((day) => day.session);

const VolumeBody = ({ vizData, loading, error, onRetry }) => {
  if (loading) return <div className="row-skeleton volume-card__skeleton" aria-hidden="true" />;
  if (error) {
    return (
      <div className="cockpit-card__error" role="alert">
        <p className="type-body">{td('volume.error')}</p>
        <button type="button" className="btn btn--secondary" onClick={onRetry}>{td('retry')}</button>
      </div>
    );
  }
  if (!hasActivity(vizData)) {
    return <p className="cockpit-card__muted type-body">{td('volume.empty')}</p>;
  }
  if (vizData.type === 'heatmap') {
    return (
      <PulseHeatmap
        weeks={vizData.weeks}
        dowLabels={vizData.dowLabels ?? DEFAULT_DOW_LABELS}
        maxVolumeKg={vizData.maxVolumeKg ?? 0}
      />
    );
  }
  return <PulseWaveform days={vizData.days} />;
};

VolumeBody.propTypes = {
  vizData: PropTypes.object.isRequired,
  loading: PropTypes.bool,
  error: PropTypes.any,
  onRetry: PropTypes.func.isRequired,
};

/** Volume per session day in the selected period, from GET dashboard/daily-activity. */
const StudentVolumeCard = ({ vizData, periodLabel, loading, error, onRetry }) => {
  const title = vizData.type === 'heatmap' ? td('volume.heatmapTitle') : td('volume.title');

  return (
    <section className="section-card cockpit-card volume-card" aria-labelledby="student-volume-heading">
      <h3 id="student-volume-heading" className="cockpit-card__subtitle type-body">
        {title}
        {periodLabel && <span className="cockpit-card__subtitle-suffix"> · {periodLabel.toLowerCase()}</span>}
      </h3>
      <VolumeBody vizData={vizData} loading={loading} error={error} onRetry={onRetry} />
    </section>
  );
};

StudentVolumeCard.propTypes = {
  vizData: PropTypes.shape({
    type: PropTypes.oneOf(['waveform', 'heatmap']).isRequired,
    days: PropTypes.array,
    weeks: PropTypes.array,
    dowLabels: PropTypes.arrayOf(PropTypes.string),
    maxVolumeKg: PropTypes.number,
  }).isRequired,
  periodLabel: PropTypes.string,
  loading: PropTypes.bool,
  error: PropTypes.any,
  onRetry: PropTypes.func.isRequired,
};

export default StudentVolumeCard;
