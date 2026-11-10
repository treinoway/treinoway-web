import PropTypes from 'prop-types';
import { MessageCircle, Pause, SearchX } from 'lucide-react';
import Avatar from '../ds/Avatar';
import EmptyBlock from '../ds/EmptyBlock';
import FaixaBadge from './FaixaBadge';
import PillarMini from './PillarMini';
import PositionMark from './PositionMark';
import ScoreBar from './ScoreBar';
import StudentSignals from './StudentSignals';
import { formatScore } from '../../utils/consistencyFormat';
import { PILLAR_ABBREVIATIONS, PILLAR_LABELS, PILLAR_ORDER, WARNING_SCORE_THRESHOLD } from '../../constants/consistencyRanking';

const COLUMN_HEADERS = ['Pos.', 'Aluno', 'Faixa', 'Temporada', 'Pilares', 'Semana atual', 'Sem. 100%', 'Sequência', 'Ações'];
const NO_STREAK_PLACEHOLDER = '—';

// "N sem." of the weekly streak, a dash when there is none
const streakLabelOf = (streak) => (streak > 0 ? `${streak} sem.` : NO_STREAK_PLACEHOLDER);

// Legend of the pillar abbreviations in use plus the meaning of the warning bar
const legendOf = (allRows) => {
  const used = new Set(allRows.flatMap((row) => row.seasonPillars.map((item) => item.pillar)));
  const pillars = PILLAR_ORDER.filter((pillar) => used.has(pillar)).map((pillar) => `${PILLAR_ABBREVIATIONS[pillar]} ${PILLAR_LABELS[pillar].toLowerCase()}`);
  const bars = `Barra em alerta = abaixo de ${WARNING_SCORE_THRESHOLD}%.`;
  return pillars.length > 0 ? `${pillars.join(' · ')}. ${bars}` : bars;
};

// WhatsApp and pause icon buttons of a row
const RowActions = ({ row, onMessage, onPause }) => (
  <div className="consistency-row__actions">
    <button type="button" className="icon-button" aria-label={`Mensagem no WhatsApp para ${row.displayName}`} onClick={() => onMessage(row)}>
      <MessageCircle size={20} strokeWidth={2} aria-hidden="true" />
    </button>
    <button type="button" className="icon-button" aria-label={`Pausar semana de ${row.displayName}`} onClick={() => onPause(row)}>
      <Pause size={20} strokeWidth={2} aria-hidden="true" />
    </button>
  </div>
);

RowActions.propTypes = {
  row: PropTypes.object.isRequired,
  onMessage: PropTypes.func.isRequired,
  onPause: PropTypes.func.isRequired,
};

// Pillar bars of a student, or a note while no week has closed
const PillarsCell = ({ pillars }) => {
  if (pillars.length === 0) return <span className="type-body consistency-row__muted">Sem semana fechada</span>;
  return <PillarMini pillars={pillars} />;
};

PillarsCell.propTypes = {
  pillars: PropTypes.array.isRequired,
};

// Student cell: avatar, name that opens the panel, and the badges under it
const StudentCell = ({ row, season, riskLimit, onOpenStudent }) => (
  <div className="consistency-row__student">
    <Avatar name={row.displayName} size="sm" />
    <div className="consistency-row__identity">
      <button type="button" className="consistency-row__open type-body-strong" onClick={() => onOpenStudent(row)}>
        {row.displayName}
      </button>
      <StudentSignals row={row} season={season} riskLimit={riskLimit} />
    </div>
  </div>
);

StudentCell.propTypes = {
  row: PropTypes.object.isRequired,
  season: PropTypes.object.isRequired,
  riskLimit: PropTypes.number,
  onOpenStudent: PropTypes.func.isRequired,
};

// One student row of the standings
const StandingsRow = ({ row, season, riskLimit, onOpenStudent, onMessage, onPause }) => (
  <tr className="consistency-row">
    <td><PositionMark position={row.position} /></td>
    <td><StudentCell row={row} season={season} riskLimit={riskLimit} onOpenStudent={onOpenStudent} /></td>
    <td><FaixaBadge faixa={row.faixa} /></td>
    <td><ScoreBar score={row.average} /></td>
    <td><PillarsCell pillars={row.seasonPillars} /></td>
    <td className="consistency-row__number type-body-strong">{formatScore(row.currentWeekScore)}</td>
    <td className="consistency-row__number type-body-strong">{row.weeks100}</td>
    <td className="consistency-row__number type-body-strong">{streakLabelOf(row.streak)}</td>
    <td><RowActions row={row} onMessage={onMessage} onPause={onPause} /></td>
  </tr>
);

StandingsRow.propTypes = {
  row: PropTypes.object.isRequired,
  season: PropTypes.object.isRequired,
  riskLimit: PropTypes.number,
  onOpenStudent: PropTypes.func.isRequired,
  onMessage: PropTypes.func.isRequired,
  onPause: PropTypes.func.isRequired,
};

// Standings table of the trainer's students: ranked rows first, students still entering last; empty filters offer to clear
const StandingsTable = ({ rows, entering, season, riskLimit, onOpenStudent, onMessage, onPause, onClearFilters }) => {
  const allRows = [...rows, ...entering];
  if (allRows.length === 0) {
    return (
      <EmptyBlock icon={SearchX} title="Nenhum aluno neste filtro." actionLabel="Limpar filtro e busca" onAction={onClearFilters} />
    );
  }
  return (
    <>
      <div className="consistency-table__scroll" role="region" aria-label="Classificação do time" tabIndex={0}>
        <table className="consistency-table">
          <thead>
            <tr>
              {COLUMN_HEADERS.map((header) => (
                <th key={header} scope="col" className="type-caption-strong">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allRows.map((row) => (
              <StandingsRow key={row.studentId} row={row} season={season} riskLimit={riskLimit} onOpenStudent={onOpenStudent} onMessage={onMessage} onPause={onPause} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="consistency-table__legend type-caption">{legendOf(allRows)}</p>
    </>
  );
};

StandingsTable.propTypes = {
  rows: PropTypes.array.isRequired,
  entering: PropTypes.array.isRequired,
  season: PropTypes.object.isRequired,
  riskLimit: PropTypes.number,
  onOpenStudent: PropTypes.func.isRequired,
  onMessage: PropTypes.func.isRequired,
  onPause: PropTypes.func.isRequired,
  onClearFilters: PropTypes.func.isRequired,
};

export default StandingsTable;
