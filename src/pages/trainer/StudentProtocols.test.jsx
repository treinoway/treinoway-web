import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRoute } from '../../test/test-utils';
import StudentProtocols from './StudentProtocols';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn(), patch: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

vi.mock('../../components/RowMenu', () => ({
  default: ({ ariaLabel, onDelete, deleteDisabled, deleteDisabledTitle, extraItems }) => (
    <div>
      <button type="button" aria-label={ariaLabel}>menu</button>
      {extraItems?.map((item) => (
        <button key={item.label} type="button" onClick={item.onClick}>{item.label}</button>
      ))}
      <button
        type="button"
        onClick={onDelete}
        disabled={deleteDisabled}
        title={deleteDisabledTitle}
      >
        Excluir
      </button>
    </div>
  ),
}));

const mockStudent = {
  id: 'student-1',
  firstName: 'Aluno',
  lastName: 'Exemplo',
  email: 'aluno@example.com',
};

const mockProtocols = [
  {
    id: 'proto-1',
    name: 'Protocolo Full Body',
    status: 'active',
    startDate: '2025-01-01',
    expirationDate: '2025-03-31',
  },
  {
    id: 'proto-2',
    name: 'Protocolo Cardio',
    status: 'completed',
    startDate: '2024-07-01',
    expirationDate: '2024-09-30',
  },
  {
    id: 'proto-3',
    name: 'Protocolo Antigo',
    status: 'archived',
    startDate: '2024-01-01',
    expirationDate: '2024-03-31',
  },
];

const mockShowToast = vi.fn();

function setup(protocols = mockProtocols) {
  vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
  api.get.mockImplementation((url) => {
    if (url === '/trainer/protocols') return Promise.resolve({ data: protocols });
    if (url === '/trainer/students') return Promise.resolve({ data: [mockStudent] });
    return Promise.resolve({ data: [] });
  });
  return renderWithRoute(<StudentProtocols />, {
    route: '/trainer/students/student-1/protocols',
    path: '/trainer/students/:id/protocols',
  });
}

