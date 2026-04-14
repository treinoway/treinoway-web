import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import ProtocolTemplates from './ProtocolTemplates';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

vi.mock('../../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
    delete: vi.fn(),
  },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockShowToast = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockTemplates = [
  {
    id: 1,
    name: 'Modelo Força',
    description: 'Protocolo de força',
    defaultDurationWeeks: 12,
    genderOrdination: 'male',
    trainingLevel: 'intermediate',
    type: 'strength',
    scheduleTemplatesCount: 3,
  },
  {
    id: 2,
    name: 'Modelo Cardio',
    description: 'Protocolo de cardio',
    defaultDurationWeeks: 8,
    trainingLevel: 'beginner',
    type: 'cardio',
    scheduleTemplatesCount: 2,
  },
];

describe('ProtocolTemplates', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    mockNavigate.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockImplementation((url) => {
      if (url === '/trainer/protocol-templates') return Promise.resolve({ data: mockTemplates });
      return Promise.resolve({ data: [] });
    });
    api.delete.mockReset();
  });

  it('renders the page title', async () => {
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Rotinas' })).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderWithRouter(<ProtocolTemplates />);
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('shows error toast when fetch fails', async () => {
    api.get.mockRejectedValue({ userMessage: 'Falha ao carregar rotinas' });
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Falha ao carregar rotinas', 'error');
    });
  });

  it('displays templates after loading', async () => {
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Modelo Força')).toBeInTheDocument();
      expect(screen.getByText('Modelo Cardio')).toBeInTheDocument();
    });
  });

  it('shows empty state when no templates', async () => {
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Nenhuma rotina ainda')).toBeInTheDocument();
    });
  });

  it('shows + Nova rotina button when templates exist', async () => {
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /nova rotina/i })).toBeInTheDocument();
    });
  });

  it('navigates to /new when clicking + Nova rotina', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /nova rotina/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /nova rotina/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/protocol-templates/new');
  });

  it('navigates to /new from empty state button', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [] });
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /criar primeira rotina/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /criar primeira rotina/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/protocol-templates/new');
  });

  it('shows confirm dialog before deleting', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Modelo Força')).toBeInTheDocument();
    });

    const menuBtn = screen.getAllByRole('button', { name: /ações da rotina/i })[0];
    await user.click(menuBtn);

    const deleteBtn = screen.getByRole('button', { name: /excluir/i });
    await user.click(deleteBtn);

    expect(screen.getByText(/excluir "modelo força"/i)).toBeInTheDocument();
  });

  it('deletes template after confirmation', async () => {
    const user = userEvent.setup();
    api.delete.mockResolvedValue({});
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Modelo Força')).toBeInTheDocument();
    });

    const menuBtn = screen.getAllByRole('button', { name: /ações da rotina/i })[0];
    await user.click(menuBtn);

    const deleteBtn = screen.getByRole('button', { name: /excluir/i });
    await user.click(deleteBtn);

    await user.click(screen.getByRole('button', { name: /confirmar/i }));

    expect(api.delete).toHaveBeenCalledWith('/trainer/protocol-templates/1');
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Rotina excluída com sucesso!', 'success');
    });
  });

  it('dismisses confirm dialog on cancel', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Modelo Força')).toBeInTheDocument();
    });

    const menuBtn = screen.getAllByRole('button', { name: /ações da rotina/i })[0];
    await user.click(menuBtn);
    await user.click(screen.getByRole('button', { name: /excluir/i }));

    expect(screen.getByText(/excluir "modelo força"/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(screen.queryByText(/excluir "modelo força"/i)).not.toBeInTheDocument();
  });

  it('shows delete error toast on failure', async () => {
    const user = userEvent.setup();
    api.delete.mockRejectedValue({ userMessage: 'Erro ao excluir' });
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Modelo Força')).toBeInTheDocument();
    });

    const menuBtn = screen.getAllByRole('button', { name: /ações da rotina/i })[0];
    await user.click(menuBtn);
    await user.click(screen.getByRole('button', { name: /excluir/i }));
    await user.click(screen.getByRole('button', { name: /confirmar/i }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Erro ao excluir', 'error');
    });
  });

  it('navigates to edit page when clicking edit on a template', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ProtocolTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Modelo Força')).toBeInTheDocument();
    });

    const menuBtn = screen.getAllByRole('button', { name: /ações da rotina/i })[0];
    await user.click(menuBtn);
    await user.click(screen.getByRole('button', { name: /editar/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/trainer/protocol-templates/1/edit');
  });
});
