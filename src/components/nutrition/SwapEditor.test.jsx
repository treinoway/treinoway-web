import userEvent from '@testing-library/user-event';
import { renderWithRouter, screen, within } from '../../test/test-utils';
import SwapEditor from './SwapEditor';
import api from '../../api/axios';
import { buildFood, buildFoodGroups, buildItem, buildSubstitute, nutrients } from '../../test/nutritionFixtures';

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

// Test helper: renders the editor with handlers.
const renderEditor = (item, handlers = {}) => {
  const props = { onChangeBasis: vi.fn(), onRemove: vi.fn(), onAdd: vi.fn().mockResolvedValue(true), ...handlers };
  renderWithRouter(<SwapEditor item={item} {...props} />);
  return props;
};

describe('SwapEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => Promise.resolve({ data: url === '/food-groups' ? buildFoodGroups() : { items: [buildFood({ id: 'f2', name: 'Coxa' })] } }));
  });

  it('shows the TROCAS LIBERADAS eyebrow and the original with grams, protein and kcal', () => {
    renderEditor(buildItem({ name: 'Frango', quantity: 120, nutrients: nutrients(191, 38.4, 0, 3, 0) }));
    const panel = screen.getByRole('region', { name: 'Trocas liberadas' });
    expect(within(panel).getByText('Trocas liberadas')).toBeInTheDocument();
    expect(within(panel).getByText('Original: Frango · 120 g · 38 g PTN · 191 kcal')).toBeInTheDocument();
  });

  it('shows the substitute with measure, grams and the protein as primary value', () => {
    renderEditor(buildItem({ substitutes: [buildSubstitute()] }));
    expect(screen.getByText('Patinho grelhado')).toBeInTheDocument();
    expect(screen.getByText('1 filé pequeno')).toBeInTheDocument();
    expect(screen.getByText('107 g')).toBeInTheDocument();
    expect(screen.getByText('≈ 38,4 g PTN')).toBeInTheDocument();
    expect(screen.getByText('· 180 kcal')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Proteína' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Equivaler por')).toBeInTheDocument();
  });

  it('shows kcal as the primary value for the calorie basis', () => {
    renderEditor(buildItem({ swapBasis: 'kcal', substitutes: [buildSubstitute()] }));
    expect(screen.getByText('≈ 180 kcal')).toBeInTheDocument();
    expect(screen.getByText('· 38,4 g PTN')).toBeInTheDocument();
  });

  it('explains that the patient sees no swap button when there are no substitutes', () => {
    renderEditor(buildItem());
    expect(screen.getByText('Sem trocas liberadas. O paciente vê o item sem o botão de trocar.')).toBeInTheDocument();
  });

  it('tells the patient only sees the options of the list', () => {
    renderEditor(buildItem());
    expect(screen.getByText('O paciente só vê as opções desta lista. A troca vale pro dia em que ele escolher.')).toBeInTheDocument();
  });

  it('does not offer the iArnold suggestion (v2)', () => {
    renderEditor(buildItem());
    expect(screen.queryByRole('button', { name: /iArnold/i })).not.toBeInTheDocument();
  });

  it('changes the basis and removes a substitute', async () => {
    const user = userEvent.setup();
    const item = buildItem({ substitutes: [buildSubstitute()] });
    const handlers = renderEditor(item);
    await user.click(screen.getByRole('tab', { name: 'Calorias' }));
    expect(handlers.onChangeBasis).toHaveBeenCalledWith(item, 'kcal');
    await user.click(screen.getByRole('button', { name: 'Remover troca Patinho grelhado' }));
    expect(handlers.onRemove).toHaveBeenCalledWith(expect.objectContaining({ id: 'sub-1' }));
  });

  it('adds a substitute from the food search and closes it', async () => {
    const user = userEvent.setup();
    const item = buildItem();
    const handlers = renderEditor(item);
    await user.click(screen.getByRole('button', { name: '+ Adicionar troca' }));
    await user.click(await screen.findByRole('option', { name: /Coxa/ }));
    expect(handlers.onAdd).toHaveBeenCalledWith(item, expect.objectContaining({ id: 'f2' }));
    expect(await screen.findByRole('button', { name: '+ Adicionar troca' })).toBeInTheDocument();
  });

  it('keeps the search open when adding fails', async () => {
    const user = userEvent.setup();
    renderEditor(buildItem(), { onAdd: vi.fn().mockResolvedValue(false) });
    await user.click(screen.getByRole('button', { name: '+ Adicionar troca' }));
    await user.click(await screen.findByRole('option', { name: /Coxa/ }));
    expect(within(screen.getByRole('region', { name: 'Trocas liberadas' })).getByRole('combobox', { name: 'Buscar alimento' })).toBeInTheDocument();
  });

  it('closes the search without adding', async () => {
    const user = userEvent.setup();
    const handlers = renderEditor(buildItem());
    await user.click(screen.getByRole('button', { name: '+ Adicionar troca' }));
    await user.click(await screen.findByRole('button', { name: /Fechar|Cancelar/ }));
    expect(handlers.onAdd).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '+ Adicionar troca' })).toBeInTheDocument();
  });
});
