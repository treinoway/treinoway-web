import PropTypes from 'prop-types';
import { Ban, Clock, Medal, Users } from 'lucide-react';
import Avatar from '../ds/Avatar';
import Badge from '../ds/Badge';
import Banner from '../ds/Banner';
import EmptyBlock from '../ds/EmptyBlock';
import SkeletonRows from '../ds/SkeletonRows';
import FaixaBadge from '../consistency/FaixaBadge';
import PositionMark from '../consistency/PositionMark';
import ScoreBar from '../consistency/ScoreBar';
import { dayMonthOf, formatCloseDateLabel, formatCountdown, formatScore, weekLabel } from '../../utils/consistencyFormat';
import { CHALLENGE_STATUS } from '../../constants/challenge';

const COLUMN_HEADERS = ['Pos.', 'Aluno', 'Faixa', 'Média', 'Semana atual', 'Sem. 100%', 'Sequência'];
const NO_STREAK_PLACEHOLDER = '—';
const TABLE_SKELETON_COUNT = 6;
const EMPTY_MESSAGE = 'Nenhum participante com semana válida ainda.';

// "N sem." of the weekly streak, a dash when there is none
const streakLabelOf = (streak) => (streak > 0 ? `${streak} sem.` : NO_STREAK_PLACEHOLDER);

// "1 participante" / "N participantes"
const participantsLabelOf = (count) => `${count} ${count === 1 ? 'participante' : 'participantes'}`;

// "DD/MM" of an instant in a time zone
const dayMonthInZone = (instant, timeZone) => {
  const formatter = new Intl.DateTimeFormat('pt-BR', { timeZone, day: '2-digit', month: '2-digit' });
  return formatter.format(new Date(instant));
};

// "Encerrado em DD/MM": the close instant in the trainer time zone, or the last Sunday when the instant is missing
const closedOnLabelOf = (challenge, timeZone) => {
  const day = challenge.closedAt ? dayMonthInZone(challenge.closedAt, timeZone) : dayMonthOf(challenge.endDate);
  return `Encerrado em ${day}`;
};

// Student cell: avatar, the name that opens the student panel and the entering progress
const StudentCell = ({ row, onOpenStudent }) => {
  const name = row.displayName || row.name;
  return (
    <div className="consistency-row__student">
      <Avatar name={name} size="sm" />
      <div className="consistency-row__identity">
        <button type="button" className="consistency-row__open type-body-strong" onClick={() => onOpenStudent(row)}>
          {name}
        </button>
        {row.entering && (
          <span className="student-signals">
            <Badge tone="neutral">{`Entrando · ${row.entering.validWeeks} de ${row.entering.required} semanas`}</Badge>
          </span>
        )}
      </div>
    </div>
  );
};

StudentCell.propTypes = {
  row: PropTypes.object.isRequired,
  onOpenStudent: PropTypes.func.isRequired,
};

// One participant row: position (medals on the podium), student, band, average, current week, weeks at 100% and streak
const ConsistencyRow = ({ row, onOpenStudent }) => (
  <tr className="consistency-row">
    <td><PositionMark position={row.position} /></td>
    <td><StudentCell row={row} onOpenStudent={onOpenStudent} /></td>
    <td><FaixaBadge faixa={row.faixa} /></td>
    <td><ScoreBar score={row.average} label="Média no campeonato" /></td>
    <td className="consistency-row__number type-body-strong">{formatScore(row.currentWeekScore)}</td>
    <td className="consistency-row__number type-body-strong">{row.weeks100}</td>
    <td className="consistency-row__number type-body-strong">{streakLabelOf(row.streak)}</td>
  </tr>
);

ConsistencyRow.propTypes = {
  row: PropTypes.object.isRequired,
  onOpenStudent: PropTypes.func.isRequired,
};

