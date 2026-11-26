import PropTypes from 'prop-types';
import Badge from '../ds/Badge';
import Meter from '../ds/Meter';
import PillarResultRow from './PillarResultRow';
import { formatDayMonthForDisplay } from '../../utils/dateFormat';
import {
  bandToneOf,
  buildLatestPillars,
  deltaToneOf,
  formatDelta,
  formatScore,
  hasScore,
  meterToneOf,
  milestoneLabelOf,
  overallDeltaOf,
  scoreOutOf100,
} from '../../utils/studentFeedback';
import { t, tf } from '../../i18n';

const SEPARATOR = ' · ';

// Text of the block under the `studentFeedback.history.latest` namespace
const tl = (key, params) => tf(`studentFeedback.history.latest.${key}`, params);

// Which feedback the block describes and, when there is one, which it is compared with
const contextOf = (latest, previous) => {
  const parts = [milestoneLabelOf(latest), tl('answeredAt', { date: formatDayMonthForDisplay(latest.submittedAt) })];
  if (previous) parts.push(tl('comparedWith', { milestone: milestoneLabelOf(previous) }));
  return parts.join(SEPARATOR);
};

// Band of the overall index and its variation since the previous answered feedback
const OverallTrend = ({ latest, previous }) => {
  const delta = previous ? overallDeltaOf(latest, previous) : null;
  return (
    <span className="student-feedback-overall__trend">
      {latest.band && <Badge tone={bandToneOf(latest.band)}>{latest.bandLabel}</Badge>}
      {delta !== null && (
        <span className="type-caption student-feedback-overall__since">
          <Badge variant="tag" tone={deltaToneOf(delta)}>{formatDelta(delta)}</Badge>
          {' '}
          {tl('since', { milestone: milestoneLabelOf(previous) })}
        </span>
      )}
    </span>
  );
};

OverallTrend.propTypes = { latest: PropTypes.object.isRequired, previous: PropTypes.object };

// Overall index as a value "out of 100" with its meter, or "Sem nota" when the service sent no index
const OverallScore = ({ latest }) => {
  if (!hasScore(latest.overallIndex)) return <span className="type-body student-feedback-overall__scale">{t('studentFeedback.noScore')}</span>;
  return (
    <>
      <span className="student-feedback-overall__score">
        <span className="type-display student-feedback-index__value">{formatScore(latest.overallIndex)}</span>
        {' '}
        <span className="type-body student-feedback-overall__scale">{t('studentFeedback.outOf100')}</span>
      </span>
      <Meter value={latest.overallIndex} label={scoreOutOf100(latest.overallIndex)} tone={meterToneOf(latest.band)} />
    </>
  );
};

OverallScore.propTypes = { latest: PropTypes.object.isRequired };

// Overall index with its band, variation and the legend of the scale
const OverallIndex = ({ latest, previous }) => (
  <div className="student-feedback-overall">
    <span className="type-caption-strong student-feedback-overall__label">{t('studentFeedback.history.overallIndex')}</span>
    <OverallScore latest={latest} />
    <OverallTrend latest={latest} previous={previous} />
    <p className="type-caption student-feedback-overall__legend">{tl('legend')}</p>
  </div>
);

OverallIndex.propTypes = { latest: PropTypes.object.isRequired, previous: PropTypes.object };

// Latest answered feedback: the overall index and each pillar with scale, band, variation and the answers behind it
const LatestFeedback = ({ latest, previous = null }) => (
  <section className="section-card student-feedback-section" aria-labelledby="student-feedback-latest-heading">
    <div className="student-feedback-section__head">
      <h2 id="student-feedback-latest-heading" className="type-h3 student-feedback-section__title">{tl('title')}</h2>
      <span className="type-caption student-feedback-section__note">{contextOf(latest, previous)}</span>
    </div>
    <div className="student-feedback-latest">
      <OverallIndex latest={latest} previous={previous} />
      <ul className="student-feedback-pillar-list" aria-label={tl('pillarsAria')}>
        {buildLatestPillars(latest, previous).map((pillar) => <PillarResultRow key={pillar.pillar} pillar={pillar} />)}
      </ul>
    </div>
  </section>
);

LatestFeedback.propTypes = {
  latest: PropTypes.object.isRequired,
  previous: PropTypes.object,
};

export default LatestFeedback;
