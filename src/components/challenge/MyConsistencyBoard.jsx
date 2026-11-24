import PropTypes from 'prop-types';
import { Calendar, EyeOff } from 'lucide-react';
import EmptyBlock from '../ds/EmptyBlock';
import FaixaBadge from '../consistency/FaixaBadge';
import ChampionshipPodium from './ChampionshipPodium';
import { ordinalOf } from '../../utils/challengeDisplay';
import { dayMonthOf, formatScore } from '../../utils/consistencyFormat';
import { CHALLENGE_VISIBILITY } from '../../constants/challenge';
import { FAIXA_LABELS } from '../../constants/consistencyRanking';

const ME_LABEL = 'Você';

// Name of a row as the student reads it: "Você" on the own row, the anonymized display name otherwise
const rowNameOf = (row) => (row.isMe ? ME_LABEL : row.displayName);

// "1 de 2 semanas para disputar o pódio" of an entering participant
const enteringLineOf = (row) => `${row.validWeeks} de ${row.required ?? row.validWeeks + row.weeksMissing} semanas para disputar o pódio`;

// Podium place of a row: average as the score, band (and the shared mark) as the support line
const podiumPlaceOf = (row) => ({
  studentId: row.key,
  position: row.position,
  name: rowNameOf(row),
  avatarUrl: row.avatarUrl,
  score: formatScore(row.average),
  support: [FAIXA_LABELS[row.faixa], row.shared ? `${row.position}º dividido` : null].filter(Boolean).join(' · '),
});

// Classified rows of the loaded pages, with the student's own row appended when it is not among them
const classifiedRowsOf = (board) => {
  const own = board.neighbors.find((row) => row.isMe);
  const hasOwn = board.items.some((row) => row.isMe);
  return own && !hasOwn ? [...board.items, own] : board.items;
};

// One row: position, name ("Você" highlighted), band tag and the championship average
const BoardRow = ({ row, support = null }) => (
  <li className={`my-ranking-row${row.isMe ? ' my-ranking-row--me' : ''}`} aria-current={row.isMe ? 'true' : undefined}>
    <span className="my-ranking-row__position type-body-strong">{ordinalOf(row.position)}</span>
    <span className="my-ranking-row__identity">
      <span className="my-ranking-row__name type-body">{rowNameOf(row)}</span>
      {support && <span className="my-ranking-row__support type-caption">{support}</span>}
    </span>
    <span className="my-ranking-row__band"><FaixaBadge faixa={row.faixa} variant="tag" /></span>
    <span className="my-ranking-row__value type-body">{formatScore(row.average)}</span>
  </li>
);

BoardRow.propTypes = {
  row: PropTypes.object.isRequired,
  support: PropTypes.string,
};

// White card with a title over a list of rows
const RowsCard = ({ title, children, footer = null }) => (
  <section className="section-card my-ranking-card" aria-label={title}>
    <h2 className="my-ranking-card__title type-h3">{title}</h2>
    <ol className="my-ranking-list">{children}</ol>
    {footer}
  </section>
);

RowsCard.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  footer: PropTypes.node,
};

// "Clube 100%": every participant at 100% stacked in place of the podium
const Club100 = ({ club }) => (
  <section className="section-card my-ranking-card" aria-label="Clube 100%">
    <h2 className="my-ranking-card__title type-h3">Clube 100%</h2>
    <p className="my-ranking-card__note type-body">{`${club.total} participantes com média 100% no campeonato`}</p>
    <ol className="my-ranking-list">{club.members.map((row) => <BoardRow key={row.key} row={row} />)}</ol>
  </section>
);

Club100.propTypes = {
  club: PropTypes.shape({ total: PropTypes.number.isRequired, members: PropTypes.array.isRequired }).isRequired,
};

// Podium (or Clube 100%) with the tie sentence
const PodiumBlock = ({ board }) => {
  if (board.club100) return <Club100 club={board.club100} />;
  if (!board.podium?.length) return null;
  return (
    <section className="my-ranking-podium" aria-label="Pódio">
      <ChampionshipPodium places={board.podium.map(podiumPlaceOf)} />
      {board.tieSentence && <p className="my-ranking-card__note type-caption">{board.tieSentence}</p>}
    </section>
  );
};

