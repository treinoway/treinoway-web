import { useState } from 'react';
import PropTypes from 'prop-types';
import { Calendar, Lock, Search, Users } from 'lucide-react';
import Avatar from '../ds/Avatar';
import Badge from '../ds/Badge';
import Banner from '../ds/Banner';
import ConfirmDialog from '../ds/ConfirmDialog';
import EmptyBlock from '../ds/EmptyBlock';
import MetricCard from '../ds/MetricCard';
import SkeletonRows from '../ds/SkeletonRows';
import RowMenu from '../RowMenu';
import FaixaBadge from '../consistency/FaixaBadge';
import ScoreBar from '../consistency/ScoreBar';
import ChampionshipPodium from './ChampionshipPodium';
import useConfirmDialog from '../../hooks/useConfirmDialog';
import { filterParticipantsByName } from '../../utils/challengeDisplay';
import { dayMonthOf, formatCloseDateLabel, formatCountdown, formatScore } from '../../utils/consistencyFormat';
import { CHALLENGE_STATUS } from '../../constants/challenge';

const COLUMN_HEADERS = Object.freeze(['Posição', 'Aluno', 'Faixa', 'Média', 'Semana atual', 'Semanas a 100%', 'Sequência']);
const NO_VALUE = '—';
const TABLE_SKELETON_COUNT = 6;
const TIE_BREAK_NOTE = 'Desempate: maior média, depois mais semanas a 100% e maior sequência';

// "1 semana" / "N semanas"
const weeksOf = (count) => `${count} ${count === 1 ? 'semana' : 'semanas'}`;

// Position as plain text ("1º"), a dash while entering, as ds-campeonato-ranking.png draws it
const positionOf = (row) => (row.position == null ? NO_VALUE : `${row.position}º`);

// Name shown for a standings row
const nameOf = (row) => row.displayName || row.name;

// Closed notice dated with the championship end date (its last Sunday), not the day the standings froze
const closedNoticeOf = (challenge) => `Campeonato encerrado em ${dayMonthOf(challenge.endDate)}. O ranking é final e não pode ser editado.`;

// Locked notice of a closed championship, with the lock icon of the design system
const LockedNotice = ({ children }) => (
  <div className="ds-banner ds-banner--inline challenge-locked-notice" role="note">
    <span className="ds-banner__icon" aria-hidden="true"><Lock size={20} strokeWidth={2} /></span>
    <p className="ds-banner__text type-body">{children}</p>
  </div>
);

LockedNotice.propTypes = {
  children: PropTypes.node.isRequired,
};

// Small heading of a block: sentence-case eyebrow, title and an optional trailing node
const BlockHeading = ({ eyebrow, title, trailing = null }) => (
  <div className="championship-block__head">
    <div className="championship-block__titles">
      <span className="championship-block__eyebrow type-caption-strong">{eyebrow}</span>
      <h2 className="championship-block__title type-h3">{title}</h2>
    </div>
    {trailing}
  </div>
);

BlockHeading.propTypes = {
  eyebrow: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  trailing: PropTypes.node,
};

// "Semana" card: "X de Y" with the close and the countdown while running
const WeekCard = ({ data, timeZone, now }) => {
  const { challenge, status, currentWeek, closesAt } = data;
  const running = status === CHALLENGE_STATUS.ACTIVE && closesAt;
  const support = running ? `Fecha ${formatCloseDateLabel(closesAt, timeZone)} · faltam ${formatCountdown(closesAt, now)}` : undefined;
  return <MetricCard label="Semana" value={`${currentWeek ?? challenge.weeks} de ${challenge.weeks}`} support={support} />;
};

WeekCard.propTypes = {
  data: PropTypes.object.isRequired,
  timeZone: PropTypes.string,
  now: PropTypes.oneOfType([PropTypes.instanceOf(Date), PropTypes.string, PropTypes.number]).isRequired,
};

