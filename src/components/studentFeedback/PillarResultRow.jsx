import { useId, useState } from 'react';
import PropTypes from 'prop-types';
import { ChevronDown } from 'lucide-react';
import Badge from '../ds/Badge';
import Meter from '../ds/Meter';
import PillarAnswers from './PillarAnswers';
import { bandToneOf, deltaToneOf, formatDelta, formatScore, hasScore, meterToneOf, scoreOutOf100 } from '../../utils/studentFeedback';
import { t } from '../../i18n';

// Meter and value "out of 100" of one pillar, or "Sem nota" when the service sent no score
const PillarScore = ({ pillar }) => {
  if (!hasScore(pillar.score)) return <span className="type-caption student-feedback-pillar__value student-feedback-pillar__value--empty">{t('studentFeedback.noScore')}</span>;
  return (
    <>
      <Meter className="student-feedback-pillar__meter" value={pillar.score} label={scoreOutOf100(pillar.score)} tone={meterToneOf(pillar.band)} />
      <span className="student-feedback-pillar__value">
        <strong className="type-body-strong">{formatScore(pillar.score)}</strong>
        {' '}
        <span className="type-caption">{t('studentFeedback.outOf100')}</span>
      </span>
    </>
  );
};

PillarScore.propTypes = { pillar: PropTypes.object.isRequired };

// Name, score, band and variation of one pillar
const PillarSummary = ({ pillar }) => (
  <>
    <span className="type-body-strong student-feedback-pillar__name">{pillar.pillarLabel}</span>
    <PillarScore pillar={pillar} />
    <span className="student-feedback-pillar__badges">
      {pillar.band && <Badge tone={bandToneOf(pillar.band)}>{pillar.bandLabel}</Badge>}
      {pillar.delta !== null && <Badge variant="tag" tone={deltaToneOf(pillar.delta)}>{formatDelta(pillar.delta)}</Badge>}
    </span>
  </>
);

PillarSummary.propTypes = { pillar: PropTypes.object.isRequired };

// Pillar whose row is a button that reveals the answers of the student behind the score
const ExpandablePillar = ({ pillar }) => {
  const [open, setOpen] = useState(false);
  const answersId = useId();
  return (
    <li className={`student-feedback-pillar${open ? ' student-feedback-pillar--open' : ''}`}>
      <button
        type="button"
        className="student-feedback-pillar__row student-feedback-pillar__row--button"
        aria-expanded={open}
        aria-controls={open ? answersId : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        <PillarSummary pillar={pillar} />
        <ChevronDown className="student-feedback-pillar__chevron" size={16} strokeWidth={2} aria-hidden="true" />
      </button>
      {open && <PillarAnswers id={answersId} answers={pillar.answers} />}
    </li>
  );
};

ExpandablePillar.propTypes = { pillar: PropTypes.object.isRequired };

// One pillar of the latest answered feedback; it expands only when the service sent the answers behind it
const PillarResultRow = ({ pillar }) => {
  if (pillar.answers?.length > 0) return <ExpandablePillar pillar={pillar} />;
  return (
    <li className="student-feedback-pillar">
      <div className="student-feedback-pillar__row"><PillarSummary pillar={pillar} /></div>
    </li>
  );
};

PillarResultRow.propTypes = {
  pillar: PropTypes.shape({
    pillarLabel: PropTypes.string.isRequired,
    score: PropTypes.number,
    band: PropTypes.string,
    bandLabel: PropTypes.string,
    delta: PropTypes.number,
    answers: PropTypes.array,
  }).isRequired,
};

export default PillarResultRow;