PodiumBlock.propTypes = {
  board: PropTypes.object.isRequired,
};

// "Ver mais" while there are pages of the classified list left
const LoadMore = ({ board, loadingMore, onLoadMore }) => {
  if (!onLoadMore || board.page >= board.totalPages) return null;
  return (
    <button type="button" className="btn btn--neutral my-ranking-card__more" onClick={onLoadMore} disabled={loadingMore}>
      {loadingMore ? 'Carregando...' : 'Ver mais'}
    </button>
  );
};

LoadMore.propTypes = {
  board: PropTypes.object.isRequired,
  loadingMore: PropTypes.bool,
  onLoadMore: PropTypes.func,
};

// Full visibility: podium, the classified list with the "Você" row, and the participants still entering
const FullBoard = ({ board, loadingMore, onLoadMore }) => {
  const classified = classifiedRowsOf(board);
  return (
    <>
      <PodiumBlock board={board} />
      {classified.length > 0 && (
        <RowsCard title="Ranking" footer={<LoadMore board={board} loadingMore={loadingMore} onLoadMore={onLoadMore} />}>
          {classified.map((row) => <BoardRow key={row.key} row={row} />)}
        </RowsCard>
      )}
      {board.entering.length > 0 && (
        <RowsCard title="Entrando no campeonato">
          {board.entering.map((row) => <BoardRow key={row.key} row={row} support={enteringLineOf(row)} />)}
        </RowsCard>
      )}
    </>
  );
};

FullBoard.propTypes = {
  board: PropTypes.object.isRequired,
  loadingMore: PropTypes.bool,
  onLoadMore: PropTypes.func,
};

// "Só a posição": the student's own position and band, without the list
const PositionOnly = ({ me }) => (
  <section className="section-card my-ranking-card" aria-label="Sua posição">
    <p className="my-ranking-card__position type-body-lg">
      {me?.position == null ? 'Você ainda está entrando no campeonato.' : `Você está em ${me.position}º de ${me.total}`}
    </p>
    <FaixaBadge faixa={me?.faixa} variant="tag" />
  </section>
);

PositionOnly.propTypes = {
  me: PropTypes.object,
};

// White card with an empty state
const EmptyCard = ({ icon, title, description }) => (
  <section className="challenges-empty">
    <EmptyBlock icon={icon} title={title} description={description} />
  </section>
);

EmptyCard.propTypes = {
  icon: PropTypes.elementType.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
};

// Consistency classification of a weekly championship as the student sees it, already anonymized by the service, with its visibility applied
const MyConsistencyBoard = ({ data, loadingMore = false, onLoadMore }) => {
  if (data.visibility === CHALLENGE_VISIBILITY.OFF) {
    return <EmptyCard icon={EyeOff} title="O ranking deste campeonato está desligado." description="Seu treinador escolheu não mostrar a classificação." />;
  }
  if (data.visibility === CHALLENGE_VISIBILITY.POSITION) return <PositionOnly me={data.me} />;
  if (!data.board) {
    return <EmptyCard icon={Calendar} title={`O campeonato começa em ${dayMonthOf(data.challenge.startDate)}.`} description="A classificação aparece depois da primeira semana." />;
  }
  return <div className="my-ranking"><FullBoard board={data.board} loadingMore={loadingMore} onLoadMore={onLoadMore} /></div>;
};

MyConsistencyBoard.propTypes = {
  data: PropTypes.shape({
    challenge: PropTypes.shape({ startDate: PropTypes.string }).isRequired,
    visibility: PropTypes.oneOf(Object.values(CHALLENGE_VISIBILITY)).isRequired,
    me: PropTypes.object,
    board: PropTypes.shape({
      podium: PropTypes.array,
      club100: PropTypes.object,
      tieSentence: PropTypes.string,
      neighbors: PropTypes.array.isRequired,
      entering: PropTypes.array.isRequired,
      items: PropTypes.array.isRequired,
      page: PropTypes.number,
      totalPages: PropTypes.number,
    }),
  }).isRequired,
  loadingMore: PropTypes.bool,
  onLoadMore: PropTypes.func,
};

export default MyConsistencyBoard;
