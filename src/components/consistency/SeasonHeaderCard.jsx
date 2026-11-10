import PropTypes from 'prop-types';
import { Clock, Trophy } from 'lucide-react';
import Badge from '../ds/Badge';
import { formatCountdown, weekLabel } from '../../utils/consistencyFormat';
import { SEASON_STATUS } from '../../constants/consistencyRanking';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;
const MS_PER_WEEK = DAYS_PER_WEEK * MS_PER_DAY;
const PERCENT = 100;

// "DD/MM" of a "YYYY-MM-DD" date shifted by some days
const dayMonthOf = (dateKey, shiftDays = 0) => {
  const date = new Date(Date.parse(dateKey) + shiftDays * MS_PER_DAY);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
};

// "domingo, 08/11, às 21h" of the close instant in the given time zone
const closeLabelOf = (closesAt, timeZone) => {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date(closesAt)).map((part) => [part.type, part.value]));
  const minutes = parts.minute === '00' ? '' : parts.minute;
  return `${parts.weekday}, ${parts.day}/${parts.month}, às ${parts.hour}h${minutes}`;
};

// Fill of one season week: full when closed, by elapsed time while running, empty when ahead
const weekFillOf = (index, season, now) => {
  if (season.status === SEASON_STATUS.CLOSED || index < season.currentWeek) return PERCENT;
  if (index > season.currentWeek) return 0;
  const remaining = new Date(season.closesAt).getTime() - new Date(now).getTime();
  const elapsed = 1 - remaining / MS_PER_WEEK;
  return Math.round(Math.min(Math.max(elapsed, 0), 1) * PERCENT);
};

// One progress bar per season week
const WeekBars = ({ season, now }) => (
  <div className="season-header__bars">
    {Array.from({ length: season.weeks }, (_, offset) => offset + 1).map((index) => {
      const fill = weekFillOf(index, season, now);
      return (
        <span key={index} className="score-bar__track" role="progressbar" aria-label={`Semana ${index}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={fill}>
          <span className="score-bar__fill" style={{ width: `${fill}%` }} />
        </span>
      );
    })}
  </div>
);

WeekBars.propTypes = {
  season: PropTypes.object.isRequired,
  now: PropTypes.oneOfType([PropTypes.instanceOf(Date), PropTypes.string, PropTypes.number]).isRequired,
};

// Season card: number, status, dates, "Semana X de Y", countdown to the close and a bar per week
const SeasonHeaderCard = ({ season, now = new Date(), timeZone }) => {
  const isActive = season.status === SEASON_STATUS.ACTIVE;
  const dates = `${dayMonthOf(season.startWeek)} a ${dayMonthOf(season.endWeek, DAYS_PER_WEEK - 1)} · ${season.weeks} semanas`;
  return (
    <section className="section-card season-header" aria-label="Temporada atual">
      <span className="season-header__icon" aria-hidden="true">
        <Trophy size={24} strokeWidth={2} />
      </span>
      <div className="season-header__identity">
        <div className="season-header__title">
          <h2 className="type-h4">{`Temporada ${season.number}`}</h2>
          <Badge tone={isActive ? 'success' : 'neutral'}>{isActive ? 'Ativa' : 'Encerrada'}</Badge>
        </div>
        <span className="type-caption season-header__dates">{dates}</span>
      </div>
      <div className="season-header__progress">
        <div className="season-header__progress-head type-body">
          <span className="type-body-strong">{weekLabel(season.currentWeek, season.weeks)}</span>
          {isActive && season.closesAt && (
            <span className="season-header__countdown">
              <Clock size={16} strokeWidth={2} aria-hidden="true" />
              {`Fecha ${closeLabelOf(season.closesAt, timeZone)} · faltam ${formatCountdown(season.closesAt, now)}`}
            </span>
          )}
        </div>
        <WeekBars season={season} now={now} />
      </div>
    </section>
  );
};

SeasonHeaderCard.propTypes = {
  season: PropTypes.shape({
    number: PropTypes.number.isRequired,
    status: PropTypes.string.isRequired,
    startWeek: PropTypes.string.isRequired,
    endWeek: PropTypes.string.isRequired,
    weeks: PropTypes.number.isRequired,
    currentWeek: PropTypes.number.isRequired,
    closesAt: PropTypes.string,
  }).isRequired,
  now: PropTypes.oneOfType([PropTypes.instanceOf(Date), PropTypes.string, PropTypes.number]),
  timeZone: PropTypes.string,
};

export default SeasonHeaderCard;