// Consistency cards from the summary: participants, leader average, championship average and the week
const ConsistencyKpis = ({ data, timeZone, now }) => {
  const summary = data.summary ?? { classified: data.rows.length, entering: data.entering.length };
  const lead = summary.leaderLead == null ? undefined : `${Math.round(summary.leaderLead)} pontos à frente do 2º lugar`;
  return (
    <div className="metric-grid championship-kpis">
      <MetricCard label="Participantes" value={data.challenge.participantCount ?? summary.classified + summary.entering} support={`${summary.classified} classificados · ${summary.entering} entrando`} />
      <MetricCard label="Média do líder" value={formatScore(summary.leaderAverage)} support={lead} />
      <MetricCard label="Média do campeonato" value={formatScore(summary.championshipAverage)} support="média dos classificados" />
      <WeekCard data={data} timeZone={timeZone} now={now} />
    </div>
  );
};

ConsistencyKpis.propTypes = {
  data: PropTypes.object.isRequired,
  timeZone: PropTypes.string,
  now: PropTypes.oneOfType([PropTypes.instanceOf(Date), PropTypes.string, PropTypes.number]).isRequired,
};

// Podium place of a classified row: championship average, weeks at 100% and the streak
const podiumPlaceOf = (row) => ({
  studentId: row.studentId,
  position: row.position,
  name: nameOf(row),
  score: formatScore(row.average),
  support: `${weeksOf(row.weeks100)} a 100% · sequência de ${weeksOf(row.streak)}`,
});

// "Pódio · Quem está na frente" block with the tie-break note
const PodiumBlock = ({ rows }) => (
  <section className="championship-block" aria-label="Pódio">
    <BlockHeading eyebrow="Pódio" title="Quem está na frente" trailing={<span className="championship-block__note type-caption">{TIE_BREAK_NOTE}</span>} />
    <ChampionshipPodium places={rows.slice(0, 3).map(podiumPlaceOf)} />
  </section>
);

PodiumBlock.propTypes = {
  rows: PropTypes.array.isRequired,
};

// Student cell: avatar, the name that opens the student panel (stretched over the row) and the entering progress
const StudentCell = ({ row, onOpenStudent }) => (
  <div className="consistency-row__student">
    <Avatar name={row.name} size="sm" />
    <div className="consistency-row__identity">
      <button type="button" className="consistency-row__open type-body-strong" onClick={() => onOpenStudent(row)}>{nameOf(row)}</button>
      {row.entering && <Badge variant="tag" tone="neutral">{`Entrando · ${row.entering.validWeeks} de ${row.entering.required} semanas`}</Badge>}
    </div>
  </div>
);

StudentCell.propTypes = {
  row: PropTypes.object.isRequired,
  onOpenStudent: PropTypes.func.isRequired,
};

// Row menu: Dar bônus, Ver pontos and Remover do campeonato
const RowActions = ({ row, actions }) => (
  <RowMenu
    ariaLabel={`Ações para ${nameOf(row)}`}
    extraItems={[
      { label: 'Dar bônus', onClick: () => actions.onBonus(row) },
      { label: 'Ver pontos', onClick: () => actions.onViewPoints(row) },
    ]}
    onDelete={() => actions.onRemove(row)}
    deleteLabel="Remover do campeonato"
  />
);

RowActions.propTypes = {
  row: PropTypes.object.isRequired,
  actions: PropTypes.object.isRequired,
};

// One standings row: position, student, band, average, current week, weeks at 100%, streak and the menu
const StandingsRow = ({ row, actions }) => (
  <tr className="consistency-row">
    <td className="consistency-row__number type-body-strong">{positionOf(row)}</td>
    <td><StudentCell row={row} onOpenStudent={actions.onOpenStudent} /></td>
    <td><FaixaBadge faixa={row.faixa} /></td>
    <td><ScoreBar score={row.average} label="Média no campeonato" /></td>
    <td className="consistency-row__number type-body-strong">{formatScore(row.currentWeekScore)}</td>
    <td className="consistency-row__number type-body-strong">{row.weeks100}</td>
    <td className="consistency-row__number type-body-strong">{row.streak > 0 ? weeksOf(row.streak) : NO_VALUE}</td>
    {actions.menu && <td className="consistency-row__actions"><RowActions row={row} actions={actions} /></td>}
  </tr>
);

