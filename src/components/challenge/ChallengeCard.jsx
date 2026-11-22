import { useId } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import Avatar from '../ds/Avatar';
import Badge from '../ds/Badge';
import { challengeTagOf } from '../../utils/challengeDisplay';
import { challengeWeekLabel } from '../../utils/challengeWeeks';
import { dayMonthOf } from '../../utils/consistencyFormat';
import { formatDateForDisplay } from '../../utils/dateFormat';
import { CHALLENGE_STATUS } from '../../constants/challenge';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_PREVIEW_AVATARS = 4;
const PROGRESS_STATUSES = Object.freeze([CHALLENGE_STATUS.ACTIVE, CHALLENGE_STATUS.COMPLETED]);
const OPEN_STATUSES = Object.freeze([CHALLENGE_STATUS.ACTIVE, CHALLENGE_STATUS.SCHEDULED]);

// Whole days from one "YYYY-MM-DD" key to another
const daysBetween = (fromKey, toKey) => Math.round((Date.parse(toKey) - Date.parse(fromKey)) / MS_PER_DAY);

// Share (0 to 100) of the championship days already elapsed on a civil day, counting today
const progressPercentOf = (challenge, today) => {
  const totalDays = Math.max(daysBetween(challenge.startDate, challenge.endDate) + 1, 1);
  const elapsedDays = Math.min(Math.max(daysBetween(challenge.startDate, today) + 1, 0), totalDays);
  return Math.round((elapsedDays / totalDays) * 100);
};

// "1 participante" / "N participantes"
const participantsLabelOf = (count) => `${count} ${count === 1 ? 'participante' : 'participantes'}`;

// "Progresso" caption over the elapsed-days bar
const ProgressBar = ({ percent }) => (
  <div className="challenge-card__progress">
    <span className="challenge-card__caption type-caption">Progresso</span>
    <div className="challenge-card__track" role="progressbar" aria-label="Progresso" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
      <span className="challenge-card__fill" style={{ width: `${percent}%` }} />
    </div>
  </div>
);

ProgressBar.propTypes = {
  percent: PropTypes.number.isRequired,
};

// Up to four overlapping participant avatars
const AvatarStack = ({ participants }) => (
  <span className="challenge-card__avatars">
    {participants.slice(0, MAX_PREVIEW_AVATARS).map((participant) => (
      <Avatar key={participant.studentId} name={[participant.firstName, participant.lastName].filter(Boolean).join(' ')} src={participant.avatarUrl || undefined} size="sm" />
    ))}
  </span>
);

AvatarStack.propTypes = {
  participants: PropTypes.arrayOf(PropTypes.shape({
    studentId: PropTypes.string.isRequired,
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    avatarUrl: PropTypes.string,
  })).isRequired,
};

// Link-styled action that opens the championship detail; it stretches over the whole card
const CardAction = ({ label, onClick }) => (
  <button type="button" className="challenge-card__action" onClick={onClick}>
    {label} <span aria-hidden="true">→</span>
  </button>
);

CardAction.propTypes = {
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
};

// Championship card of the list: name, status tag, dates, week, progress, participants and the link to its ranking
const ChallengeCard = ({ challenge, today }) => {
  const navigate = useNavigate();
  const titleId = useId();
  const tag = challengeTagOf(challenge, today);
  const weekLabel = challengeWeekLabel(challenge);
  const showProgress = PROGRESS_STATUSES.includes(challenge.status);
  const isInactive = (challenge.participantCount ?? 0) === 0 && OPEN_STATUSES.includes(challenge.status);
  const openTab = (tab) => navigate(`/trainer/challenges/${challenge.id}?tab=${tab}`);

  return (
    <article className="challenge-card" aria-labelledby={titleId}>
      <div className="challenge-card__head">
        <h2 id={titleId} className="challenge-card__title type-h3">{challenge.name}</h2>
        <Badge variant="tag" tone={tag.tone}>{tag.label}</Badge>
      </div>
      <p className="challenge-card__dates type-body">
        <Calendar size={16} strokeWidth={2} aria-hidden="true" />
        {`${dayMonthOf(challenge.startDate)} – ${formatDateForDisplay(challenge.endDate)}`}
      </p>
      {weekLabel && <p className="challenge-card__caption type-caption">{weekLabel}</p>}
      {showProgress && <ProgressBar percent={progressPercentOf(challenge, today)} />}
      {isInactive ? (
        <div className="challenge-card__footer">
          <span className="challenge-card__inactive type-caption">Nenhum participante — campeonato inativo</span>
          <CardAction label="Adicionar alunos" onClick={() => openTab('participants')} />
        </div>
      ) : (
        <div className="challenge-card__footer">
          <span className="challenge-card__participants">
            <AvatarStack participants={challenge.participantsPreview ?? []} />
            <span className="challenge-card__caption type-caption">{participantsLabelOf(challenge.participantCount ?? 0)}</span>
          </span>
          <CardAction label="Ver ranking" onClick={() => openTab('ranking')} />
        </div>
      )}
    </article>
  );
};

ChallengeCard.propTypes = {
  challenge: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    startDate: PropTypes.string.isRequired,
    endDate: PropTypes.string.isRequired,
    participantCount: PropTypes.number,
    participantsPreview: PropTypes.array,
  }).isRequired,
  today: PropTypes.string.isRequired,
};

export default ChallengeCard;
