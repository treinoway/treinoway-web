import PropTypes from 'prop-types';
import { ChevronRight, Flag } from 'lucide-react';
import EmptyBlock from '../ds/EmptyBlock';
import { formatScore } from '../../utils/consistencyFormat';

// "DD/MM" of a "YYYY-MM-DD" date
const dayMonthOf = (dateKey) => {
  const [, month, day] = dateKey.split('-');
  return `${day}/${month}`;
};

// "21/09 a 18/10 · 17 participantes · média 82%" of a closed season
const seasonSummaryOf = (season) => {
  const participants = `${season.participants} ${season.participants === 1 ? 'participante' : 'participantes'}`;
  return `${dayMonthOf(season.startWeek)} a ${dayMonthOf(season.endWeek)} · ${participants} · média ${formatScore(season.average)}`;
};

// One closed season with its summary and the button that opens its frozen standings
const SeasonItem = ({ season, onOpenSeason }) => (
  <li className="seasons-list__item" aria-label={`Temporada ${season.number}`}>
    <span className="seasons-list__icon" aria-hidden="true">
      <Flag size={20} strokeWidth={2} />
    </span>
    <div className="seasons-list__identity">
      <span className="type-body-strong">{`Temporada ${season.number}`}</span>
      <span className="type-caption seasons-list__summary">{seasonSummaryOf(season)}</span>
    </div>
    <button type="button" className="btn btn--ghost" aria-label={`Ver classificação da Temporada ${season.number}`} onClick={() => onOpenSeason(season.number)}>
      Ver classificação
      <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
    </button>
  </li>
);

SeasonItem.propTypes = {
  season: PropTypes.shape({
    number: PropTypes.number.isRequired,
    startWeek: PropTypes.string.isRequired,
    endWeek: PropTypes.string.isRequired,
    participants: PropTypes.number.isRequired,
    average: PropTypes.number,
  }).isRequired,
  onOpenSeason: PropTypes.func.isRequired,
};

// Closed seasons, newest first, each opening its frozen standings
const PreviousSeasonsList = ({ seasons, onOpenSeason }) => {
  if (seasons.length === 0) {
    return <EmptyBlock icon={Flag} title="Sem temporadas encerradas ainda." />;
  }
  return (
    <ul className="seasons-list">
      {seasons.map((season) => (
        <SeasonItem key={season.number} season={season} onOpenSeason={onOpenSeason} />
      ))}
    </ul>
  );
};

PreviousSeasonsList.propTypes = {
  seasons: PropTypes.array.isRequired,
  onOpenSeason: PropTypes.func.isRequired,
};

export default PreviousSeasonsList;
