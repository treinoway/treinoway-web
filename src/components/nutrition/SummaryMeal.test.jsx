import userEvent from '@testing-library/user-event';
import { renderWithRouter, screen, within } from '../../test/test-utils';
import SummaryMeal from './SummaryMeal';
import api from '../../api/axios';
import { buildFood, buildFoodGroups, buildItem, buildMeal, buildOption, buildSubstitute, nutrients } from '../../test/nutritionFixtures';

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

// Test helper: spies for every summary handler.
const makeHandlers = () => ({
  onChangeBasis: vi.fn(),
  onRemove: vi.fn(),
  onAdd: vi.fn().mockResolvedValue(true),
  onAddItem: vi.fn().mockResolvedValue(true),
  onRemoveItem: vi.fn(),
});

// Test helper: a lunch with two items, one with a substitute.
const lunch = () => buildMeal({
  name: 'Almoço',
  time: '12:30',
  options: [buildOption({
    items: [
      buildItem({ id: 'a', name: 'Arroz, integral, cozido', householdMeasure: '4 col. de sopa', quantity: 100, nutrients: nutrients(124, 2.6, 25.8, 1, 2.7) }),
      buildItem({ id: 'b', name: 'Frango', quantity: 120, nutrients: nutrients(190, 38.4, 0, 3, 0), substitutes: [buildSubstitute()] }),
    ],
    totals: nutrients(314.8, 41, 25.8, 4, 2.7),
  })],
});

// Test helper: renders a meal.
const renderMeal = (meal = lunch(), handlers = makeHandlers()) => {
  renderWithRouter(<ul><SummaryMeal meal={meal} patientId="p1" handlers={handlers} /></ul>);
  return handlers;
};

describe('SummaryMeal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => Promise.resolve({ data: url === '/food-groups' ? buildFoodGroups() : { items: [buildFood({ id: 'f2', name: 'Coxa' })] } }));
  });

  it('summarises time, short item names, counts and kcal collapsed', () => {
    renderMeal();
    const toggle = screen.getByRole('button', { name: /Almoço/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(toggle).getByText('12:30')).toBeInTheDocument();
    expect(within(toggle).getByText('Arroz, Frango')).toBeInTheDocument();
    expect(within(toggle).getByText('2 itens · 1 troca')).toBeInTheDocument();
    expect(within(toggle).getByText('315 kcal')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('expanded, replaces the summary with the item count and total protein', async () => {
    const user = userEvent.setup();
    renderMeal();
    await user.click(screen.getByRole('button', { name: /Almoço/ }));
    expect(screen.getByRole('button', { name: /Almoço/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('2 itens · total de 41 g de proteína')).toBeInTheDocument();
  });

  it('expands into the items table with the swap pills and collapses again', async () => {
    const user = userEvent.setup();
    renderMeal();
    await user.click(screen.getByRole('button', { name: /Almoço/ }));
    const table = screen.getByRole('table');
    ['Alimento', 'Qtd', 'Kcal', 'PTN', 'Trocas'].forEach((name) => {
      expect(within(table).getByRole('columnheader', { name })).toBeInTheDocument();
    });
    const row = within(table).getByText('Arroz, integral, cozido').closest('tr');
    expect(within(row).getByText('4 col. de sopa')).toBeInTheDocument();
    expect(within(row).getByText('100 g')).toBeInTheDocument();
    expect(within(row).getByText('124')).toBeInTheDocument();
    expect(within(row).getByText('2,6 g')).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: '+ Troca' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Almoço/ }));
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('labels every cell so the table stacks into rows on mobile (nothing is hidden)', async () => {
    const user = userEvent.setup();
    renderMeal();
    await user.click(screen.getByRole('button', { name: /Almoço/ }));
    const cells = Array.from(screen.getByRole('table').querySelector('tbody tr').children);
    expect(cells.slice(1, 4).map((cell) => cell.getAttribute('data-label'))).toEqual(['Qtd', 'Kcal', 'PTN']);
    expect(screen.getByRole('table').querySelector('.table-col-desktop-only')).toBeNull();
  });

  it('opens and closes the swap editor of one item', async () => {
    const user = userEvent.setup();
    renderMeal();
    await user.click(screen.getByRole('button', { name: /Almoço/ }));
    const pill = screen.getByRole('button', { name: '1 troca' });
    expect(pill).toHaveAttribute('aria-expanded', 'false');
    await user.click(pill);
    expect(pill).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: 'Trocas liberadas' })).toBeInTheDocument();
    await user.click(pill);
    expect(screen.queryByRole('region', { name: 'Trocas liberadas' })).not.toBeInTheDocument();
  });

  it('lets a "+ Troca" pill open the editor of an item without swaps', async () => {
    const user = userEvent.setup();
    renderMeal();
    await user.click(screen.getByRole('button', { name: /Almoço/ }));
    await user.click(screen.getByRole('button', { name: '+ Troca' }));
    expect(screen.getByText(/Sem trocas liberadas/)).toBeInTheDocument();
  });

  it('adds a food to the meal from the search and closes it', async () => {
    const user = userEvent.setup();
    const handlers = renderMeal();
    await user.click(screen.getByRole('button', { name: /Almoço/ }));
    expect(screen.getByText('Busca na tabela TACO ou nos teus alimentos salvos')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '+ Adicionar alimento' }));
    await user.click(await screen.findByRole('option', { name: /Coxa/ }));
    expect(handlers.onAddItem).toHaveBeenCalledWith(expect.objectContaining({ id: 'opt-1' }), expect.objectContaining({ id: 'f2' }));
    expect(await screen.findByRole('button', { name: '+ Adicionar alimento' })).toBeInTheDocument();
  });

  it('removes an item from its row menu', async () => {
    const user = userEvent.setup();
    const handlers = renderMeal();
    await user.click(screen.getByRole('button', { name: /Almoço/ }));
    await user.click(screen.getByRole('button', { name: 'Ações de Frango' }));
    expect(screen.getByRole('button', { name: 'Editar no cardápio' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remover alimento' }));
    expect(handlers.onRemoveItem).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }));
  });
});
