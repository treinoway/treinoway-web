import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import DietProtocols from './DietProtocols';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

vi.mock('../../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
  onNetworkError: vi.fn(() => vi.fn()),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

const mockProtocols = [
  {
    id: 'proto-1',
    name: 'Dieta de Ana',
    status: 'active',
    startDate: '2026-01-01',
    expirationDate: '2026-03-31',
    dietType: 'low_carb',
    goalType: 'weight_loss',
    assignee: { firstName: 'Ana', lastName: 'Lima', email: 'ana@example.com' },
  },
  {
    id: 'proto-2',
    name: null,
    status: 'draft',
    startDate: '2026-02-01',
    expirationDate: null,
    dietType: null,
    goalType: null,
    assignee: { firstName: 'Bruno', lastName: 'Costa', email: 'bruno@example.com' },
  },
];

describe('DietProtocols', () => {
  let showToast;

  beforeEach(() => {
    showToast = vi.fn();
    vi.mocked(useToast).mockReturnValue({ showToast });
    api.get.mockResolvedValue({ data: mockProtocols });
    api.post.mockReset();
    api.delete.mockReset();
  });

  // ── Loading ───────────────────────────────────────────────────────────

  it('shows loading screen while fetching', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderWithRouter(<DietProtocols />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  // ── List ──────────────────────────────────────────────────────────────

  it('renders page title', async () => {
    renderWithRouter(<DietProtocols />);
    await waitFor(() => expect(screen.getByText('Protocolos de Dieta')).toBeInTheDocument());
  });

  it('renders protocol cards', async () => {
    renderWithRouter(<DietProtocols />);
    await waitFor(() => screen.getByText('Protocolos de Dieta'));
    expect(screen.getByText('Dieta de Ana')).toBeInTheDocument();
    expect(screen.getByText('Dieta de Bruno Costa')).toBeInTheDocument();
  });

  it('shows status badges', async () => {
    renderWithRouter(<DietProtocols />);
    await waitFor(() => screen.getByText('Protocolos de Dieta'));
    expect(screen.getByText('Ativo')).toBeInTheDocument();
    expect(screen.getByText('Rascunho')).toBeInTheDocument();
  });

  it('shows diet type badge when available', async () => {
    renderWithRouter(<DietProtocols />);
    await waitFor(() => screen.getByText('Protocolos de Dieta'));
    expect(screen.getByText('Low Carb')).toBeInTheDocument();
    expect(screen.getByText('Emagrecimento')).toBeInTheDocument();
  });

  it('formats dates correctly', async () => {
    renderWithRouter(<DietProtocols />);
    await waitFor(() => screen.getByText('Protocolos de Dieta'));
    expect(screen.getByText(/01\/01\/2026/)).toBeInTheDocument();
  });

  // ── Empty state ───────────────────────────────────────────────────────

  it('shows empty state when no protocols', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<DietProtocols />);
    await waitFor(() =>
      expect(screen.getByText('Nenhum protocolo ainda')).toBeInTheDocument(),
    );
  });

  // ── Delete ────────────────────────────────────────────────────────────

  it('shows confirm dialog before deleting', async () => {
    const user = userEvent.setup();
    renderWithRouter(<DietProtocols />);
    await waitFor(() => screen.getByText('Dieta de Ana'));

    await user.click(screen.getByRole('button', { name: /ações do protocolo dieta de ana/i }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(screen.getByText(/excluir o protocolo "dieta de ana"/i)).toBeInTheDocument();
  });

  it('cancels deletion when Cancelar is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<DietProtocols />);
    await waitFor(() => screen.getByText('Dieta de Ana'));

    await user.click(screen.getByRole('button', { name: /ações do protocolo dieta de ana/i }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByText(/excluir o protocolo/i)).not.toBeInTheDocument();
  });

  it('deletes protocol on confirm', async () => {
    const user = userEvent.setup();
    api.delete.mockResolvedValue({});
    renderWithRouter(<DietProtocols />);
    await waitFor(() => screen.getByText('Dieta de Ana'));

    await user.click(screen.getByRole('button', { name: /ações do protocolo dieta de ana/i }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() =>
      expect(api.delete).toHaveBeenCalledWith('/nutritionist/diet-protocols/proto-1'),
    );
    await waitFor(() =>
      expect(showToast).toHaveBeenCalledWith('Protocolo excluído', 'success'),
    );
  });
});
