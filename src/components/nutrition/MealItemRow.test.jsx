import userEvent from '@testing-library/user-event';
import { render, screen, within } from '../../test/test-utils';
import MealItemRow from './MealItemRow';
import { buildItem } from '../../test/nutritionFixtures';

// Test helper: renders the row inside a table.
const renderRow = (props = {}) => render(
  <table>
    <tbody>
      <MealItemRow item={buildItem()} quantityText="100" onQuantityChange={vi.fn()} onRemove={vi.fn()} {...props} />
    </tbody>
  </table>,
);

describe('MealItemRow', () => {
  it('shows name, measure, source and the nutrients', () => {
    renderRow();
    const row = screen.getByRole('row');
    expect(within(row).getByText('TACO')).toBeInTheDocument();
    expect(within(row).getByText('1 fatia média')).toBeInTheDocument();
    ['100', '10,0', '20,0', '1,0', '2,0'].forEach((value) => expect(within(row).getByText(value)).toBeInTheDocument());
  });

  it('tags TBCA foods as TBCA', () => {
    renderRow({ item: buildItem({ source: 'tbca' }) });
    expect(screen.getByText('TBCA')).toBeInTheDocument();
  });

  it('shows the unit next to the quantity', () => {
    renderRow({ item: buildItem({ unit: 'ml' }) });
    expect(screen.getByText('ml')).toBeInTheDocument();
  });

  it('labels custom foods as "Meus alimentos"', () => {
    renderRow({ item: buildItem({ source: 'custom' }) });
    expect(screen.getByText('Meus alimentos')).toBeInTheDocument();
  });

  it('reports quantity edits with the item id and the typed text', async () => {
    const user = userEvent.setup();
    const onQuantityChange = vi.fn();
    renderRow({ onQuantityChange, quantityText: '' });
    await user.type(screen.getByLabelText('Quantidade de cuscuz de milho cozido'), '5');
    expect(onQuantityChange).toHaveBeenCalledWith('item-1', '5');
  });

  it('removes the item', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    renderRow({ onRemove });
    await user.click(screen.getByRole('button', { name: 'Remover cuscuz de milho cozido' }));
    expect(onRemove).toHaveBeenCalledWith(expect.objectContaining({ id: 'item-1' }));
  });

  it('offers no per-item substitute action (swaps live in the plan summary)', () => {
    renderRow();
    expect(screen.queryByRole('button', { name: /Substituta/ })).not.toBeInTheDocument();
  });

  it.each(['', '0', '-3'])('flags the quantity "%s" with an inline error', (quantityText) => {
    renderRow({ quantityText });
    expect(screen.getByText('Informe uma quantidade maior que zero.')).toBeInTheDocument();
  });

  it('shows no quantity error for a valid quantity', () => {
    renderRow();
    expect(screen.queryByText('Informe uma quantidade maior que zero.')).not.toBeInTheDocument();
  });
});
