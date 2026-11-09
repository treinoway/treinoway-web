import { render, screen, within } from '../../test/test-utils';
import DaySummaryTable from './DaySummaryTable';
import { nutrients } from '../../test/nutritionFixtures';

const GOALS = { kcal: 400, protein: 40, carbs: 80, fat: 4, fiber: 25 };

// Test helper: renders the footer rows inside a table.
const renderRows = (totals, goals) => render(<table><DaySummaryTable totals={totals} goals={goals} /></table>);

describe('DaySummaryTable', () => {
  it('shows total, goal and signed difference', () => {
    renderRows(nutrients(500, 25, 80, 4, 8), GOALS);
    expect(within(screen.getByRole('row', { name: /Total do dia/ })).getByText('500')).toBeInTheDocument();
    expect(screen.getByText('· opção 1 de cada refeição')).toBeInTheDocument();
    expect(within(screen.getByRole('row', { name: /^Meta/ })).getByText('400')).toBeInTheDocument();
    const difference = screen.getByRole('row', { name: /Diferença/ });
    expect(within(difference).getByText('+100')).toBeInTheDocument();
    expect(within(difference).getByText('−15,0')).toBeInTheDocument();
  });

  it('shows the fiber goal as a minimum', () => {
    renderRows(nutrients(500, 25, 80, 4, 8), GOALS);
    expect(within(screen.getByRole('row', { name: /^Meta/ })).getByText('≥ 25,0')).toBeInTheDocument();
  });

  it('colours the difference: on target is brand, off target is accent', () => {
    renderRows(nutrients(500, 40, 80, 4, 30), GOALS);
    const difference = screen.getByRole('row', { name: /Diferença/ });
    expect(within(difference).getByText('+100')).toHaveClass('menu-table__diff-cell--off');
    within(difference).getAllByText('0,0').forEach((cell) => expect(cell).toHaveClass('menu-table__diff-cell--ok'));
    expect(within(difference).getByText('+5,0')).toHaveClass('menu-table__diff-cell--ok');
  });

  it('shows "-" where the goal is unknown', () => {
    renderRows(nutrients(500, 25, 80, 4, 8), { kcal: 400, protein: null, carbs: null, fat: null, fiber: null });
    expect(within(screen.getByRole('row', { name: /^Meta/ })).getAllByText('-')).toHaveLength(4);
  });
});
