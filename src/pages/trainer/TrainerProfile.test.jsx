import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import TrainerProfile from './TrainerProfile';
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

const mockShowToast = vi.fn();

const mockTrainerData = {
  bio: 'Treinador experiente com 10 anos de atuação.',
  serviceMode: 'HYBRID',
  instagram: '@trainer',
  facebook: 'trainer.fb',
  whatsapp: '+5511999999999',
};

describe('TrainerProfile', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockResolvedValue({ data: mockTrainerData });
    api.patch.mockReset();
  });

  it('renders the page title', async () => {
    renderWithRouter(<TrainerProfile />);

    expect(screen.getByText('Perfil do Treinador')).toBeInTheDocument();
  });

  it('displays trainer data in view mode after loading', async () => {
    renderWithRouter(<TrainerProfile />);

    await waitFor(() => {
      expect(screen.getByText('Treinador experiente com 10 anos de atuação.')).toBeInTheDocument();
    });

    expect(screen.getByText('Híbrido')).toBeInTheDocument();
    expect(screen.getByText('@trainer')).toBeInTheDocument();
  });

  it('shows "Não informado" for empty fields', async () => {
    api.get.mockResolvedValue({
      data: { bio: '', serviceMode: 'ONLINE', instagram: '', facebook: '', whatsapp: '' },
    });

    renderWithRouter(<TrainerProfile />);

    await waitFor(() => {
      const notInformed = screen.getAllByText('Não informado');
      expect(notInformed.length).toBeGreaterThan(0);
    });
  });

  it('shows Edit button in view mode', async () => {
    renderWithRouter(<TrainerProfile />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^editar$/i })).toBeInTheDocument();
    });
  });

  it('switches to edit mode when Edit button is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<TrainerProfile />);

    await waitFor(() => screen.getByRole('button', { name: /^editar$/i }));

    await user.click(screen.getByRole('button', { name: /^editar$/i }));

    expect(screen.getByRole('button', { name: /^salvar$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
  });

  it('pre-fills edit form with existing trainer data', async () => {
    const user = userEvent.setup();
    renderWithRouter(<TrainerProfile />);

    await waitFor(() => screen.getByRole('button', { name: /^editar$/i }));
    await user.click(screen.getByRole('button', { name: /^editar$/i }));

    expect(screen.getByDisplayValue('Treinador experiente com 10 anos de atuação.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('@trainer')).toBeInTheDocument();
  });

  it('returns to view mode when Cancel is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<TrainerProfile />);

    await waitFor(() => screen.getByRole('button', { name: /^editar$/i }));
    await user.click(screen.getByRole('button', { name: /^editar$/i }));
    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(screen.queryByRole('button', { name: /^salvar$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^editar$/i })).toBeInTheDocument();
  });

  it('calls PATCH /trainer and shows success toast on submit', async () => {
    const user = userEvent.setup();
    api.patch.mockResolvedValue({ data: mockTrainerData });

    renderWithRouter(<TrainerProfile />);

    await waitFor(() => screen.getByRole('button', { name: /^editar$/i }));
    await user.click(screen.getByRole('button', { name: /^editar$/i }));
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/trainer', expect.any(Object));
      expect(mockShowToast).toHaveBeenCalledWith(
        'Perfil do treinador atualizado com sucesso!',
        'success'
      );
    });
  });

  it('shows error toast when update fails', async () => {
    const user = userEvent.setup();
    api.patch.mockRejectedValue({
      userMessage: 'Erro ao atualizar.',
      response: { status: 500 },
    });

    renderWithRouter(<TrainerProfile />);

    await waitFor(() => screen.getByRole('button', { name: /^editar$/i }));
    await user.click(screen.getByRole('button', { name: /^editar$/i }));
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Erro ao atualizar.', 'error');
    });
  });
});
