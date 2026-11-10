import { renderWithRouter, screen } from '../../test/test-utils';
import FoodSearchPanel from './FoodSearchPanel';
import api from '../../api/axios';
import { buildFood, buildFoodGroups } from '../../test/nutritionFixtures';

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const LONG_NAME = 'Acarajé, c/ sal [massa - feijão fradinho (de corda), cebola, frito (c/ azeite de dendê), molho - camarão seco]';

describe('FoodSearchPanel layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => Promise.resolve({
      data: url === '/food-groups' ? buildFoodGroups() : { items: [buildFood({ name: LONG_NAME })] },
    }));
  });

  it('keeps every group chip inside one scrollable group row', async () => {
    renderWithRouter(<FoodSearchPanel onPick={vi.fn()} onClose={vi.fn()} />);
    const chip = await screen.findByRole('button', { name: 'Carnes e ovos' });
    const row = screen.getByRole('group', { name: 'Grupo de alimentos' });
    expect(row).toContainElement(chip);
    expect(row).toContainElement(screen.getByRole('button', { name: 'Todos' }));
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('exposes the full food name as title so the clamped name stays readable', async () => {
    renderWithRouter(<FoodSearchPanel onPick={vi.fn()} onClose={vi.fn()} />);
    const option = await screen.findByRole('option', { name: /Acarajé/ });
    expect(option.querySelector('[title]')).toHaveAttribute('title', LONG_NAME);
  });
});