describe('StudentProtocols', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    mockNavigate.mockReset();
    api.get.mockReset();
    api.post.mockReset();
    api.delete.mockReset();
    api.patch.mockReset();
  });

  it('shows loading state initially', () => {
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockReturnValue(new Promise(() => {}));
    renderWithRoute(<StudentProtocols />, {
      route: '/trainer/students/student-1/protocols',
      path: '/trainer/students/:id/protocols',
    });
    expect(screen.getByText('Carregando rotinas...')).toBeInTheDocument();
  });

  it('renders protocol names', async () => {
    setup();
    await waitFor(() => expect(screen.getByText('Protocolo Full Body')).toBeInTheDocument());
    expect(screen.getByText('Protocolo Cardio')).toBeInTheDocument();
  });

  it('renders back button', async () => {
    setup();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /voltar para o aluno/i })).toBeInTheDocument(),
    );
  });

  it('back button navigates to student detail', async () => {
    const user = userEvent.setup();
    setup();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /voltar para o aluno/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: /voltar para o aluno/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/students/student-1');
  });

  it('renders "Criar Rotina" link', async () => {
    setup();
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /criar rotina/i })).toBeInTheDocument(),
    );
  });

  it('renders row menus for each protocol', async () => {
    setup();
    await waitFor(() => expect(screen.getByText('Protocolo Full Body')).toBeInTheDocument());
    expect(
      screen.getByRole('button', { name: /ações da rotina protocolo full body/i }),
    ).toBeInTheDocument();
  });

  it('disables Excluir for active protocols', async () => {
    setup();
    await waitFor(() => expect(screen.getByText('Protocolo Full Body')).toBeInTheDocument());
    // Open menu for Protocolo Full Body (active)
    const menus = screen.getAllByRole('button', { name: 'Excluir' });
    // The first protocol is active, its Excluir should be disabled
    expect(menus[0]).toBeDisabled();
  });

  it('shows confirm dialog on delete click for non-active protocol', async () => {
    const user = userEvent.setup();
    setup();
    await waitFor(() => expect(screen.getByText('Protocolo Cardio')).toBeInTheDocument());
    const deleteButtons = screen.getAllByRole('button', { name: 'Excluir' });
    await user.click(deleteButtons[1]); // second protocol (completed)
    expect(screen.getByText(/excluir rotina "protocolo cardio"/i)).toBeInTheDocument();
  });

  it('confirms delete and shows success toast', async () => {
    const user = userEvent.setup();
    api.delete.mockResolvedValue({});
    setup();
    await waitFor(() => expect(screen.getByText('Protocolo Cardio')).toBeInTheDocument());
    const deleteButtons = screen.getAllByRole('button', { name: 'Excluir' });
    await user.click(deleteButtons[1]);
    await user.click(screen.getByRole('button', { name: /^confirmar$/i }));
    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/trainer/protocols/proto-2');
      expect(mockShowToast).toHaveBeenCalledWith('Rotina excluída', 'success');
    });
  });

  it('cancels delete dialog without calling api.delete', async () => {
    const user = userEvent.setup();
    setup();
    await waitFor(() => expect(screen.getByText('Protocolo Cardio')).toBeInTheDocument());
    const deleteButtons = screen.getAllByRole('button', { name: 'Excluir' });
    await user.click(deleteButtons[1]);
    await user.click(screen.getByRole('button', { name: /^cancelar$/i }));
    expect(screen.queryByText(/excluir rotina/i)).not.toBeInTheDocument();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('shows empty state when no protocols', async () => {
    setup([]);
    await waitFor(() =>
      expect(screen.getByText('Nenhuma rotina encontrada')).toBeInTheDocument(),
    );
  });

  it('navigates to protocol detail on row click', async () => {
    const user = userEvent.setup();
    setup();
    await waitFor(() => expect(screen.getByText('Protocolo Full Body')).toBeInTheDocument());
    await user.click(screen.getByText('Protocolo Full Body'));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/protocols/proto-1');
  });

  it('shows "Arquivar" for active and completed protocols, "Desarquivar" for archived ones', async () => {
    setup();
    await waitFor(() => expect(screen.getByText('Protocolo Full Body')).toBeInTheDocument());
    expect(screen.getAllByRole('button', { name: 'Arquivar' })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Desarquivar' })).toBeInTheDocument();
  });

  it('shows reinforced warning when archiving an active routine, and archives on confirm', async () => {
    const user = userEvent.setup();
    api.patch.mockResolvedValue({});
    setup();
    await waitFor(() => expect(screen.getByText('Protocolo Full Body')).toBeInTheDocument());
    const archiveButtons = screen.getAllByRole('button', { name: 'Arquivar' });
    await user.click(archiveButtons[0]); // Protocolo Full Body (active)
    expect(
      screen.getByText(/arquivar rotina "protocolo full body"\? o aluno ficará sem rotina ativa/i),
    ).toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /^confirmar$/i }));
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/trainer/protocols/proto-1', { status: 'archived' });
      expect(mockShowToast).toHaveBeenCalledWith('Rotina arquivada', 'success');
    });
  });

  it('cancels the archive warning dialog without calling api.patch', async () => {
    const user = userEvent.setup();
    setup();
    await waitFor(() => expect(screen.getByText('Protocolo Full Body')).toBeInTheDocument());
    const archiveButtons = screen.getAllByRole('button', { name: 'Arquivar' });
    await user.click(archiveButtons[0]);
    await user.click(screen.getByRole('button', { name: /^cancelar$/i }));
    expect(screen.queryByText(/arquivar rotina/i)).not.toBeInTheDocument();
    expect(api.patch).not.toHaveBeenCalled();
  });

  it('archives a non-active (completed) routine directly, without the reinforced dialog', async () => {
    const user = userEvent.setup();
    api.patch.mockResolvedValue({});
    setup();
    await waitFor(() => expect(screen.getByText('Protocolo Cardio')).toBeInTheDocument());
    const archiveButtons = screen.getAllByRole('button', { name: 'Arquivar' });
    await user.click(archiveButtons[1]); // Protocolo Cardio (completed)
    expect(screen.queryByText(/arquivar rotina/i)).not.toBeInTheDocument();
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/trainer/protocols/proto-2', { status: 'archived' });
      expect(mockShowToast).toHaveBeenCalledWith('Rotina arquivada', 'success');
    });
  });

  it('unarchives directly, without the reinforced dialog, and PATCHes status active', async () => {
    const user = userEvent.setup();
    api.patch.mockResolvedValue({});
    setup();
    await waitFor(() => expect(screen.getByText('Protocolo Antigo')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Desarquivar' }));
    expect(screen.queryByText(/arquivar rotina/i)).not.toBeInTheDocument();
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/trainer/protocols/proto-3', { status: 'active' });
      expect(mockShowToast).toHaveBeenCalledWith('Rotina reativada', 'success');
    });
  });

  it('shows error toast when the archive PATCH fails', async () => {
    const user = userEvent.setup();
    api.patch.mockRejectedValue({ userMessage: 'Erro ao arquivar' });
    setup();
    await waitFor(() => expect(screen.getByText('Protocolo Full Body')).toBeInTheDocument());
    const archiveButtons = screen.getAllByRole('button', { name: 'Arquivar' });
    await user.click(archiveButtons[0]);
    await user.click(screen.getByRole('button', { name: /^confirmar$/i }));
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Erro ao arquivar', 'error');
    });
  });

  it('shows toast on fetch error', async () => {
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockImplementation((url) => {
      if (url === '/trainer/protocols') return Promise.reject({ userMessage: 'Erro ao carregar' });
      return Promise.resolve({ data: [] });
    });
    renderWithRoute(<StudentProtocols />, {
      route: '/trainer/students/student-1/protocols',
      path: '/trainer/students/:id/protocols',
    });
    await waitFor(() =>
      expect(mockShowToast).toHaveBeenCalledWith('Erro ao carregar', 'error'),
    );
  });
});
