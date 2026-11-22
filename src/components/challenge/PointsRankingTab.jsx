import { useState } from 'react';
import PropTypes from 'prop-types';
import { Search, Users } from 'lucide-react';
import Avatar from '../ds/Avatar';
import EmptyBlock from '../ds/EmptyBlock';
import MetricCard from '../ds/MetricCard';
import Modal from '../ds/Modal';
import SkeletonRows from '../ds/SkeletonRows';
import RowMenu from '../RowMenu';
import BonusChipGrid from '../BonusChipGrid';
import ChampionshipPodium from './ChampionshipPodium';
import { filterParticipantsByName, pointsKpisOf } from '../../utils/challengeDisplay';
import { dayMonthOf } from '../../utils/consistencyFormat';

const NO_VALUE = '—';
const TABLE_SKELETON_COUNT = 6;
const TIE_BREAK_NOTE = 'Desempate: quem chegou primeiro à pontuação';

// Full name of a ranking entry
const nameOf = (entry) => `${entry.firstName || ''} ${entry.lastName || ''}`.trim() || 'Aluno';

// "N dias" of a day streak, a dash when there is none
const streakOf = (days) => (days > 0 ? `${days} ${days === 1 ? 'dia' : 'dias'}` : NO_VALUE);

// "+N" of the bonus points, a dash when there is none
const bonusOf = (points) => (points > 0 ? `+${points}` : NO_VALUE);

// XP cards summed over the ranking entries
const PointsKpis = ({ entries, startDate }) => {
  const kpis = pointsKpisOf(entries);
  return (
    <div className="metric-grid championship-kpis">
      <MetricCard label="Participantes" value={kpis.participants} support={`${kpis.scoredThisWeek} pontuaram esta semana`} />
      <MetricCard label="Pontos do líder" value={kpis.leaderPoints == null ? NO_VALUE : `${kpis.leaderPoints} pts`} support={kpis.leaderLead == null ? undefined : `${kpis.leaderLead} à frente do 2º lugar`} />
      <MetricCard label="Treinos concluídos" value={kpis.workouts} support={`desde ${dayMonthOf(startDate)}`} />
      <MetricCard label="Bônus concedidos" value={`${kpis.bonusPoints} pts`} support={`para ${kpis.bonusStudents} ${kpis.bonusStudents === 1 ? 'aluno' : 'alunos'}`} />
    </div>
  );
};

