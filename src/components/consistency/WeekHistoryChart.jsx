import PropTypes from 'prop-types';
import { formatScore } from '../../utils/consistencyFormat';

const DEFAULT_RISK_LIMIT = 70;
const WEEK_STATE = Object.freeze({ CLOSED: 'closed', CURRENT: 'current', FUTURE: 'future' });

// Accessible name of the bar of one week
const barLabelOf = (week) => {
  const hasScore = week.score !== null && week.score !== undefined;
  if (!hasScore) return `Semana ${week.number}: sem pontuação`;
  if (week.state === WEEK_STATE.CURRENT) return `Semana ${week.number} em andamento: ${formatScore(week.score)}`;
  return `Semana ${week.number}: ${formatScore(week.score)}`;
};

// Modifier classes of the bar: running week striped, no score as an empty track, below the limit in the warning color
const barClassOf = (week, riskLimit) => {
  const hasScore = week.score !== null && week.score !== undefined;
  if (!hasScore) return 'week-chart__bar week-chart__bar--empty';
  if (week.state === WEEK_STATE.CURRENT) return 'week-chart__bar week-chart__bar--current';
  return `week-chart__bar${week.score < riskLimit ? ' week-chart__bar--warning' : ''}`;
};

// One column of the chart: score, bar over the risk line and week name
const WeekColumn = ({ week, riskLimit }) => {
  const hasScore = week.score !== null && week.score !== undefined;
  return (
    <li className="week-chart__column">
      <span className="week-chart__score type-body-strong">{formatScore(week.score)}</span>
      <span className="week-chart__plot">
        <span className="week-chart__limit" style={{ bottom: `${riskLimit}%` }} aria-hidden="true" />
        <span
          className={barClassOf(week, riskLimit)}
          role="img"
          aria-label={barLabelOf(week)}
          style={hasScore ? { height: `${week.score}%` } : undefined}
        />
      </span>
      <span className="week-chart__name type-caption">{`Sem. ${week.number}`}</span>
    </li>
  );
};

WeekColumn.propTypes = {
  week: PropTypes.shape({
    number: PropTypes.number.isRequired,
    state: PropTypes.string.isRequired,
    score: PropTypes.number,
  }).isRequired,
  riskLimit: PropTypes.number.isRequired,
};

// Note under the chart about the running week: partial score and, when known, when it closes
const runningWeekNote = (week, closeLabel) => {
  const base = `Semana ${week.number} em andamento (listrada): ${formatScore(week.score)} até agora`;
  return closeLabel ? `${base}, fecha ${closeLabel}.` : `${base}.`;
};

// Week-by-week bars of the season with the dashed risk-limit line, the running week striped and future weeks as a dash
const WeekHistoryChart = ({ weeks, riskLimit = DEFAULT_RISK_LIMIT, seasonNumber, closeLabel }) => {
  const runningWeek = weeks.find((week) => week.state === WEEK_STATE.CURRENT);
  return (
    <section className="student-panel__section week-chart" aria-label="Semana a semana">
      <div className="week-chart__head">
        <h3 className="type-overline week-chart__title">{`Semana a semana · Temporada ${seasonNumber}`}</h3>
        <span className="type-caption week-chart__legend">{`linha = limite de risco ${riskLimit}%`}</span>
      </div>
      <ol className="week-chart__columns">
        {weeks.map((week) => (
          <WeekColumn key={week.weekStart} week={week} riskLimit={riskLimit} />
        ))}
      </ol>
      {runningWeek && <p className="type-caption week-chart__note">{runningWeekNote(runningWeek, closeLabel)}</p>}
    </section>
  );
};

WeekHistoryChart.propTypes = {
  weeks: PropTypes.arrayOf(
    PropTypes.shape({
      weekStart: PropTypes.string.isRequired,
      number: PropTypes.number.isRequired,
      state: PropTypes.string.isRequired,
      score: PropTypes.number,
    })
  ).isRequired,
  riskLimit: PropTypes.number,
  seasonNumber: PropTypes.number.isRequired,
  closeLabel: PropTypes.string,
};

export default WeekHistoryChart;