// Standings table: ranked participants first, participants still entering last
const ConsistencyTable = ({ rows, entering, onOpenStudent }) => (
  <div className="consistency-table__scroll" role="region" aria-label="Classificação do campeonato" tabIndex={0}>
    <table className="consistency-table">
      <thead>
        <tr>
          {COLUMN_HEADERS.map((header) => (
            <th key={header} scope="col" className="type-caption-strong">{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {[...rows, ...entering].map((row) => (
          <ConsistencyRow key={row.studentId} row={row} onOpenStudent={onOpenStudent} />
        ))}
      </tbody>
    </table>
  </div>
);

ConsistencyTable.propTypes = {
  rows: PropTypes.array.isRequired,
  entering: PropTypes.array.isRequired,
  onOpenStudent: PropTypes.func.isRequired,
};

// Progress line of the header: "Semana X de Y" with the countdown while running, "Encerrado em DD/MM" once closed
const HeaderProgress = ({ data, timeZone, now }) => {
  const { challenge, status, currentWeek, closesAt } = data;
  if (status === CHALLENGE_STATUS.COMPLETED) return <span className="type-body-strong">{closedOnLabelOf(challenge, timeZone)}</span>;
  if (status !== CHALLENGE_STATUS.ACTIVE) return null;
  return (
    <div className="season-header__progress-head type-body">
      <span className="type-body-strong">{weekLabel(currentWeek, challenge.weeks)}</span>
      {closesAt && (
        <span className="season-header__countdown">
          <Clock size={16} strokeWidth={2} aria-hidden="true" />
          {`Fecha ${formatCloseDateLabel(closesAt, timeZone)} · faltam ${formatCountdown(closesAt, now)}`}
        </span>
      )}
    </div>
  );
};

HeaderProgress.propTypes = {
  data: PropTypes.object.isRequired,
  timeZone: PropTypes.string,
  now: PropTypes.oneOfType([PropTypes.instanceOf(Date), PropTypes.string, PropTypes.number]).isRequired,
};

// Championship header: description, dates and weeks, and the progress line
const ChallengeHeader = ({ data, timeZone, now }) => {
  const { challenge } = data;
  const dates = `${dayMonthOf(challenge.startDate)} a ${dayMonthOf(challenge.endDate)} · ${challenge.weeks} semanas`;
  return (
    <section className="section-card season-header" aria-label="Campeonato">
      <span className="season-header__icon" aria-hidden="true">
        <Medal size={24} strokeWidth={2} />
      </span>
      <div className="season-header__identity">
        {challenge.description && <span className="type-body">{challenge.description}</span>}
        <span className="type-caption season-header__dates">{dates}</span>
      </div>
      <div className="season-header__progress">
        <HeaderProgress data={data} timeZone={timeZone} now={now} />
      </div>
    </section>
  );
};

ChallengeHeader.propTypes = {
  data: PropTypes.object.isRequired,
  timeZone: PropTypes.string,
  now: PropTypes.oneOfType([PropTypes.instanceOf(Date), PropTypes.string, PropTypes.number]).isRequired,
};

// Body under the header: scheduled notice, cancelled notice, empty state or the standings table
const StandingsBody = ({ data, onOpenStudent }) => {
  const { challenge, status, rows, entering } = data;
  if (status === CHALLENGE_STATUS.SCHEDULED) {
    return (
      <EmptyBlock
        icon={Users}
        title={`Começa na segunda, ${dayMonthOf(challenge.startDate)}.`}
        description={participantsLabelOf(challenge.participantCount ?? 0)}
      />
    );
  }
  if (status === CHALLENGE_STATUS.CANCELLED) return <EmptyBlock icon={Ban} title="Campeonato cancelado, sem classificação." />;
  if (rows.length === 0 && entering.length === 0) return <EmptyBlock icon={Users} title={EMPTY_MESSAGE} />;
  return <ConsistencyTable rows={rows} entering={entering} onOpenStudent={onOpenStudent} />;
};

StandingsBody.propTypes = {
  data: PropTypes.object.isRequired,
  onOpenStudent: PropTypes.func.isRequired,
};

// Classificação tab of a weekly championship: header, standings with medals, entering participants last, and the loading, error, scheduled, closed and empty states
const ChallengeConsistencyTab = ({ data, loading, error, onRetry, onOpenStudent, timeZone, now = new Date() }) => {
  const retry = <button type="button" className="btn btn--secondary" onClick={onRetry}>Tentar de novo</button>;
  if (error) return <Banner tone="error" action={retry}>{error}</Banner>;
  if (loading && !data) {
    return (
      <section className="section-card">
        <SkeletonRows label="Carregando classificação" count={TABLE_SKELETON_COUNT} />
      </section>
    );
  }
  if (!data) return null;
  return (
    <div className="stack-md">
      <ChallengeHeader data={data} timeZone={timeZone} now={now} />
      <section className="section-card consistency-board">
        <StandingsBody data={data} onOpenStudent={onOpenStudent} />
      </section>
    </div>
  );
};

ChallengeConsistencyTab.propTypes = {
  data: PropTypes.shape({
    challenge: PropTypes.object.isRequired,
    status: PropTypes.string.isRequired,
    currentWeek: PropTypes.number,
    closesAt: PropTypes.string,
    rows: PropTypes.array.isRequired,
    entering: PropTypes.array.isRequired,
  }),
  loading: PropTypes.bool,
  error: PropTypes.string,
  onRetry: PropTypes.func.isRequired,
  onOpenStudent: PropTypes.func.isRequired,
  timeZone: PropTypes.string,
  now: PropTypes.oneOfType([PropTypes.instanceOf(Date), PropTypes.string, PropTypes.number]),
};

export default ChallengeConsistencyTab;
