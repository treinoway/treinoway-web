import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter, renderWithRoute } from '../../test/test-utils';
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
    parentId: null,
    version: 1,
    sections: [{ id: 's1' }, { id: 's2' }],
    updatedAt: '2026-04-08T10:00:00Z',
    createdAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'anamnesis-2',
    title: 'Anamnese Geral da Plataforma',
    description: null,
    isGeneral: true,
    parentId: null,
    version: 3,
    sections: [],
    updatedAt: '2026-04-12T10:00:00Z',
    createdAt: '2026-01-01T10:00:00Z',
  },
  {
    id: 'anamnesis-3',
    title: 'Anamnese Derivada',
    description: null,
    isGeneral: false,
    parentId: 'anamnesis-2',
    version: 1,
    sections: [],
    updatedAt: '2026-04-05T10:00:00Z',
    createdAt: '2026-04-05T10:00:00Z',
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

  it('shows CTA button in empty state that opens the create form', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Nenhuma anamnese ainda')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /criar primeira anamnese/i }));
    expect(screen.getByLabelText(/^nome/i)).toBeInTheDocument();
  });

  it('renders 3 anamneses with correct origin badges', async () => {
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    });
    expect(screen.getByText('Anamnese Geral da Plataforma')).toBeInTheDocument();
    expect(screen.getByText('Anamnese Derivada')).toBeInTheDocument();
    expect(screen.getByText('MINHA')).toBeInTheDocument();
    expect(screen.getByText('GERAL')).toBeInTheDocument();
    expect(screen.getByText('DERIVADA')).toBeInTheDocument();
  });

  it('filters to only own anamneses when "Meus" chip is clicked', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /^meus$/i }));

    expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    expect(screen.getByText('Anamnese Derivada')).toBeInTheDocument();
    expect(screen.queryByText('Anamnese Geral da Plataforma')).not.toBeInTheDocument();
  });

  it('filters to only general anamneses when "Gerais" chip is clicked', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /^gerais$/i }));

    expect(screen.getByText('Anamnese Geral da Plataforma')).toBeInTheDocument();
    expect(screen.queryByText('Anamnese Saúde Geral')).not.toBeInTheDocument();
    expect(screen.queryByText('Anamnese Derivada')).not.toBeInTheDocument();
  });

  it('filters rows by search query (case-insensitive)', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    });

    await user.type(screen.getByRole('textbox', { name: /buscar anamnese/i }), 'saúde');

    expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    expect(screen.queryByText('Anamnese Geral da Plataforma')).not.toBeInTheDocument();
    expect(screen.queryByText('Anamnese Derivada')).not.toBeInTheDocument();
  });

  it('navigates to anamnesis detail when row is clicked', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRoute(<TrainerAnamneses />, {
      route: '/trainer/anamneses',
      path: '/trainer/anamneses',
    });
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /abrir anamnese saúde geral/i }));

    await waitFor(() => {
      expect(screen.getByTestId('redirected')).toBeInTheDocument();
    });
  });

  it('opens confirm dialog when "Excluir" is clicked via row menu', async () => {
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

  it('calls DELETE and shows toast after confirm delete', async () => {
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

  it('does not call DELETE when cancel is clicked in confirm dialog', async () => {
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

  it('calls fork endpoint and navigates on "Nova versão"', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    api.post.mockResolvedValue({ data: { id: 'forked-id' } });
    renderWithRoute(<TrainerAnamneses />, {
      route: '/trainer/anamneses',
      path: '/trainer/anamneses',
    });
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Opções de Anamnese Saúde Geral' }));
    await user.click(screen.getByRole('button', { name: 'Nova versão' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/anamneses/anamnesis-1/fork');
      expect(mockShowToast).toHaveBeenCalledWith('Nova versão criada com sucesso!', 'success');
    });
    await waitFor(() => {
      expect(screen.getByTestId('redirected')).toBeInTheDocument();
    });
  });

  it('calls copy endpoint and navigates when "Duplicar" is clicked on general anamnesis', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    api.post.mockResolvedValue({ data: { id: 'copied-id' } });
    renderWithRoute(<TrainerAnamneses />, {
      route: '/trainer/anamneses',
      path: '/trainer/anamneses',
    });
    await waitFor(() => {
      expect(screen.getByText('Anamnese Geral da Plataforma')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Opções de Anamnese Geral da Plataforma' }));
    await user.click(screen.getByRole('button', { name: 'Duplicar' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/trainer/anamneses/anamnesis-2/copy');
      expect(mockShowToast).toHaveBeenCalledWith('Anamnese copiada com sucesso!', 'success');
    });
    await waitFor(() => {
      expect(screen.getByTestId('redirected')).toBeInTheDocument();
    });
  });

  it('submitting create form calls POST and navigates to new anamnesis', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [] });
    api.post.mockResolvedValue({ data: { id: 'new-id' } });
    renderWithRoute(<TrainerAnamneses />, {
      route: '/trainer/anamneses',
      path: '/trainer/anamneses',
    });
    await waitFor(() => {
      expect(screen.queryByText(/carregando/i)).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /criar primeira anamnese/i }));
    await user.type(screen.getByLabelText(/^nome/i), 'Nova Anamnese Teste');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/anamneses',
        expect.objectContaining({ title: 'Nova Anamnese Teste' }),
      );
      expect(mockShowToast).toHaveBeenCalledWith('Anamnese criada com sucesso!', 'success');
    });
    await waitFor(() => {
      expect(screen.getByTestId('redirected')).toBeInTheDocument();
    });
  });

  it('shows the edit form prefilled when "Editar" is clicked via row menu', async () => {
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
      expect(api.patch).toHaveBeenCalledWith(
        '/trainer/anamneses/anamnesis-1',
        expect.any(Object),
      );
      expect(mockShowToast).toHaveBeenCalledWith('Anamnese atualizada com sucesso!', 'success');
    });
  });

  it('shows error toast when fetch fails', async () => {
    const error = { userMessage: 'Erro ao carregar' };
    api.get.mockRejectedValue(error);
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Erro ao carregar', 'error');
    });
  });

  it('shows version badge for every anamnesis', async () => {
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese Saúde Geral')).toBeInTheDocument();
    });
    // version badges: v1 (×2 own + derived), v3 (general)
    expect(screen.getByText('v3')).toBeInTheDocument();
    expect(screen.getAllByText('v1').length).toBeGreaterThanOrEqual(2);
  });

  it('general anamnesis does not show "Nova versão" option', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockAnamneses });
    renderWithRouter(<TrainerAnamneses />);
    await waitFor(() => {
      expect(screen.getByText('Anamnese Geral da Plataforma')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Opções de Anamnese Geral da Plataforma' }));
    expect(screen.queryByRole('button', { name: 'Nova versão' })).not.toBeInTheDocument();
  });
});