StandingsRow.propTypes = {
  row: PropTypes.object.isRequired,
  actions: PropTypes.object.isRequired,
};

// Standings table: classified rows first, the entering ones last
const StandingsTable = ({ rows, actions }) => (
  <div className="consistency-table__scroll" role="region" aria-label="Classificação do campeonato" tabIndex={0}>
    <table className="consistency-table challenge-table">
      <thead>
        <tr>
          {COLUMN_HEADERS.map((header) => <th key={header} scope="col" className="type-caption">{header}</th>)}
          {actions.menu && <th scope="col"><span className="visually-hidden">Ações</span></th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => <StandingsRow key={row.studentId} row={row} actions={actions} />)}
      </tbody>
    </table>
  </div>
);

StandingsTable.propTypes = {
  rows: PropTypes.array.isRequired,
  actions: PropTypes.object.isRequired,
};

// "Buscar aluno" field of the standings
const SearchField = ({ value, onChange }) => (
  <div className="section-card section-card--compact challenge-search">
    <div className="input--search-wrap">
      <Search size={16} strokeWidth={2} aria-hidden="true" />
      <input type="search" className="input input--search input--on-elevated" placeholder="Buscar aluno" aria-label="Buscar aluno" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  </div>
);

SearchField.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

// "Classificação · Todos os participantes" with search, the rows found and "Mostrando N de M participantes"; read-only once closed
const ClassificationBlock = ({ data, actions, closed }) => {
  const [query, setQuery] = useState('');
  const all = [...data.rows, ...data.entering];
  const visible = filterParticipantsByName(all, query);
  return (
    <section className="championship-block" aria-label="Classificação">
      <BlockHeading eyebrow={closed ? 'Classificação final' : 'Classificação'} title="Todos os participantes" />
      {!closed && <SearchField value={query} onChange={setQuery} />}
      {visible.length === 0
        ? <p className="championship-block__empty type-body">Nenhum participante encontrado.</p>
        : <StandingsTable rows={visible} actions={{ ...actions, menu: !closed }} />}
      {!closed && <p className="championship-block__count type-body" role="status">{`Mostrando ${visible.length} de ${all.length} participantes`}</p>}
    </section>
  );
};

ClassificationBlock.propTypes = {
  data: PropTypes.object.isRequired,
  actions: PropTypes.object.isRequired,
  closed: PropTypes.bool.isRequired,
};

// Scheduled block: start date, why the ranking is empty, "Ajustar regras" and "Excluir campeonato"
const ScheduledBlock = ({ challenge, onAdjustRules, onDelete }) => (
  <section className="section-card">
    <div className="empty-block">
      <span className="empty-block__icon" aria-hidden="true"><Calendar size={32} strokeWidth={2} /></span>
      <h2 className="empty-block__title type-h4">{`O campeonato começa em ${dayMonthOf(challenge.startDate)}`}</h2>
      <p className="empty-block__description type-body">O ranking aparece quando os participantes pontuarem pela primeira vez. Até lá, as regras de pontuação ainda podem ser ajustadas.</p>
      <div className="ds-actions championship-state__actions">
        <button type="button" className="btn btn--neutral" onClick={onAdjustRules}>Ajustar regras</button>
        <button type="button" className="btn btn--danger" onClick={onDelete}>Excluir campeonato</button>
      </div>
    </div>
  </section>
);