PointsKpis.propTypes = {
  entries: PropTypes.array.isRequired,
  startDate: PropTypes.string.isRequired,
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

// Podium place of a ranking entry: points, workouts and the day streak
const podiumPlaceOf = (entry) => ({
  studentId: entry.studentId,
  position: entry.position,
  name: nameOf(entry),
  avatarUrl: entry.avatarUrl,
  score: `${entry.points} pts`,
  support: `${entry.workouts ?? 0} treinos · sequência de ${entry.streakDays ?? 0} dias`,
});

// "Pódio · Quem está na frente" block of the XP ranking
const PodiumBlock = ({ entries }) => (
  <section className="championship-block" aria-label="Pódio">
    <BlockHeading eyebrow="Pódio" title="Quem está na frente" trailing={<span className="championship-block__note type-caption">{TIE_BREAK_NOTE}</span>} />
    <ChampionshipPodium places={entries.slice(0, 3).map(podiumPlaceOf)} />
  </section>
);

PodiumBlock.propTypes = {
  entries: PropTypes.array.isRequired,
};

// One XP row: optional checkbox, position, student, workouts, streak or bonus, points and the row menu
const PointsRow = ({ entry, view }) => (
  <tr className="consistency-row">
    {view.selecting && (
      <td><input type="checkbox" className="challenge-table__check" aria-label={`Selecionar ${nameOf(entry)}`} checked={view.selectedIds.includes(entry.studentId)} onChange={() => view.onToggle(entry.studentId)} /></td>
    )}
    <td className="consistency-row__number type-body-strong">{`${entry.position}º`}</td>
    <td>
      <div className="consistency-row__student">
        <Avatar name={nameOf(entry)} src={entry.avatarUrl || undefined} size="sm" />
        <span className="type-body">{nameOf(entry)}</span>
      </div>
    </td>
    <td className="consistency-row__number">{entry.workouts ?? 0}</td>
    <td className="consistency-row__muted">{view.selecting ? bonusOf(entry.bonusPoints) : streakOf(entry.streakDays)}</td>
    <td className="consistency-row__number"><strong>{entry.points}</strong> <span className="type-caption">pts</span></td>
    {view.menu && (
      <td className="consistency-row__actions">
        <RowMenu ariaLabel={`Ações para ${nameOf(entry)}`} extraItems={[{ label: 'Dar bônus', onClick: () => view.onBonus(entry) }]} onDelete={() => view.onRemove(entry)} deleteLabel="Remover do campeonato" />
      </td>
    )}
  </tr>
);

PointsRow.propTypes = {
  entry: PropTypes.object.isRequired,
  view: PropTypes.object.isRequired,
};

// XP classification table; in selection mode a checkbox column and Bônus instead of Sequência
const PointsTable = ({ entries, view }) => (
  <div className="consistency-table__scroll" role="region" aria-label="Classificação por pontos" tabIndex={0}>
    <table className="consistency-table consistency-table--compact challenge-table">
      <thead>
        <tr>
          {view.selecting && <th scope="col"><span className="visually-hidden">Seleção</span></th>}
          {['Posição', 'Aluno', 'Treinos', view.selecting ? 'Bônus' : 'Sequência', 'Pontos'].map((header) => <th key={header} scope="col" className="type-caption">{header}</th>)}
          {view.menu && <th scope="col"><span className="visually-hidden">Ações</span></th>}
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => <PointsRow key={entry.studentId} entry={entry} view={view} />)}
      </tbody>
    </table>
  </div>
);

PointsTable.propTypes = {
  entries: PropTypes.array.isRequired,
  view: PropTypes.object.isRequired,
};

// Floating bar of the bulk selection: "N selecionados · Dar bônus · Cancelar"
const BulkBar = ({ count, onGive, onCancel }) => (
  <div className="challenge-bulk-bar" role="toolbar" aria-label="Bônus em massa">
    <span className="type-body-strong" role="status">{`${count} ${count === 1 ? 'selecionado' : 'selecionados'}`}</span>
    <button type="button" className="challenge-bulk-bar__button" disabled={count === 0} onClick={onGive}>Dar bônus</button>
    <button type="button" className="challenge-bulk-bar__button" onClick={onCancel}>Cancelar</button>
  </div>
);

