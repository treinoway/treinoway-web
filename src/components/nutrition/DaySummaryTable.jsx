import PropTypes from 'prop-types';
import { DAY_NUTRIENTS, dayStatus } from '../../utils/planView';
import { formatByUnit, formatSigned } from '../../utils/nutritionFormat';

// Short column names for the stacked mobile layout.
const SHORT_LABEL = { kcal: 'kcal', protein: 'PTN', carbs: 'CHO', fat: 'LIP', fiber: 'Fibras' };

// Cell of a goal or difference row; "-" when the goal is unknown.
const valueOrDash = (value, format) => (value == null ? '-' : format(value));

// Meta cell: fiber is a minimum, shown as "≥ 25,0".
const goalText = (nutrient, goal) => valueOrDash(goal, (value) => `${nutrient.isMinimum ? '≥ ' : ''}${formatByUnit(value, nutrient.unit)}`);

// Footer rows of the menu table: total of the day (option 1 of each meal), goal and coloured difference.
const DaySummaryTable = ({ totals, goals }) => (
  <tfoot className="menu-table__foot">
    <tr className="menu-table__total">
      <th scope="row" colSpan={2}>
        Total do dia <span>· opção 1 de cada refeição</span>
      </th>
      {DAY_NUTRIENTS.map((n) => <td key={n.key} className="menu-table__num" data-label={SHORT_LABEL[n.key]}>{formatByUnit(totals[n.key], n.unit)}</td>)}
      <td className="menu-table__remove" />
    </tr>
    <tr className="menu-table__goal">
      <th scope="row" colSpan={2}>Meta</th>
      {DAY_NUTRIENTS.map((n) => <td key={n.key} className="menu-table__num" data-label={SHORT_LABEL[n.key]}>{goalText(n, goals[n.key])}</td>)}
      <td className="menu-table__remove" />
    </tr>
    <tr className="menu-table__diff">
      <th scope="row" colSpan={2}>Diferença</th>
      {DAY_NUTRIENTS.map((n) => {
        const goal = goals[n.key];
        const tone = goal == null || dayStatus(n, totals[n.key], goal) === 'ok' ? 'ok' : 'off';
        return (
          <td key={n.key} className={`menu-table__num menu-table__diff-cell menu-table__diff-cell--${tone}`} data-label={SHORT_LABEL[n.key]}>
            {valueOrDash(goal, (value) => formatSigned(totals[n.key] - value, n.unit))}
          </td>
        );
      })}
      <td className="menu-table__remove" />
    </tr>
  </tfoot>
);

DaySummaryTable.propTypes = {
  totals: PropTypes.object.isRequired,
  goals: PropTypes.object.isRequired,
};

export default DaySummaryTable;
