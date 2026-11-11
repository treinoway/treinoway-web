import userEvent from '@testing-library/user-event';
import { renderWithRouter, screen, waitFor, within } from '../../test/test-utils';
import MyFoods from './MyFoods';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';
import { buildFood, buildFoodGroups, nutrients } from '../../test/nutritionFixtures';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const showToast = vi.fn();

const SALAD = buildFood({
  id: 'food-own-1',
  name: 'Salada da casa',
  source: 'custom',
  groupId: 'g-cereais',
  groupName: 'Cereais e tubérculos',
  portion: { label: '1 prato de sobremesa', grams: 100 },
  per100g: nutrients(13, 1.2, 2.4, 0.2, 1.5),
});

// Test helper: backend double so a refetch after a mutation sees it.
let foods;

// Test helper: resolves GETs by URL.
const mockApi = (initial = [SALAD]) => {
  foods = [...initial];
  api.get.mockImplementation((url) => {
    if (url === '/foods') return Promise.resolve({ data: { items: foods } });
    if (url === '/food-groups') return Promise.resolve({ data: buildFoodGroups() });
    return Promise.resolve({ data: {} });
  });
};

// Test helper: renders the page.
const renderPage = () => renderWithRouter(<MyFoods />, { route: '/nutritionist/foods' });

// Test helper: opens the create modal.
const openCreate = async (user) => {
  await user.click(await screen.findByRole('button', { name: 'Cadastrar alimento' }));
  return screen.findByRole('dialog', { name: 'Cadastrar alimento' });
};

// Test helper: replaces a numeric field's value.
const setNumber = async (user, field, value) => {
  await user.clear(field);
  await user.type(field, value);
};

// Test helper: fills the whole create form with valid data.
const fillValid = async (user, dialog) => {
  await user.type(within(dialog).getByLabelText('Nome do alimento'), 'Pão caseiro');
  await user.selectOptions(within(dialog).getByLabelText('Grupo'), 'g-cereais');
  await user.type(within(dialog).getByLabelText('Porção (medida caseira)'), '1 fatia');
  await setNumber(user, within(dialog).getByLabelText('Porção (g)'), '50');
  await setNumber(user, within(dialog).getByLabelText('Energia (kcal/100 g)'), '265');
  await setNumber(user, within(dialog).getByLabelText('Proteína (g/100 g)'), '9');
  await setNumber(user, within(dialog).getByLabelText('Carboidrato (g/100 g)'), '49');
  await setNumber(user, within(dialog).getByLabelText('Lipídio (g/100 g)'), '3.2');
  await setNumber(user, within(dialog).getByLabelText('Fibras (g/100 g)'), '2.7');
};

