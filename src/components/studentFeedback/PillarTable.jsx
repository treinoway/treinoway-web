import PropTypes from 'prop-types';
import Badge from '../ds/Badge';
import { formatDateTimeForDisplay } from '../../utils/dateFormat';
import { buildOverallCells, buildPillarRows, deltaToneOf, formatDelta, formatScore, milestoneLabelOf } from '../../utils/studentFeedback';
import { t } from '../../i18n';

const MOBILE_COLUMN_COUNT = 2;

// Class that keeps only the most recent milestones on a phone; older columns show from the tablet up
const columnClassOf = (index, total) => (index < total - MOBILE_COLUMN_COUNT ? 'table-col-desktop-only' : '');

// One score of the table with the variation against the previous answered milestone
const ScoreCell = ({ cell, className }) => (
  <td className={className}>
    <span className="student-feedback-index">
      <span className="student-feedback-index__value">{formatScore(cell.score)}</span>
      {cell.delta !== null && (
        <>
          {' '}
          <Badge variant="tag" tone={deltaToneOf(cell.delta)}>{formatDelta(cell.delta)}</Badge>
        </>
      )}
    </span>
  </td>
);

ScoreCell.propTypes = {
  cell: PropTypes.shape({ score: PropTypes.number, delta: PropTypes.number }).isRequired,
  className: PropTypes.string,
};

// One row of the table: its name and one score per answered milestone
const ScoreRow = ({ label, cells }) => (
  <tr>
    <th scope="row" className="type-body-strong">{label}</th>
    {cells.map((cell, index) => (
      <ScoreCell key={index} cell={cell} className={columnClassOf(index, cells.length)} />
    ))}
  </tr>
);

ScoreRow.propTypes = {
  label: PropTypes.string.isRequired,
  cells: PropTypes.arrayOf(PropTypes.object).isRequired,
};

// Pillars as rows and answered milestones as columns, closed by the overall index
const PillarTable = ({ answered }) => (
  <div className="student-feedback-scroll">
    <table className="admin-table student-feedback-table student-feedback-pillars type-body" aria-label={t('studentFeedback.history.pillarsTitle')}>
      <thead>
        <tr>
          <th scope="col" className="type-caption-strong">{t('studentFeedback.history.pillarColumn')}</th>
          {answered.map((feedback, index) => (
            <th key={feedback.id} scope="col" className={`type-caption-strong ${columnClassOf(index, answered.length)}`}>
              {milestoneLabelOf(feedback)}
              {' '}
              <span className="admin-table__sub type-caption">{formatDateTimeForDisplay(feedback.submittedAt)}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {buildPillarRows(answered).map((row) => (
          <ScoreRow key={row.pillar} label={row.label} cells={row.cells} />
        ))}
        <ScoreRow label={t('studentFeedback.history.overallIndex')} cells={buildOverallCells(answered)} />
      </tbody>
    </table>
  </div>
);

PillarTable.propTypes = {
  answered: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default PillarTable;
