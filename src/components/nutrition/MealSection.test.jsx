import userEvent from '@testing-library/user-event';
import { renderWithRouter, screen, within } from '../../test/test-utils';
import MealSection from './MealSection';
import { buildMeal, buildOption, nutrients } from '../../test/nutritionFixtures';

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn().mockResolvedValue({ data: { items: [] } }), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

// Test helper: handlers spies.
const makeHandlers = () => ({
  onAddFood: vi.fn().mockResolvedValue(true),
  onSelectOption: vi.fn(),
  onQuantityChange: vi.fn(),
  onRemoveItem: vi.fn(),
  onAddOption: vi.fn(),
  onRemoveOption: vi.fn(),
  onEditMeal: vi.fn(),
  onDeleteMeal: vi.fn(),
  onMoveMeal: vi.fn(),
});

// Test helper: a second option with other totals.
const secondOption = () => buildOption({ id: 'opt-b', position: 2, items: [], totals: nutrients(200, 0, 50, 0, 0) });

// Test helper: renders a meal group inside a table.
const renderSection = (meal, optionIndex = 0, handlers = makeHandlers(), { dayKcal = 400, position } = {}) => {
  renderWithRouter(
    <table>
      <MealSection meal={meal} option={meal.options[optionIndex]} dayKcal={dayKcal} position={position} quantityTexts={{}} handlers={handlers} />
    </table>,
  );
  return handlers;
};

// Test helper: the meal group.
const group = (name = 'Café da manhã') => screen.getByRole('rowgroup', { name });

