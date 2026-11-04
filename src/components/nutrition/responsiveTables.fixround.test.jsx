import { render, screen, within } from '../../test/test-utils';
import MacroTargetsCard from './MacroTargetsCard';
import { buildGoals } from '../../test/nutritionFixtures';
import { macroTargets } from '../../utils/nutritionCalc';

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: { items: [] } }), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const DESKTOP_ONLY = 'table-col-desktop-only';

// Test helper: header cells of the table.
const headerCells = (table) => Array.from(table.querySelectorAll('thead tr:first-child > *'));
// Test helper: body and footer rows of the table.
const bodyRows = (table) => Array.from(table.querySelectorAll('tbody tr, tfoot tr'));

// Rule 7: at 375px some columns are hidden, the identity column never is, and every cell of a hidden column is hidden with its header.
const expectProgressiveColumns = (table) => {
  const headers = headerCells(table);
  const hiddenIndexes = headers.flatMap((cell, index) => (cell.classList.contains(DESKTOP_ONLY) ? [index] : []));
  expect(hiddenIndexes.length).toBeGreaterThan(0);
  expect(hiddenIndexes).not.toContain(0);
  bodyRows(table).forEach((row) => {
    const cells = Array.from(row.children);
    expect(cells[0].classList.contains(DESKTOP_ONLY)).toBe(false);
    hiddenIndexes.forEach((index) => expect(cells[index]?.classList.contains(DESKTOP_ONLY)).toBe(true));
  });
};

describe('responsive tables at 375px (Rule 7, fix round)', () => {
  it('MacroTargetsCard macro table hides a column on mobile and keeps the editable g/kg field visible', () => {
    const goals = buildGoals({ kcalTarget: 1550 });
    const macros = macroTargets({ ...goals, kcal: goals.kcalTarget }, 66);
    render(<MacroTargetsCard goals={goals} macros={macros} weightKg={66} suggestion={1533} onChange={vi.fn()} />);

    const table = screen.getByRole('table');
    expectProgressiveColumns(table);
    const proteinRow = within(table).getByRole('row', { name: /Proteína/ });
    expect(within(proteinRow).getByLabelText('Proteína (g/kg)').closest('td').classList.contains(DESKTOP_ONLY)).toBe(false);
  });
});