BulkBar.propTypes = {
  count: PropTypes.number.isRequired,
  onGive: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

// Bulk selection: chosen students, the bonus sheet and the award (resolving true once given) that exits the selection when it lands
const useBulkBonus = (onSelectingChange, onAwardBulk) => {
  const [selectedIds, setSelectedIds] = useState([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const exit = () => { setSelectedIds([]); setSheetOpen(false); onSelectingChange(false); };
  const toggle = (studentId) => setSelectedIds((ids) => (ids.includes(studentId) ? ids.filter((id) => id !== studentId) : [...ids, studentId]));
  const award = async (points, reason) => {
    setSubmitting(true);
    const awarded = await onAwardBulk(selectedIds, points, reason);
    setSubmitting(false);
    if (awarded) exit();
  };
  return { selectedIds, sheetOpen, submitting, exit, toggle, award, openSheet: () => setSheetOpen(true), closeSheet: () => setSheetOpen(false) };
};

// "Classificação" block: search or the selection title, the XP table, the count and the bulk selection
const ClassificationBlock = ({ entries, closed, readOnly, selecting, onSelectingChange, onBonus, onRemove, onAwardBulk }) => {
  const [query, setQuery] = useState('');
  const bulk = useBulkBonus(onSelectingChange, onAwardBulk);
  const visible = selecting ? entries : filterParticipantsByName(entries, query);
  const toggleSelection = <button type="button" className="btn btn--ghost" onClick={selecting ? bulk.exit : () => onSelectingChange(true)}>{selecting ? 'Cancelar seleção' : 'Seleção em massa'}</button>;
  const view = { selecting, selectedIds: bulk.selectedIds, onToggle: bulk.toggle, menu: !readOnly && !selecting, onBonus, onRemove };
  return (
    <section className="championship-block" aria-label="Classificação">
      <BlockHeading eyebrow={closed ? 'Classificação final' : 'Classificação'} title={selecting ? 'Selecione quem recebe o bônus' : 'Todos os participantes'} trailing={readOnly ? null : toggleSelection} />
      {!readOnly && !selecting && (
        <div className="section-card section-card--compact challenge-search">
          <div className="input--search-wrap">
            <Search size={16} strokeWidth={2} aria-hidden="true" />
            <input type="search" className="input input--search input--on-elevated" placeholder="Buscar aluno" aria-label="Buscar aluno" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
        </div>
      )}
      {visible.length === 0 ? <p className="championship-block__empty type-body">Nenhum participante encontrado.</p> : <PointsTable entries={visible} view={view} />}
      {!readOnly && !selecting && <p className="championship-block__count type-body">{`Mostrando ${visible.length} de ${entries.length} participantes`}</p>}
      {selecting && <BulkBar count={bulk.selectedIds.length} onGive={bulk.openSheet} onCancel={bulk.exit} />}
      {bulk.sheetOpen && (
        <Modal title={`Dar bônus para ${bulk.selectedIds.length} ${bulk.selectedIds.length === 1 ? 'aluno' : 'alunos'}`} onClose={() => !bulk.submitting && bulk.closeSheet()} closeDisabled={bulk.submitting}>
          <BonusChipGrid onAward={bulk.award} disabled={bulk.submitting} />
        </Modal>
      )}
    </section>
  );
};

ClassificationBlock.propTypes = {
  entries: PropTypes.array.isRequired,
  closed: PropTypes.bool.isRequired,
  readOnly: PropTypes.bool.isRequired,
  selecting: PropTypes.bool.isRequired,
  onSelectingChange: PropTypes.func.isRequired,
  onBonus: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onAwardBulk: PropTypes.func.isRequired,
};

// XP ranking tab: the XP cards, the podium when asked (dates championship), the classification with search, row menu and bulk bonus
const PointsRankingTab = ({ entries, loading = false, startDate, showPodium = false, readOnly = false, closed = false, selecting = false, onAddParticipants, ...handlers }) => {
  if (loading) return <SkeletonRows label="Carregando ranking" count={TABLE_SKELETON_COUNT} />;
  if (entries.length === 0) {
    return (
      <section className="section-card">
        <EmptyBlock icon={Users} title="Nenhum aluno no ranking ainda." description="Adicione participantes para o campeonato começar a contar pontos." actionLabel={readOnly ? undefined : 'Adicionar participantes'} onAction={onAddParticipants} />
      </section>
    );
  }
  return (
    <div className="championship-tab">
      <PointsKpis entries={entries} startDate={startDate} />
      {showPodium && !selecting && <PodiumBlock entries={entries} />}
      <ClassificationBlock entries={entries} closed={closed} readOnly={readOnly} selecting={selecting && !readOnly} {...handlers} />
    </div>
  );
};

PointsRankingTab.propTypes = {
  entries: PropTypes.arrayOf(PropTypes.shape({
    position: PropTypes.number.isRequired,
    studentId: PropTypes.string.isRequired,
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    avatarUrl: PropTypes.string,
    points: PropTypes.number.isRequired,
    workouts: PropTypes.number,
    bonusPoints: PropTypes.number,
    pointsThisWeek: PropTypes.number,
    streakDays: PropTypes.number,
  })).isRequired,
  loading: PropTypes.bool,
  startDate: PropTypes.string.isRequired,
  showPodium: PropTypes.bool,
  readOnly: PropTypes.bool,
  closed: PropTypes.bool,
  selecting: PropTypes.bool,
  onSelectingChange: PropTypes.func.isRequired,
  onBonus: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  onAwardBulk: PropTypes.func.isRequired,
  onAddParticipants: PropTypes.func,
};

export default PointsRankingTab;
