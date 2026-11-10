import PropTypes from 'prop-types';
import { PILLAR_ABBREVIATIONS, PILLAR_LABELS, WARNING_SCORE_THRESHOLD } from '../../constants/consistencyRanking';

// One compact labeled bar of a pillar
const PillarBar = ({ pillar, adherence }) => {
  const isLow = adherence < WARNING_SCORE_THRESHOLD;
  return (
    <span className="pillar-mini__item">
      <span className="pillar-mini__label type-caption-strong">{PILLAR_ABBREVIATIONS[pillar]}</span>
      <span
        className={`score-bar__track pillar-mini__track${isLow ? ' score-bar__track--warning' : ''}`}
        role="progressbar"
        aria-label={PILLAR_LABELS[pillar]}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(adherence)}
      >
        <span className="score-bar__fill" style={{ width: `${adherence}%` }} />
      </span>
    </span>
  );
};

PillarBar.propTypes = {
  pillar: PropTypes.string.isRequired,
  adherence: PropTypes.number.isRequired,
};

// Compact bars of the pillars that had a target in the closed weeks of the season
const PillarMini = ({ pillars }) => (
  <span className="pillar-mini">
    {pillars
      .filter((item) => item.expected > 0)
      .map((item) => (
        <PillarBar key={item.pillar} pillar={item.pillar} adherence={item.adherence} />
      ))}
  </span>
);

PillarMini.propTypes = {
  pillars: PropTypes.arrayOf(
    PropTypes.shape({
      pillar: PropTypes.string.isRequired,
      done: PropTypes.number,
      expected: PropTypes.number,
      adherence: PropTypes.number.isRequired,
    })
  ).isRequired,
};

export default PillarMini;
