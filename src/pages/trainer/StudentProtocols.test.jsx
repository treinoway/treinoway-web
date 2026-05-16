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
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
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
