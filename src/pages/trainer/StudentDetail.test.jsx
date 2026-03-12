import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRoute } from '../../test/test-utils';
import StudentDetail from './StudentDetail';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

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

  it('renders tab buttons for "Rotinas" and "Anamneses"', async () => {
    renderStudentDetail();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Rotinas' })).toBeInTheDocument();
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
      expect(screen.getByText('01/01/2025 – 31/03/2025')).toBeInTheDocument();
    });
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

  it('renders linked anamneses on anamneses tab', async () => {
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
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Anamneses' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Anamneses' }));
    await waitFor(() => {
      expect(screen.getByText('Anamnese de Saúde')).toBeInTheDocument();
    });
  });

  it('opens link form when "Vincular Anamnese" button is clicked', async () => {
    const user = userEvent.setup();
    renderStudentDetail();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Anamneses' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Anamneses' }));
    await waitFor(() => {
      expect(screen.getByText('+ Vincular Anamnese')).toBeInTheDocument();
    });
    await user.click(screen.getByText('+ Vincular Anamnese'));
    await waitFor(() => {
      expect(screen.getByLabelText('Selecionar anamnese')).toBeInTheDocument();
    });
  });

  it('links anamnesis and shows success toast', async () => {
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
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Anamneses' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Anamneses' }));
    await waitFor(() => {
      expect(screen.getByText('+ Vincular Anamnese')).toBeInTheDocument();
    });
    await user.click(screen.getByText('+ Vincular Anamnese'));
    await waitFor(() => {
      expect(screen.getByLabelText('Selecionar anamnese')).toBeInTheDocument();
    });
    await user.selectOptions(screen.getByLabelText('Selecionar anamnese'), 'anamnesis-1');
    await user.click(screen.getByRole('button', { name: 'Vincular' }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/students/student-1/anamneses',
        { anamnesisId: 'anamnesis-1' },
      );
      expect(mockShowToast).toHaveBeenCalledWith('Anamnese vinculada com sucesso!', 'success');
    });
  });

  it('shows confirm dialog when "Desvincular" is clicked', async () => {
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
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Anamneses' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Anamneses' }));
    await waitFor(() => {
      expect(screen.getByText('Anamnese de Saúde')).toBeInTheDocument();
    });
    await user.click(screen.getByText('Desvincular'));
    expect(screen.getByText(/desvincular a anamnese "anamnese de saúde"/i)).toBeInTheDocument();
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
