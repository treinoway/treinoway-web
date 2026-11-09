import userEvent from '@testing-library/user-event';
import { renderWithRouter, screen, waitFor } from '../../test/test-utils';
import FoodSearchPanel from './FoodSearchPanel';
import api from '../../api/axios';
import { buildFood, buildFoodGroups } from '../../test/nutritionFixtures';

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

// Test helper: resolves GETs by url.
const mockApi = (foods) => api.get.mockImplementation((url) => Promise.resolve({
  data: url === '/food-groups' ? buildFoodGroups() : { items: foods },
}));

describe('FoodSearchPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists the foods of the three sources and the groups', async () => {
    mockApi([buildFood({ name: 'Tapioca' })]);
    renderWithRouter(<FoodSearchPanel onPick={vi.fn()} onClose={vi.fn()} />);
    expect(await screen.findByRole('option', { name: /Tapioca/ })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Carnes e ovos' })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/foods', { params: expect.objectContaining({ sources: 'taco,tbca,custom' }) });
  });

  it('searches the typed text after the debounce and filters by group', async () => {
    const user = userEvent.setup();
    mockApi([buildFood()]);
    renderWithRouter(<FoodSearchPanel onPick={vi.fn()} onClose={vi.fn()} />);
    await user.type(await screen.findByRole('combobox', { name: 'Buscar alimento' }), 'cus');
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/foods', { params: expect.objectContaining({ q: 'cus' }) }));
    await user.click(await screen.findByRole('button', { name: 'Carnes e ovos' }));
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/foods', { params: expect.objectContaining({ groupId: 'g-carnes' }) }));
  });

  it('reports the picked food and closing', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    const onClose = vi.fn();
    mockApi([buildFood({ id: 'f9', name: 'Tapioca' })]);
    renderWithRouter(<FoodSearchPanel onPick={onPick} onClose={onClose} />);
    await user.click(await screen.findByRole('option', { name: /Tapioca/ }));
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 'f9' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('points to Meus alimentos when nothing matches', async () => {
    mockApi([]);
    renderWithRouter(<FoodSearchPanel onPick={vi.fn()} onClose={vi.fn()} />);
    expect(await screen.findByRole('link', { name: 'Meus alimentos' })).toHaveAttribute('href', '/nutritionist/foods');
  });
});
