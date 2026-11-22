import PropTypes from 'prop-types';
import { ArrowLeft, Star } from 'lucide-react';
import Badge from '../ds/Badge';
import { challengeTagOf } from '../../utils/challengeDisplay';
import { dayMonthOf } from '../../utils/consistencyFormat';
import { formatDateForDisplay } from '../../utils/dateFormat';
import { CHALLENGE_STATUS } from '../../constants/challenge';

const READ_ONLY_STATUSES = Object.freeze([CHALLENGE_STATUS.COMPLETED, CHALLENGE_STATUS.CANCELLED]);

// "1 participante" / "N participantes"
const participantsLabelOf = (count) => `${count} ${count === 1 ? 'participante' : 'participantes'}`;

// "DD/MM – DD/MM/AAAA · N participantes" of a championship
const challengeDatesLineOf = (challenge) =>
  `${dayMonthOf(challenge.startDate)} – ${formatDateForDisplay(challenge.endDate)} · ${participantsLabelOf(challenge.participantCount ?? 0)}`;

// "← Campeonatos" back link of the championship pages
export const BackToChallenges = ({ onBack }) => (
  <button type="button" className="challenge-header__back" onClick={onBack}>
    <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
    Campeonatos
  </button>
);

BackToChallenges.propTypes = {
  onBack: PropTypes.func.isRequired,
};

// Championship page header: back link, name as page title, status tag, dates with participants, the weekly description and "Dar bônus" while it can still score
const ChallengePageHeader = ({ challenge, today, showDescription = false, onBack, onBonus }) => {
  const tag = challengeTagOf(challenge, today, { detail: true });
  const canGiveBonus = Boolean(onBonus) && !READ_ONLY_STATUSES.includes(challenge.status);
  const description = showDescription ? challenge.description : null;
  return (
    <header className="challenge-header">
      <BackToChallenges onBack={onBack} />
      <div className="challenge-header__main">
        <div className="challenge-header__identity">
          <h1 className="challenge-header__title type-h1">{challenge.name}</h1>
          <div className="challenge-header__meta">
            <Badge variant="tag" tone={tag.tone}>{tag.label}</Badge>
            <span className="type-body">{challengeDatesLineOf(challenge)}</span>
          </div>
          {description && <p className="challenge-header__description type-body">{description}</p>}
        </div>
        {canGiveBonus && (
          <button type="button" className="btn btn--neutral" onClick={onBonus}>
            <Star size={16} strokeWidth={2} aria-hidden="true" />
            Dar bônus
          </button>
        )}
      </div>
    </header>
  );
};

ChallengePageHeader.propTypes = {
  challenge: PropTypes.shape({
    name: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    startDate: PropTypes.string.isRequired,
    endDate: PropTypes.string.isRequired,
    participantCount: PropTypes.number,
    description: PropTypes.string,
  }).isRequired,
  today: PropTypes.string.isRequired,
  showDescription: PropTypes.bool,
  onBack: PropTypes.func.isRequired,
  onBonus: PropTypes.func,
};

export default ChallengePageHeader;
