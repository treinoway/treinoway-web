import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { selectOption } from '../../test-utils/selectOption';
import { renderWithRoute } from '../../test/test-utils';
import StudentDetail from './StudentDetail';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
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

const mockLinkedAnamneses = [
  {
    id: 'link-1',
    createdAt: '2026-01-15',
    anamnesis: {
      id: 'anamnesis-1',
      title: 'Anamnese de Saúde',
      isGeneral: false,
    },
  },
];

const mockShowToast = vi.fn();

function renderStudentDetail({ withState = true } = {}) {
  api.get.mockImplementation((url) => {
    if (url === '/trainer/students') return Promise.resolve({ data: [mockStudent] });
    if (url === '/trainer/protocols') return Promise.resolve({ data: mockProtocols });
    if (url === '/trainer/students/student-1/anamneses') return Promise.resolve({ data: [] });
    if (url === '/trainer/anamneses') return Promise.resolve({ data: [] });
    return Promise.resolve({ data: [] });
  });

  const route = withState
    ? { pathname: '/trainer/students/student-1', state: { student: mockStudent } }
    : '/trainer/students/student-1';

  return renderWithRoute(<StudentDetail />, {
    route,
    path: '/trainer/students/:id',
  });
}

describe('StudentDetail', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    mockNavigate.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
    api.get.mockReset();
    api.post.mockReset();
    api.delete.mockReset();
  });

  it('shows loading state while fetching student info', async () => {
    api.get.mockReturnValue(new Promise(() => {}));
    renderWithRoute(<StudentDetail />, {
      route: '/trainer/students/student-1',
      path: '/trainer/students/:id',
    });
    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  it('renders student avatar initial and name from location state', async () => {
    renderStudentDetail();
    await waitFor(() => {
      expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument();
    });
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('renders student email from location state', async () => {
    renderStudentDetail();
    await waitFor(() => {
      expect(screen.getByText('aluno@example.com')).toBeInTheDocument();
    });
  });

  it('renders tab buttons for "Rotinas", "Atividade" and "Anamneses"', async () => {
    renderStudentDetail();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Rotinas' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Atividade' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Anamneses' })).toBeInTheDocument();
    });
  });

  it('shows protocols tab by default with protocol list', async () => {
    renderStudentDetail();
    await waitFor(() => {
      expect(screen.getByText('Protocolo Full Body')).toBeInTheDocument();
    });
    expect(screen.getByText('Protocolo Cardio')).toBeInTheDocument();
  });

  it('shows "Ativo" badge for active protocols', async () => {
    renderStudentDetail();
    await waitFor(() => {
      expect(screen.getByText('Ativo')).toBeInTheDocument();
    });
  });

  it('shows "Concluído" badge for completed protocols', async () => {
    renderStudentDetail();
    await waitFor(() => {
      expect(screen.getByText('Concluído')).toBeInTheDocument();
    });
  });

  it('shows dates formatted as DD/MM/YYYY', async () => {
    renderStudentDetail();
    await waitFor(() => {
      expect(screen.getByText(/01\/01\/2025/)).toBeInTheDocument();
      expect(screen.getByText(/31\/03\/2025/)).toBeInTheDocument();
    });
  });

  it('navigates to protocol detail when protocol card is clicked', async () => {
    const user = userEvent.setup();
    renderStudentDetail();
    await waitFor(() => {
      expect(screen.getByText('Protocolo Full Body')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Protocolo Full Body'));

    expect(mockNavigate).toHaveBeenCalledWith('/trainer/protocols/proto-1');
  });

  it('renders 3-dot menu on each protocol card', async () => {
    renderStudentDetail();
    await waitFor(() => {
      expect(screen.getByText('Protocolo Full Body')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /ações da rotina protocolo full body/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ações da rotina protocolo cardio/i })).toBeInTheDocument();
  });

  it('opens menu without navigating when the menu trigger is clicked', async () => {
    const user = userEvent.setup();
    renderStudentDetail();
    await waitFor(() => {
      expect(screen.getByText('Protocolo Full Body')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /ações da rotina protocolo full body/i }));

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Abrir' })).toBeInTheDocument();
  });

  it('navigates via "Abrir" menu option', async () => {
    const user = userEvent.setup();
    renderStudentDetail();
    await waitFor(() => {
      expect(screen.getByText('Protocolo Full Body')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /ações da rotina protocolo full body/i }));
    await user.click(screen.getByRole('button', { name: 'Abrir' }));

    expect(mockNavigate).toHaveBeenCalledWith('/trainer/protocols/proto-1');
  });

  it('disables "Excluir" in menu for active protocols', async () => {
    const user = userEvent.setup();
    renderStudentDetail();
    await waitFor(() => {
      expect(screen.getByText('Protocolo Full Body')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /ações da rotina protocolo full body/i }));

    const deleteBtn = screen.getByRole('button', { name: 'Excluir' });
    expect(deleteBtn).toBeDisabled();
    expect(deleteBtn).toHaveAttribute('title', 'Arquive a rotina antes de excluir');
  });

  it('enables "Excluir" in menu for non-active protocols', async () => {
    const user = userEvent.setup();
    renderStudentDetail();
    await waitFor(() => {
      expect(screen.getByText('Protocolo Cardio')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /ações da rotina protocolo cardio/i }));

    expect(screen.getByRole('button', { name: 'Excluir' })).not.toBeDisabled();
  });

  it('deletes a protocol via the menu and shows success toast', async () => {
    const user = userEvent.setup();
    api.delete.mockResolvedValue({});
    renderStudentDetail();
    await waitFor(() => {
      expect(screen.getByText('Protocolo Cardio')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /ações da rotina protocolo cardio/i }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(screen.getByText(/tem certeza que deseja excluir esta rotina/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^confirmar$/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/trainer/protocols/proto-2');
      expect(mockShowToast).toHaveBeenCalledWith('Rotina excluída', 'success');
    });
  });

  it('shows error toast when delete fails', async () => {
    const user = userEvent.setup();
    api.delete.mockRejectedValue({ userMessage: 'Rotinas ativas não podem ser excluídas. Arquive a rotina antes.' });
    renderStudentDetail();
    await waitFor(() => {
      expect(screen.getByText('Protocolo Cardio')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /ações da rotina protocolo cardio/i }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    await user.click(screen.getByRole('button', { name: /^confirmar$/i }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        'Rotinas ativas não podem ser excluídas. Arquive a rotina antes.',
        'error',
      );
    });
  });

  it('closes confirm dialog on "Cancelar" without calling delete', async () => {
    const user = userEvent.setup();
    renderStudentDetail();
    await waitFor(() => {
      expect(screen.getByText('Protocolo Cardio')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /ações da rotina protocolo cardio/i }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    await user.click(screen.getByRole('button', { name: /^cancelar$/i }));

    expect(screen.queryByText(/tem certeza que deseja excluir esta rotina/i)).not.toBeInTheDocument();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('shows empty state when no protocols', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/trainer/students') return Promise.resolve({ data: [mockStudent] });
      if (url === '/trainer/protocols') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });
    renderWithRoute(<StudentDetail />, {
      route: { pathname: '/trainer/students/student-1', state: { student: mockStudent } },
      path: '/trainer/students/:id',
    });
    await waitFor(() => {
      expect(screen.getByText('Nenhuma rotina encontrada')).toBeInTheDocument();
    });
  });

  it('switches to anamneses tab when "Anamneses" button is clicked', async () => {
    const user = userEvent.setup();
    renderStudentDetail();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Anamneses' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Anamneses' }));
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/trainer/students/student-1/anamneses');
    });
  });

  it('shows "Vincular Anamnese" button on anamneses tab', async () => {
    const user = userEvent.setup();
    renderStudentDetail();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Anamneses' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Anamneses' }));
    await waitFor(() => {
      expect(screen.getByText('+ Vincular Anamnese')).toBeInTheDocument();
    });
  });

  it('shows empty state on anamneses tab when no anamneses linked', async () => {
    const user = userEvent.setup();
    renderStudentDetail();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Anamneses' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Anamneses' }));
    await waitFor(() => {
      expect(screen.getByText('Nenhuma anamnese vinculada')).toBeInTheDocument();
    });
  });

  it('renders linked anamnesis cards with title', async () => {
    const user = userEvent.setup();
    api.get.mockImplementation((url) => {
      if (url === '/trainer/students') return Promise.resolve({ data: [mockStudent] });
      if (url === '/trainer/protocols') return Promise.resolve({ data: [] });
      if (url === '/trainer/students/student-1/anamneses') return Promise.resolve({ data: mockLinkedAnamneses });
      return Promise.resolve({ data: [] });
    });
    renderWithRoute(<StudentDetail />, {
      route: { pathname: '/trainer/students/student-1', state: { student: mockStudent } },
      path: '/trainer/students/:id',
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Anamneses' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Anamneses' }));
    await waitFor(() => {
      expect(screen.getByText('Anamnese de Saúde')).toBeInTheDocument();
    });
  });

  it('renders "Ver respostas" and "Abrir template" buttons for each linked anamnesis', async () => {
    const user = userEvent.setup();
    api.get.mockImplementation((url) => {
      if (url === '/trainer/students') return Promise.resolve({ data: [mockStudent] });
      if (url === '/trainer/protocols') return Promise.resolve({ data: [] });
      if (url === '/trainer/students/student-1/anamneses') return Promise.resolve({ data: mockLinkedAnamneses });
      return Promise.resolve({ data: [] });
    });
    renderWithRoute(<StudentDetail />, {
      route: { pathname: '/trainer/students/student-1', state: { student: mockStudent } },
      path: '/trainer/students/:id',
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Anamneses' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Anamneses' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Ver respostas' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Abrir template' })).toBeInTheDocument();
    });
  });

  it('"Ver respostas" navigates to the response detail route', async () => {
    const user = userEvent.setup();
    api.get.mockImplementation((url) => {
      if (url === '/trainer/students') return Promise.resolve({ data: [mockStudent] });
      if (url === '/trainer/protocols') return Promise.resolve({ data: [] });
      if (url === '/trainer/students/student-1/anamneses') return Promise.resolve({ data: mockLinkedAnamneses });
      return Promise.resolve({ data: [] });
    });
    renderWithRoute(<StudentDetail />, {
      route: { pathname: '/trainer/students/student-1', state: { student: mockStudent } },
      path: '/trainer/students/:id',
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Anamneses' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Anamneses' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ver respostas' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Ver respostas' }));

    expect(mockNavigate).toHaveBeenCalledWith(
      '/trainer/students/student-1/anamneses/anamnesis-1/response',
    );
  });

  it('"Abrir template" navigates to the anamnesis detail route', async () => {
    const user = userEvent.setup();
    api.get.mockImplementation((url) => {
      if (url === '/trainer/students') return Promise.resolve({ data: [mockStudent] });
      if (url === '/trainer/protocols') return Promise.resolve({ data: [] });
      if (url === '/trainer/students/student-1/anamneses') return Promise.resolve({ data: mockLinkedAnamneses });
      return Promise.resolve({ data: [] });
    });
    renderWithRoute(<StudentDetail />, {
      route: { pathname: '/trainer/students/student-1', state: { student: mockStudent } },
      path: '/trainer/students/:id',
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Anamneses' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Anamneses' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Abrir template' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Abrir template' }));

    expect(mockNavigate).toHaveBeenCalledWith('/trainer/anamneses/anamnesis-1');
  });

  it('"Desvincular" opens confirm dialog', async () => {
    const user = userEvent.setup();
    api.get.mockImplementation((url) => {
      if (url === '/trainer/students') return Promise.resolve({ data: [mockStudent] });
      if (url === '/trainer/protocols') return Promise.resolve({ data: [] });
      if (url === '/trainer/students/student-1/anamneses') return Promise.resolve({ data: mockLinkedAnamneses });
      return Promise.resolve({ data: [] });
    });
    renderWithRoute(<StudentDetail />, {
      route: { pathname: '/trainer/students/student-1', state: { student: mockStudent } },
      path: '/trainer/students/:id',
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Anamneses' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Anamneses' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Desvincular' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Desvincular' }));

    expect(screen.getByText(/desvincular a anamnese "anamnese de saúde"/i)).toBeInTheDocument();
  });

  it('"Desvincular" confirmed calls api.delete and shows success toast', async () => {
    const user = userEvent.setup();
    api.delete.mockResolvedValue({});
    api.get.mockImplementation((url) => {
      if (url === '/trainer/students') return Promise.resolve({ data: [mockStudent] });
      if (url === '/trainer/protocols') return Promise.resolve({ data: [] });
      if (url === '/trainer/students/student-1/anamneses') return Promise.resolve({ data: mockLinkedAnamneses });
      return Promise.resolve({ data: [] });
    });
    renderWithRoute(<StudentDetail />, {
      route: { pathname: '/trainer/students/student-1', state: { student: mockStudent } },
      path: '/trainer/students/:id',
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Anamneses' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Anamneses' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Desvincular' })).toBeInTheDocument());
    // Open the confirm dialog
    await user.click(screen.getByRole('button', { name: 'Desvincular' }));
    // Now both the card button and the confirm dialog btn-danger are present;
    // pick the last one (confirm dialog's destructive button)
    const desvincularBtns = screen.getAllByRole('button', { name: /desvincular/i });
    await user.click(desvincularBtns[desvincularBtns.length - 1]);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith(
        '/trainer/students/student-1/anamneses/anamnesis-1',
      );
      expect(mockShowToast).toHaveBeenCalledWith('Anamnese desvinculada com sucesso!', 'success');
    });
  });

  it('opens link form (picker modal) when "Vincular Anamnese" is clicked', async () => {
    const user = userEvent.setup();
    renderStudentDetail();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Anamneses' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Anamneses' }));
    await waitFor(() => expect(screen.getByText('+ Vincular Anamnese')).toBeInTheDocument());
    await user.click(screen.getByText('+ Vincular Anamnese'));
    await waitFor(() => {
      expect(screen.getByLabelText('Selecionar anamnese')).toBeInTheDocument();
    });
  });

  it('links anamnesis via picker modal and shows success toast', async () => {
    const user = userEvent.setup();
    api.get.mockImplementation((url) => {
      if (url === '/trainer/students') return Promise.resolve({ data: [mockStudent] });
      if (url === '/trainer/protocols') return Promise.resolve({ data: [] });
      if (url === '/trainer/students/student-1/anamneses') return Promise.resolve({ data: [] });
      if (url === '/trainer/anamneses') return Promise.resolve({ data: [
        { id: 'anamnesis-1', title: 'Anamnese de Saúde', isGeneral: false },
      ]});
      return Promise.resolve({ data: [] });
    });
    api.post.mockResolvedValue({ data: {} });

    renderWithRoute(<StudentDetail />, {
      route: { pathname: '/trainer/students/student-1', state: { student: mockStudent } },
      path: '/trainer/students/:id',
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Anamneses' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Anamneses' }));
    await waitFor(() => expect(screen.getByText('+ Vincular Anamnese')).toBeInTheDocument());
    await user.click(screen.getByText('+ Vincular Anamnese'));
    await waitFor(() => expect(screen.getByLabelText('Selecionar anamnese')).toBeInTheDocument());
    await selectOption(user, screen.getByLabelText('Selecionar anamnese'), 'anamnesis-1');
    await user.click(screen.getByRole('button', { name: 'Vincular' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/students/student-1/anamneses',
        { anamnesisId: 'anamnesis-1' },
      );
      expect(mockShowToast).toHaveBeenCalledWith('Anamnese vinculada com sucesso!', 'success');
    });
  });

  it('fallback: fetches /trainer/students when no location state', async () => {
    renderStudentDetail({ withState: false });
    await waitFor(() => {
      expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument();
    });
    expect(api.get).toHaveBeenCalledWith('/trainer/students');
  });

  it('shows toast on protocols fetch error', async () => {
    const error = { userMessage: 'Erro ao carregar rotinas' };
    api.get.mockImplementation((url) => {
      if (url === '/trainer/students') return Promise.resolve({ data: [mockStudent] });
      if (url === '/trainer/protocols') return Promise.reject(error);
      return Promise.resolve({ data: [] });
    });
    renderWithRoute(<StudentDetail />, {
      route: { pathname: '/trainer/students/student-1', state: { student: mockStudent } },
      path: '/trainer/students/:id',
    });
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Erro ao carregar rotinas', 'error');
    });
  });

  it('renders back button link to /trainer/students', async () => {
    renderStudentDetail();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /voltar para alunos/i })).toBeInTheDocument();
    });
  });
});
