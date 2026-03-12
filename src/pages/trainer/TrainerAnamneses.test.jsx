import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import TrainerAnamneses from './TrainerAnamneses';
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

const mockAnamneses = [
  {
    id: 'anamnesis-1',
    title: 'Anamnese Saúde Geral',
    description: 'Questionário de saúde',
    isGeneral: false,
    sections: [{ id: 's1' }, { id: 's2' }],
  },
  {
    id: 'anamnesis-2',
    title: 'Anamnese Geral da Plataforma',
    description: null,
    isGeneral: true,
    sections: [],
  },
];

describe('TrainerAnamneses', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockReset();
    api.post.mockReset();
    api.patch.mockReset();
    api.delete.mockReset();
  });

  it('shows loading state while fetching', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderWithRouter(<TrainerAnamneses />);
    expect(screen.getByText(/carregando/i)).toBeInTheDocument();
  });

  it('renders page title after loading', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamneses')).toBeInTheDocument();
    });
  });

  it('fetches anamneses from /trainer/anamneses on mount', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/trainer/anamneses');
    });
  });

  it('shows empty state when no anamneses', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Nenhuma anamnese ainda')).toBeInTheDocument();
    });
  });

  it('renders anamnesis cards with title and section count', async () => {
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
      expect(screen.getByText('Anamnese Geral da Plataforma')).toBeInTheDocument();
    });
    expect(screen.getByText('2 seção(ões)')).toBeInTheDocument();
    expect(screen.getByText('0 seção(ões)')).toBeInTheDocument();
  });

  it('shows "Geral" badge for general anamneses', async () => {
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Geral')).toBeInTheDocument();
    });
  });

  it('hides options menu for general anamneses', async () => {
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese Geral da Plataforma')).toBeInTheDocument();
    });
    const menus = screen.getAllByRole('button', { name: /opções de/i });
    expect(menus).toHaveLength(1); // only for non-general
  });

  it('shows the create form when "Nova Anamnese" is clicked', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.queryByText(/carregando/i)).not.toBeInTheDocument();
    });
    await user.click(screen.getByText('+ Nova Anamnese'));
    expect(screen.getByLabelText('Título')).toBeInTheDocument();
  });

  it('submits create form, shows success toast and navigates to detail', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [] });
    api.post.mockResolvedValue({ data: { id: 'new-id' } });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.queryByText(/carregando/i)).not.toBeInTheDocument();
    });
    await user.click(screen.getByText('+ Nova Anamnese'));
    await user.type(screen.getByLabelText('Título'), 'Nova Anamnese Teste');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/anamneses', expect.objectContaining({ title: 'Nova Anamnese Teste' }));
      expect(mockShowToast).toHaveBeenCalledWith('Anamnese criada com sucesso!', 'success');
    });
  });

  it('shows the edit form prefilled when "Editar" is clicked via menu', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Opções de Anamnese Saúde Geral' }));
    await user.click(screen.getByRole('button', { name: 'Editar' }));
    expect(screen.getByDisplayValue('Anamnese Saúde Geral')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Questionário de saúde')).toBeInTheDocument();
  });

  it('submits update and shows success toast', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    api.patch.mockResolvedValue({ data: {} });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Opções de Anamnese Saúde Geral' }));
    await user.click(screen.getByRole('button', { name: 'Editar' }));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/trainer/anamneses/anamnesis-1', expect.any(Object));
      expect(mockShowToast).toHaveBeenCalledWith('Anamnese atualizada com sucesso!', 'success');
    });
  });

  it('shows confirm dialog when "Excluir" is clicked via menu', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Opções de Anamnese Saúde Geral' }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(screen.getByText(/excluir "anamnese saúde geral"/i)).toBeInTheDocument();
  });

  it('deletes anamnesis after confirm and shows success toast', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    api.delete.mockResolvedValue({});
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Opções de Anamnese Saúde Geral' }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/trainer/anamneses/anamnesis-1');
      expect(mockShowToast).toHaveBeenCalledWith('Anamnese excluída com sucesso!', 'success');
    });
  });

  it('cancels delete when "Cancelar" is clicked', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Opções de Anamnese Saúde Geral' }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('shows error toast when fetch fails', async () => {
    const error = { userMessage: 'Erro ao carregar' };
    api.get.mockRejectedValue(error);
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Erro ao carregar', 'error');
    });
  });
});
