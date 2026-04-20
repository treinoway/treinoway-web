import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import DietTemplates from './DietTemplates';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

vi.mock('../../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockTemplates = [
  {
    id: 't1',
    name: 'Dieta Low Carb',
    description: 'Protocolo de baixo carboidrato',
    dietType: 'low_carb',
    goalType: 'weight_loss',
    mealsCount: 5,
  },
];

describe('DietTemplates', () => {
  let showToast;

  beforeEach(() => {
    showToast = vi.fn();
    vi.mocked(useToast).mockReturnValue({ showToast });
    api.get.mockResolvedValue({ data: mockTemplates });
    api.post.mockReset();
    api.patch.mockReset();
    api.delete.mockReset();
  });

  // ── Loading ───────────────────────────────────────────────────────────

  it('shows loading screen while fetching', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderWithRouter(<DietTemplates />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  // ── List ──────────────────────────────────────────────────────────────

  it('renders page title and template list', async () => {
    renderWithRouter(<DietTemplates />);
    await waitFor(() => expect(screen.getByText('Modelos de Dieta')).toBeInTheDocument());
    expect(screen.getByText('Dieta Low Carb')).toBeInTheDocument();
  });

  it('shows badges for dietType and goalType', async () => {
    renderWithRouter(<DietTemplates />);
    await waitFor(() => screen.getByText('Dieta Low Carb'));
    expect(screen.getByText('Low Carb')).toBeInTheDocument();
    expect(screen.getByText('Emagrecimento')).toBeInTheDocument();
  });

  it('shows meals count badge', async () => {
    renderWithRouter(<DietTemplates />);
    await waitFor(() => screen.getByText('Dieta Low Carb'));
    expect(screen.getByText('5 refeições')).toBeInTheDocument();
  });

  // ── Empty state ───────────────────────────────────────────────────────

  it('shows empty state when no templates', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<DietTemplates />);
    await waitFor(() =>
      expect(screen.getByText('Nenhum modelo criado ainda')).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /criar primeiro modelo/i })).toBeInTheDocument();
  });

  // ── Create ────────────────────────────────────────────────────────────

  it('opens create sheet when button clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<DietTemplates />);
    await waitFor(() => screen.getByText('Modelos de Dieta'));
    await user.click(screen.getByRole('button', { name: /novo modelo/i }));
    expect(screen.getByRole('dialog', { name: /criar modelo/i })).toBeInTheDocument();
  });

  it('creates a template and adds it to the list', async () => {
    const user = userEvent.setup();
    const newTemplate = { id: 't2', name: 'Alta Proteína', dietType: 'high_protein', mealsCount: 0 };
    api.post.mockResolvedValue({ data: newTemplate });

    renderWithRouter(<DietTemplates />);
    await waitFor(() => screen.getByText('Modelos de Dieta'));
    await user.click(screen.getByRole('button', { name: /novo modelo/i }));

    await user.type(screen.getByLabelText('Nome'), 'Alta Proteína');
    await user.click(screen.getByRole('button', { name: 'Criar' }));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/nutritionist/diet-protocol-templates',
        expect.objectContaining({ name: 'Alta Proteína' }),
      ),
    );
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Modelo criado com sucesso', 'success'));
  });

  it('closes create sheet on Cancelar', async () => {
    const user = userEvent.setup();
    renderWithRouter(<DietTemplates />);
    await waitFor(() => screen.getByText('Modelos de Dieta'));
    await user.click(screen.getByRole('button', { name: /novo modelo/i }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // ── Delete ────────────────────────────────────────────────────────────

  it('shows confirm dialog before deleting', async () => {
    const user = userEvent.setup();
    renderWithRouter(<DietTemplates />);
    await waitFor(() => screen.getByText('Dieta Low Carb'));

    await user.click(screen.getByRole('button', { name: /ações do modelo dieta low carb/i }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(screen.getByText(/excluir o modelo "dieta low carb"/i)).toBeInTheDocument();
  });

  it('deletes template on confirm', async () => {
    const user = userEvent.setup();
    api.delete.mockResolvedValue({ data: {} });
    renderWithRouter(<DietTemplates />);
    await waitFor(() => screen.getByText('Dieta Low Carb'));

    await user.click(screen.getByRole('button', { name: /ações do modelo dieta low carb/i }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() =>
      expect(api.delete).toHaveBeenCalledWith('/nutritionist/diet-protocol-templates/t1'),
    );
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Modelo excluído', 'success'));
  });
});