describe('MealSection', () => {
  it('shows time, name, item count, the share of the day kcal and the subtotal', () => {
    renderSection(buildMeal());
    expect(within(group()).getByText('07:00')).toBeInTheDocument();
    expect(within(group()).getByRole('heading', { name: 'Café da manhã' })).toBeInTheDocument();
    expect(within(group()).getByText('1 item · 25% das kcal do dia')).toBeInTheDocument();
    expect(within(within(group()).getByRole('row', { name: /Subtotal · Café da manhã/ })).getByText('100')).toBeInTheDocument();
  });

  it('shows 0% when the day has no kcal', () => {
    renderSection(buildMeal(), 0, makeHandlers(), { dayKcal: 0 });
    expect(screen.getByText('1 item · 0% das kcal do dia')).toBeInTheDocument();
  });

  it('shows an empty hint for an option without items and still the subtotal', () => {
    renderSection(buildMeal({ options: [buildOption({ items: [], totals: nutrients() })] }));
    expect(screen.getByText('Sem alimentos nesta opção.')).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Subtotal/ })).toBeInTheDocument();
  });

  it('has no option tabs and no option band for a single option', () => {
    renderSection(buildMeal());
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByText(/escolhe no dia/)).not.toBeInTheDocument();
  });

  it('shows option tabs, selects an option and keeps option 1 free of the band', async () => {
    const user = userEvent.setup();
    const meal = buildMeal({ options: [buildMeal().options[0], secondOption()] });
    const handlers = renderSection(meal, 0);
    expect(screen.getByRole('tablist', { name: 'Opções de Café da manhã' })).toBeInTheDocument();
    expect(screen.queryByText(/Comparada à opção 1/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Opção 2' }));
    expect(handlers.onSelectOption).toHaveBeenCalledWith('meal-1', 'opt-b');
  });

  it('shows the option band with the comparison with option 1 and the subtotal naming the option', () => {
    const meal = buildMeal({ options: [buildMeal().options[0], secondOption()] });
    renderSection(meal, 1);
    expect(screen.getByText('Opção 2 · o paciente escolhe no dia')).toBeInTheDocument();
    expect(screen.getByText('Comparada à opção 1: +100 kcal · PTN −10,0 g · CHO +30,0 g · LIP −1,0 g')).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Subtotal · Café da manhã · opção 2/ })).toBeInTheDocument();
  });

  it('removes an extra option from its band', async () => {
    const user = userEvent.setup();
    const meal = buildMeal({ options: [buildMeal().options[0], secondOption()] });
    const handlers = renderSection(meal, 1);
    await user.click(screen.getByRole('button', { name: 'Remover opção 2' }));
    expect(handlers.onRemoveOption).toHaveBeenCalledWith(expect.objectContaining({ id: 'opt-b' }));
  });

  it('"+ Substituta" adds an option to the meal and is hidden at 3 options', async () => {
    const user = userEvent.setup();
    const handlers = renderSection(buildMeal());
    await user.click(screen.getByRole('button', { name: '+ Substituta' }));
    expect(handlers.onAddOption).toHaveBeenCalledWith(expect.objectContaining({ id: 'meal-1' }));
  });

  it('hides "+ Substituta" at the limit', () => {
    const base = buildMeal().options[0];
    renderSection(buildMeal({ options: [base, secondOption(), { ...secondOption(), id: 'opt-c', position: 3 }] }));
    expect(screen.queryByRole('button', { name: '+ Substituta' })).not.toBeInTheDocument();
  });

  it('forwards quantity edits and removals of items, with no per-item substitute button', async () => {
    const user = userEvent.setup();
    const handlers = renderSection(buildMeal());
    await user.type(screen.getByLabelText('Quantidade de cuscuz de milho cozido'), '0');
    expect(handlers.onQuantityChange).toHaveBeenCalledWith('item-1', '1000');
    await user.click(screen.getByRole('button', { name: 'Remover cuscuz de milho cozido' }));
    expect(handlers.onRemoveItem).toHaveBeenCalledWith(expect.objectContaining({ id: 'item-1' }));
    expect(screen.getAllByRole('button', { name: /Substituta/ })).toHaveLength(1);
  });

  it('opens the food search under the meal naming the target, then closes it on Cancelar', async () => {
    const user = userEvent.setup();
    renderSection(buildMeal());
    await user.click(screen.getByRole('button', { name: '+ Alimento' }));
    expect(await screen.findByRole('combobox', { name: 'Buscar alimento' })).toBeInTheDocument();
    expect(screen.getByText('Adicionar ao Café da manhã')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Alimento' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('combobox', { name: 'Buscar alimento' })).not.toBeInTheDocument();
  });

  it('names the option in the search target when the meal has several', async () => {
    const user = userEvent.setup();
    renderSection(buildMeal({ options: [buildMeal().options[0], secondOption()] }), 1);
    await user.click(screen.getByRole('button', { name: '+ Alimento' }));
    expect(await screen.findByText('Adicionar ao Café da manhã · opção 2')).toBeInTheDocument();
  });

  it('offers edit, move and delete in the meal menu and disables moves at the edges', async () => {
    const user = userEvent.setup();
    const handlers = renderSection(buildMeal(), 0, makeHandlers(), { position: { isFirst: true, isLast: false } });
    await user.click(screen.getByRole('button', { name: 'Ações de Café da manhã' }));
    expect(screen.getByRole('button', { name: 'Mover para cima' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Mover para baixo' }));
    expect(handlers.onMoveMeal).toHaveBeenCalledWith(expect.objectContaining({ id: 'meal-1' }), 1);
    await user.click(screen.getByRole('button', { name: 'Ações de Café da manhã' }));
    await user.click(screen.getByRole('button', { name: 'Editar refeição' }));
    expect(handlers.onEditMeal).toHaveBeenCalledWith(expect.objectContaining({ id: 'meal-1' }));
    await user.click(screen.getByRole('button', { name: 'Ações de Café da manhã' }));
    await user.click(screen.getByRole('button', { name: 'Excluir refeição' }));
    expect(handlers.onDeleteMeal).toHaveBeenCalledWith(expect.objectContaining({ id: 'meal-1' }));
  });
});