describe('MyFoods (Meus alimentos, criterion 17)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast });
    mockApi();
  });

  describe('states', () => {
    it('shows the loading state first', () => {
      api.get.mockImplementation(() => new Promise(() => {}));
      renderPage();
      expect(screen.getByText('Carregando...')).toBeInTheDocument();
    });

    it('lists only the nutritionist own foods (sources=custom)', async () => {
      renderPage();
      await screen.findByText('Salada da casa');
      expect(api.get).toHaveBeenCalledWith('/foods', { params: expect.objectContaining({ sources: 'custom' }) });
    });

    it('shows the empty state with a call to register', async () => {
      mockApi([]);
      const { container } = renderPage();

      expect(await screen.findByRole('heading', { name: 'Nenhum alimento cadastrado' })).toBeInTheDocument();
      expect(container.querySelector('.empty-block')).not.toBeNull();
      expect(within(container.querySelector('.empty-block')).getByRole('button', { name: 'Cadastrar alimento' })).toBeInTheDocument();
    });

    it('shows an error with retry when the list fails', async () => {
      const user = userEvent.setup();
      api.get.mockRejectedValueOnce(Object.assign(new Error('x'), { userMessage: 'Erro interno do servidor.' }));
      renderPage();

      expect(await screen.findByText('Erro interno do servidor.')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

      expect(await screen.findByText('Salada da casa')).toBeInTheDocument();
    });
  });

  describe('list', () => {
    it('shows name, group, portion and the per-100 g values of each food', async () => {
      renderPage();
      const row = (await screen.findByText('Salada da casa')).closest('tr');
      expect(within(row).getByText('Cereais e tubérculos')).toBeInTheDocument();
      expect(within(row).getByText(/1 prato de sobremesa \(100 g\)/)).toBeInTheDocument();
      expect(within(row).getByText('13')).toBeInTheDocument();
    });

    it('offers edit and delete behind a three-dot menu', async () => {
      const user = userEvent.setup();
      renderPage();
      await screen.findByText('Salada da casa');

      await user.click(screen.getByRole('button', { name: 'Ações de Salada da casa' }));

      expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Excluir' })).toBeInTheDocument();
    });
  });

  describe('create (DS Modal)', () => {
    it('opens a modal with every field and closes on cancel without sending', async () => {
      const user = userEvent.setup();
      renderPage();
      const dialog = await openCreate(user);

      expect(dialog.closest('.ds-overlay')).not.toBeNull();
      expect(await within(dialog).findByRole('option', { name: 'Carnes e ovos' })).toBeInTheDocument();
      ['Nome do alimento', 'Grupo', 'Porção (medida caseira)', 'Porção (g)', 'Energia (kcal/100 g)',
        'Proteína (g/100 g)', 'Carboidrato (g/100 g)', 'Lipídio (g/100 g)', 'Fibras (g/100 g)']
        .forEach((label) => expect(within(dialog).getByLabelText(label)).toBeInTheDocument());

      await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(api.post).not.toHaveBeenCalled();
    });

    it('POSTs the planned contract body and shows the new food', async () => {
      const user = userEvent.setup();
      const created = buildFood({
        id: 'food-own-2', name: 'Pão caseiro', source: 'custom', groupId: 'g-cereais', groupName: 'Cereais e tubérculos',
        portion: { label: '1 fatia', grams: 50 }, per100g: nutrients(265, 9, 49, 3.2, 2.7),
      });
      api.post.mockImplementation(() => {
        foods.push(created);
        return Promise.resolve({ data: created });
      });
      renderPage();
      const dialog = await openCreate(user);
      await within(dialog).findByRole('option', { name: 'Carnes e ovos' });

      await fillValid(user, dialog);
      await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

      await waitFor(() => expect(api.post).toHaveBeenCalledWith('/nutritionist/foods', {
        name: 'Pão caseiro',
        groupId: 'g-cereais',
        portion: { label: '1 fatia', grams: 50 },
        per100g: { kcal: 265, protein: 9, carbs: 49, fat: 3.2, fiber: 2.7 },
      }));
      expect(await screen.findByText('Pão caseiro')).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('requires name, group, portion and the macros before sending', async () => {
      const user = userEvent.setup();
      renderPage();
      const dialog = await openCreate(user);
      await within(dialog).findByRole('option', { name: 'Carnes e ovos' });

      await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

      expect(within(dialog).getAllByText(/obrigatório/i).length).toBeGreaterThanOrEqual(3);
      expect(api.post).not.toHaveBeenCalled();
    });

    it('rejects negative numbers', async () => {
      const user = userEvent.setup();
      renderPage();
      const dialog = await openCreate(user);
      await within(dialog).findByRole('option', { name: 'Carnes e ovos' });
      await fillValid(user, dialog);

      await setNumber(user, within(dialog).getByLabelText('Proteína (g/100 g)'), '-4');
      await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

      expect(within(dialog).getByText(/não pode ser negativ/i)).toBeInTheDocument();
      expect(api.post).not.toHaveBeenCalled();
    });

    it('rejects a portion of 0 g', async () => {
      const user = userEvent.setup();
      renderPage();
      const dialog = await openCreate(user);
      await within(dialog).findByRole('option', { name: 'Carnes e ovos' });
      await fillValid(user, dialog);

      await setNumber(user, within(dialog).getByLabelText('Porção (g)'), '0');
      await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

      expect(within(dialog).getByText(/maior que zero/i)).toBeInTheDocument();
      expect(api.post).not.toHaveBeenCalled();
    });

    it('shows the API error and keeps the modal open when saving fails', async () => {
      const user = userEvent.setup();
      api.post.mockRejectedValue(Object.assign(new Error('x'), { userMessage: 'Alimento já cadastrado.' }));
      renderPage();
      const dialog = await openCreate(user);
      await within(dialog).findByRole('option', { name: 'Carnes e ovos' });
      await fillValid(user, dialog);

      await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

      await waitFor(() => expect(showToast).toHaveBeenCalledWith('Alimento já cadastrado.', 'error'));
      expect(screen.getByRole('dialog', { name: 'Cadastrar alimento' })).toBeInTheDocument();
    });
  });

  describe('edit', () => {
    it('opens the modal pre-filled and PATCHes the food', async () => {
      const user = userEvent.setup();
      api.patch.mockImplementation((url, body) => {
        foods = [{ ...SALAD, name: body.name }];
        return Promise.resolve({ data: foods[0] });
      });
      renderPage();
      await screen.findByText('Salada da casa');
      await user.click(screen.getByRole('button', { name: 'Ações de Salada da casa' }));
      await user.click(screen.getByRole('button', { name: 'Editar' }));

      const dialog = await screen.findByRole('dialog', { name: 'Editar alimento' });
      const name = within(dialog).getByLabelText('Nome do alimento');
      expect(name).toHaveValue('Salada da casa');
      expect(within(dialog).getByLabelText('Energia (kcal/100 g)')).toHaveValue(13);
      await user.clear(name);
      await user.type(name, 'Salada verde');
      await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

      await waitFor(() => expect(api.patch).toHaveBeenCalledWith(
        '/nutritionist/foods/food-own-1',
        expect.objectContaining({ name: 'Salada verde' }),
      ));
      expect(await screen.findByText('Salada verde')).toBeInTheDocument();
    });
  });

  describe('delete (DS ConfirmDialog)', () => {
    const openDelete = async (user) => {
      await screen.findByText('Salada da casa');
      await user.click(screen.getByRole('button', { name: 'Ações de Salada da casa' }));
      await user.click(screen.getByRole('button', { name: 'Excluir' }));
      return screen.findByRole('alertdialog');
    };

    it('confirms, DELETEs and removes the row', async () => {
      const user = userEvent.setup();
      api.delete.mockImplementation(() => {
        foods = [];
        return Promise.resolve({ data: undefined });
      });
      renderPage();
      const dialog = await openDelete(user);
      expect(dialog).toHaveAccessibleName(expect.stringContaining('Salada da casa'));
      expect(api.delete).not.toHaveBeenCalled();

      await user.click(within(dialog).getByRole('button', { name: 'Excluir' }));

      await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/nutritionist/foods/food-own-1'));
      await waitFor(() => expect(screen.queryByText('Salada da casa')).not.toBeInTheDocument());
    });

    it('cancel keeps the food', async () => {
      const user = userEvent.setup();
      renderPage();
      const dialog = await openDelete(user);

      await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

      expect(api.delete).not.toHaveBeenCalled();
      expect(screen.getByText('Salada da casa')).toBeInTheDocument();
    });

    it('toasts the API error and keeps the row when deleting fails', async () => {
      const user = userEvent.setup();
      api.delete.mockRejectedValue(Object.assign(new Error('x'), { userMessage: 'Alimento em uso em um plano.' }));
      renderPage();
      const dialog = await openDelete(user);

      await user.click(within(dialog).getByRole('button', { name: 'Excluir' }));

      await waitFor(() => expect(showToast).toHaveBeenCalledWith('Alimento em uso em um plano.', 'error'));
      expect(screen.getByText('Salada da casa')).toBeInTheDocument();
    });
  });
});
