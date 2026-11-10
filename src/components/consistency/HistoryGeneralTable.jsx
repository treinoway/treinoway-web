import PropTypes from 'prop-types';
import { History } from 'lucide-react';
import Avatar from '../ds/Avatar';
import EmptyBlock from '../ds/EmptyBlock';
import ScoreBar from './ScoreBar';

const COLUMN_HEADERS = ['Aluno', 'Média desde a entrada', 'Semanas a 100%', 'Maior sequência'];
const NO_STREAK_PLACEHOLDER = '—';

// "N sem." of the longest streak, a dash when there is none
const streakLabelOf = (streak) => (streak > 0 ? `${streak} sem.` : NO_STREAK_PLACEHOLDER);

// One student of the general history
const HistoryRow = ({ row }) => (
  <tr className="consistency-row">
    <td>
      <div className="consistency-row__student">
        <Avatar name={row.displayName} size="sm" />
        <span className="type-body-strong">{row.displayName}</span>
      </div>
    </td>
    <td><ScoreBar score={row.average} label="Média desde a entrada" /></td>
    <td className="consistency-row__number type-body-strong">{row.weeks100}</td>
    <td className="consistency-row__number type-body-strong">{streakLabelOf(row.longestStreak)}</td>
  </tr>
);

HistoryRow.propTypes = {
  row: PropTypes.shape({
    displayName: PropTypes.string.isRequired,
    average: PropTypes.number,
    weeks100: PropTypes.number.isRequired,
    longestStreak: PropTypes.number.isRequired,
  }).isRequired,
};

// General history tab: average of every valid week since joining, weeks at 100% and longest streak, in the order received
const HistoryGeneralTable = ({ rows }) => {
  if (rows.length === 0) {
    return <EmptyBlock icon={History} title="Ainda não há alunos com 4 semanas válidas." />;
  }
  return (
    <>
      <div className="consistency-table__scroll" role="region" aria-label="Histórico geral do time" tabIndex={0}>
        <table className="consistency-table consistency-table--compact">
          <thead>
            <tr>
              {COLUMN_HEADERS.map((header) => (
                <th key={header} scope="col" className="type-caption-strong">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <HistoryRow key={row.studentId} row={row} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="consistency-table__legend type-caption">Alunos com 4 ou mais semanas válidas, ordenados pela média.</p>
    </>
  );
};

HistoryGeneralTable.propTypes = {
  rows: PropTypes.array.isRequired,
};

export default HistoryGeneralTable;
