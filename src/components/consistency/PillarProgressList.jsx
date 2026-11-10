import PropTypes from 'prop-types';
import { Droplet, Dumbbell, HeartPulse, MessageSquare, Utensils } from 'lucide-react';
import { formatScore } from '../../utils/consistencyFormat';
import { PILLAR, PILLAR_LABELS, WARNING_SCORE_THRESHOLD } from '../../constants/consistencyRanking';

const PILLAR_ICONS = Object.freeze({
  [PILLAR.WORKOUTS]: Dumbbell,
  [PILLAR.CARDIO]: HeartPulse,
  [PILLAR.FEEDBACK]: MessageSquare,
  [PILLAR.HYDRATION]: Droplet,
  [PILLAR.DIET]: Utensils,
});

// "5 de 8"; hydration counts days
const doneOfExpected = ({ pillar, done, expected }) => (pillar === PILLAR.HYDRATION ? `${done} dias de ${expected}` : `${done} de ${expected}`);

// One pillar: icon, name, percentage, done of expected and the bar
const PillarProgressRow = ({ item }) => {
  const Icon = PILLAR_ICONS[item.pillar];
  const label = PILLAR_LABELS[item.pillar];
  const trackClass = `score-bar__track${item.adherence < WARNING_SCORE_THRESHOLD ? ' score-bar__track--warning' : ''}`;
  return (
    <li className="pillar-progress__row" aria-label={label}>
      <span className="pillar-progress__icon" aria-hidden="true">
        <Icon size={20} strokeWidth={2} />
      </span>
      <div className="pillar-progress__body">
        <div className="pillar-progress__line">
          <span className="type-body-strong">{label}</span>
          <span className="pillar-progress__figures type-body">
            <strong>{formatScore(item.adherence)}</strong>
            <span className="pillar-progress__count">{`· ${doneOfExpected(item)}`}</span>
          </span>
        </div>
        <span className={trackClass} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(item.adherence)}>
          <span className="score-bar__fill" style={{ width: `${item.adherence}%` }} />
        </span>
      </div>
    </li>
  );
};

PillarProgressRow.propTypes = {
  item: PropTypes.shape({
    pillar: PropTypes.string.isRequired,
    done: PropTypes.number,
    expected: PropTypes.number,
    adherence: PropTypes.number.isRequired,
  }).isRequired,
};

// Season adherence per pillar with a target in the closed weeks: percentage and done of expected
const PillarProgressList = ({ pillars }) => {
  const withTarget = pillars.filter((item) => item.expected > 0);
  return (
    <section className="student-panel__section" aria-label="Pilares nas semanas fechadas">
      <h3 className="type-overline student-panel__section-title">Pilares nas semanas fechadas</h3>
      {withTarget.length === 0 ? (
        <p className="type-body pillar-progress__empty">Nenhum pilar teve meta nas semanas fechadas.</p>
      ) : (
        <ul className="pillar-progress">
          {withTarget.map((item) => (
            <PillarProgressRow key={item.pillar} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
};

PillarProgressList.propTypes = {
  pillars: PropTypes.arrayOf(
    PropTypes.shape({
      pillar: PropTypes.string.isRequired,
      done: PropTypes.number,
      expected: PropTypes.number,
      adherence: PropTypes.number.isRequired,
    })
  ).isRequired,
};

export default PillarProgressList;
