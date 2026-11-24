import { useId } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import Badge from '../ds/Badge';
import { challengeTagOf, ordinalOf } from '../../utils/challengeDisplay';
import { dayMonthOf, formatScore } from '../../utils/consistencyFormat';
import { formatDateForDisplay } from '../../utils/dateFormat';
import { CHALLENGE_FORMAT } from '../../constants/challenge';

const NO_VALUE = '—';

// "Treinador: Nome · 01/09 – 30/09/2026", without the trainer part when the name is unknown
const metaLineOf = (challenge, trainerName) => {
  const dates = `${dayMonthOf(challenge.startDate)} – ${formatDateForDisplay(challenge.endDate)}`;
  return trainerName ? `Treinador: ${trainerName} · ${dates}` : dates;
};

// The two figures of the card: position and average (weekly) or position and XP points (dates)
const figuresOf = (challenge, xp) => {
  if (challenge.format === CHALLENGE_FORMAT.WEEKS) {
    const consistency = challenge.consistency ?? {};
    return [
      { label: 'Sua posição', value: ordinalOf(consistency.position) },
      { label: 'Sua média', value: formatScore(consistency.average) },
    ];
  }
  return [
    { label: 'Sua posição', value: ordinalOf(xp?.position) },
    { label: 'Seus pontos', value: xp ? `${xp.points} pts` : NO_VALUE },
  ];
};

// Student championship card: name, tag, trainer and dates, position with average or points, and "Ver ranking →"
const MyChallengeCard = ({ challenge, trainerName = null, xp = null, today }) => {
  const navigate = useNavigate();
  const titleId = useId();
  const tag = challengeTagOf(challenge, today);
  return (
    <article className="challenge-card my-challenge-card" aria-labelledby={titleId}>
      <div className="challenge-card__head">
        <div className="my-challenge-card__identity">
          <h2 id={titleId} className="challenge-card__title type-h3">{challenge.name}</h2>
          <p className="my-challenge-card__meta type-body">{metaLineOf(challenge, trainerName)}</p>
        </div>
        <Badge variant="tag" tone={tag.tone}>{tag.label}</Badge>
      </div>
      <div className="challenge-card__footer my-challenge-card__footer">
        <dl className="my-challenge-card__figures">
          {figuresOf(challenge, xp).map((figure) => (
            <div key={figure.label} className="my-challenge-card__figure">
              <dt className="my-challenge-card__label type-caption">{figure.label}</dt>
              <dd className="my-challenge-card__value type-h2">{figure.value}</dd>
            </div>
          ))}
        </dl>
        <button type="button" className="challenge-card__action" onClick={() => navigate(`/my/challenges/${challenge.id}`)}>
          Ver ranking <span aria-hidden="true">→</span>
        </button>
      </div>
    </article>
  );
};

MyChallengeCard.propTypes = {
  challenge: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    startDate: PropTypes.string.isRequired,
    endDate: PropTypes.string.isRequired,
    format: PropTypes.string,
    consistency: PropTypes.shape({
      position: PropTypes.number,
      average: PropTypes.number,
    }),
  }).isRequired,
  trainerName: PropTypes.string,
  xp: PropTypes.shape({
    position: PropTypes.number,
    points: PropTypes.number,
  }),
  today: PropTypes.string.isRequired,
};

export default MyChallengeCard;
