import PropTypes from 'prop-types';
import { Medal } from 'lucide-react';
import Avatar from '../ds/Avatar';

const PODIUM_SIZE = 3;

// Podium slots in the order they are drawn: 2nd on the left, 1st in the middle, 3rd on the right; only the occupied ones
const slotsOf = (places) => {
  const [first, second, third] = places.slice(0, PODIUM_SIZE);
  return [second, first, third].filter(Boolean);
};

// One podium place: medal with "Nº lugar", avatar, name, score and support line; the leader is highlighted
const PodiumPlace = ({ place, isLeader }) => (
  <li className={`championship-podium__place${isLeader ? ' championship-podium__place--leader' : ''}`} aria-label={`${place.position}º lugar`}>
    <span className="championship-podium__medal type-caption-strong">
      <Medal size={16} strokeWidth={2} aria-hidden="true" />
      {`${place.position}º lugar`}
    </span>
    <Avatar name={place.name} src={place.avatarUrl || undefined} size="lg" />
    <span className="championship-podium__name type-body-strong">{place.name}</span>
    <span className="championship-podium__score type-h2">{place.score}</span>
    <span className="championship-podium__support type-caption">{place.support}</span>
  </li>
);

PodiumPlace.propTypes = {
  place: PropTypes.object.isRequired,
  isLeader: PropTypes.bool.isRequired,
};

// Championship podium: up to three places drawn 2nd, 1st, 3rd, each with medal, avatar, name, score and support line
const ChampionshipPodium = ({ places }) => {
  const slots = slotsOf(places);
  if (slots.length === 0) return null;
  return (
    <ol className="championship-podium" aria-label="Pódio">
      {slots.map((place) => (
        <PodiumPlace key={place.studentId} place={place} isLeader={place === places[0]} />
      ))}
    </ol>
  );
};

ChampionshipPodium.propTypes = {
  places: PropTypes.arrayOf(PropTypes.shape({
    studentId: PropTypes.string.isRequired,
    position: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    avatarUrl: PropTypes.string,
    score: PropTypes.string.isRequired,
    support: PropTypes.string.isRequired,
  })).isRequired,
};

export default ChampionshipPodium;