ScheduledBlock.propTypes = {
  challenge: PropTypes.object.isRequired,
  onAdjustRules: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

// Empty block of a championship without participants (with "Adicionar participantes" while it can change) or without any valid week
const NoStandingsBlock = ({ noParticipants, onAddParticipants }) => (
  <section className="section-card">
    {noParticipants ? (
      <EmptyBlock icon={Users} title="Nenhum aluno no ranking ainda." description="Adicione participantes para o campeonato começar a contar pontos." actionLabel={onAddParticipants ? 'Adicionar participantes' : undefined} onAction={onAddParticipants} />
    ) : (
      <EmptyBlock icon={Users} title="Nenhum participante com semana válida ainda." />
    )}
  </section>
);

NoStandingsBlock.propTypes = {
  noParticipants: PropTypes.bool.isRequired,
  onAddParticipants: PropTypes.func,
};

// Body of a running or closed championship: the empty states, or the cards, the podium and the classification
const StandingsBody = ({ data, timeZone, now, actions, onAddParticipants }) => {
  const closed = data.status === CHALLENGE_STATUS.COMPLETED;
  const noParticipants = (data.challenge.participantCount ?? 0) === 0;
  if (noParticipants || data.rows.length + data.entering.length === 0) {
    return <NoStandingsBlock noParticipants={noParticipants} onAddParticipants={closed ? undefined : onAddParticipants} />;
  }
  return (
    <>
      <ConsistencyKpis data={data} timeZone={timeZone} now={now} />
      {data.rows.length > 0 && <PodiumBlock rows={data.rows} />}
      <ClassificationBlock data={data} actions={actions} closed={closed} />
    </>
  );
};

StandingsBody.propTypes = {
  data: PropTypes.object.isRequired,
  timeZone: PropTypes.string,
  now: PropTypes.oneOfType([PropTypes.instanceOf(Date), PropTypes.string, PropTypes.number]).isRequired,
  actions: PropTypes.object.isRequired,
  onAddParticipants: PropTypes.func,
};

// Ranking tab of a weekly championship: consistency cards, podium and classification with search, plus the loading, error, scheduled, empty and closed states (no participants wins over scheduled, CPD-47)
const ConsistencyRankingTab = ({ data, loading, error, onRetry, timeZone, now = new Date(), onAdjustRules, onDelete, onAddParticipants, ...actions }) => {
  const { dialogProps, requestConfirm } = useConfirmDialog();
  if (error) return <Banner tone="error" action={<button type="button" className="btn btn--secondary" onClick={onRetry}>Tentar de novo</button>}>{error}</Banner>;
  if (loading && !data) return <SkeletonRows label="Carregando classificação" count={TABLE_SKELETON_COUNT} />;
  if (!data) return null;
  const handleDelete = () => requestConfirm({ message: `Excluir o campeonato "${data.challenge.name}"? Esta ação não pode ser desfeita.`, confirmLabel: 'Excluir', onConfirm: onDelete });
  const showScheduled = data.status === CHALLENGE_STATUS.SCHEDULED && (data.challenge.participantCount ?? 0) > 0;
  return (
    <div className="championship-tab">
      {data.status === CHALLENGE_STATUS.COMPLETED && <LockedNotice>{closedNoticeOf(data.challenge)}</LockedNotice>}
      {showScheduled
        ? <ScheduledBlock challenge={data.challenge} onAdjustRules={onAdjustRules} onDelete={handleDelete} />
        : <StandingsBody data={data} timeZone={timeZone} now={now} actions={actions} onAddParticipants={onAddParticipants} />}
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </div>
  );
};

ConsistencyRankingTab.propTypes = {
  data: PropTypes.shape({
    challenge: PropTypes.object.isRequired,
    status: PropTypes.string.isRequired,
    currentWeek: PropTypes.number,
    closesAt: PropTypes.string,
    rows: PropTypes.array.isRequired,
    entering: PropTypes.array.isRequired,
    summary: PropTypes.object,
  }),
  loading: PropTypes.bool,
  error: PropTypes.string,
  onRetry: PropTypes.func.isRequired,
  timeZone: PropTypes.string,
  now: PropTypes.oneOfType([PropTypes.instanceOf(Date), PropTypes.string, PropTypes.number]),
  onOpenStudent: PropTypes.func.isRequired,
  onBonus: PropTypes.func.isRequired,
  onViewPoints: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onAdjustRules: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onAddParticipants: PropTypes.func,
};

export default ConsistencyRankingTab;
