import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import MyDietProtocol from './MyDietProtocol';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

vi.mock('../../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
  },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockActiveProtocol = {
  id: 'proto-1',
  status: 'active',
  name: 'Dieta de hipertrofia',
  meals: [
    {
      id: 'm1',
      mealType: 'breakfast',
      scheduledTime: '07:00',
      foodItems: [
        { id: 'fi1', foodName: 'Ovos mexidos', quantityG: 150, kcal: 220, proteinG: 18, carbsG: 2, fatG: 14 },
      ],
    },
    {
      id: 'm2',
      mealType: 'lunch',
      scheduledTime: '12:00',
      foodItems: [],
    },
  ],
};

describe('MyDietProtocol', () => {
  let showToast;

  beforeEach(() => {
    showToast = vi.fn();
    vi.mocked(useToast).mockReturnValue({ showToast });
    api.get.mockResolvedValue({ data: [mockActiveProtocol] });
  });

  // ── Loading ───────────────────────────────────────────────────────────

  it('shows loading screen while fetching', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderWithRouter(<MyDietProtocol />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  // ── Page title ────────────────────────────────────────────────────────

  it('renders page title', async () => {
    renderWithRouter(<MyDietProtocol />);
    await waitFor(() => expect(screen.getByText('Minha Dieta')).toBeInTheDocument());
  });

  // ── Empty state ───────────────────────────────────────────────────────

  it('shows empty state when no active protocol', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<MyDietProtocol />);
    await waitFor(() =>
      expect(screen.getByText('Nenhuma dieta prescrita')).toBeInTheDocument(),
    );
    expect(
      screen.getByText('Seu nutricionista ainda não prescreveu uma dieta.'),
    ).toBeInTheDocument();
  });

  it('shows empty state when protocol is draft not active', async () => {
    api.get.mockResolvedValue({ data: [{ ...mockActiveProtocol, status: 'draft' }] });
    renderWithRouter(<MyDietProtocol />);
    await waitFor(() =>
      expect(screen.getByText('Nenhuma dieta prescrita')).toBeInTheDocument(),
    );
  });

  // ── Active protocol ───────────────────────────────────────────────────

  it('renders meal type labels for active protocol', async () => {
    renderWithRouter(<MyDietProtocol />);
    await waitFor(() => screen.getByText('Minha Dieta'));
    expect(screen.getByText('Café da manhã')).toBeInTheDocument();
    expect(screen.getByText('Almoço')).toBeInTheDocument();
  });

  it('renders food items within meals', async () => {
    renderWithRouter(<MyDietProtocol />);
    await waitFor(() => screen.getByText('Minha Dieta'));
    expect(screen.getByText('Ovos mexidos')).toBeInTheDocument();
  });

  it('renders total kcal in summary card', async () => {
    renderWithRouter(<MyDietProtocol />);
    await waitFor(() => screen.getByText('Minha Dieta'));
    // 220 kcal from the one food item
    expect(screen.getByText('220')).toBeInTheDocument();
    expect(screen.getByText('kcal total')).toBeInTheDocument();
  });

  // ── Meal expand/collapse ──────────────────────────────────────────────

  it('collapses and expands meal on toggle click', async () => {
    const user = userEvent.setup();
    renderWithRouter(<MyDietProtocol />);
    await waitFor(() => screen.getByText('Café da manhã'));

    // Initially expanded — food item visible
    expect(screen.getByText('Ovos mexidos')).toBeInTheDocument();

    // Collapse
    const toggleBtn = screen.getAllByRole('button', { name: /recolher refeição/i })[0];
    await user.click(toggleBtn);
    expect(screen.queryByText('Ovos mexidos')).not.toBeInTheDocument();

    // Expand again
    const expandBtn = screen.getByRole('button', { name: /expandir refeição/i });
    await user.click(expandBtn);
    expect(screen.getByText('Ovos mexidos')).toBeInTheDocument();
  });

  // ── API error ─────────────────────────────────────────────────────────

  it('shows error toast when fetch fails', async () => {
    api.get.mockRejectedValue({ userMessage: 'Erro ao carregar.' });
    renderWithRouter(<MyDietProtocol />);
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('Erro ao carregar.', 'error'),
    );
  });
});
