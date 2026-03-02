import { screen, waitFor } from '@testing-library/react';
import { renderWithRoute } from '../../test/test-utils';
import StudentDetail from './StudentDetail';
import { useToast } from '../../contexts/ToastContext';
import api from '../../api/axios';

vi.mock('../../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn() },
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

const mockShowToast = vi.fn();

function renderWithState(options = {}) {
  const { protocols = [], withState = true } = options;
  api.get.mockImplementation((url) => {
    if (url === '/trainer/students') {
      return Promise.resolve({ data: [mockStudent] });
    }
    if (url === '/trainer/protocols') {
      return Promise.resolve({ data: protocols });
    }
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
    renderWithState({ protocols: [] });
    await waitFor(() => {
      expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument();
    });
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('renders student email from location state', async () => {
    renderWithState({ protocols: [] });
    await waitFor(() => {
      expect(screen.getByText('aluno@example.com')).toBeInTheDocument();
    });
  });

  it('renders protocols list with name and dates', async () => {
    renderWithState({ protocols: mockProtocols });
    await waitFor(() => {
      expect(screen.getByText('Protocolo Full Body')).toBeInTheDocument();
    });
    expect(screen.getByText('Protocolo Cardio')).toBeInTheDocument();
    expect(screen.getByText('01/01/2025 – 31/03/2025')).toBeInTheDocument();
  });

  it('shows "Ativo" badge for active status', async () => {
    renderWithState({ protocols: mockProtocols });
    await waitFor(() => {
      expect(screen.getByText('Ativo')).toBeInTheDocument();
    });
  });

  it('shows "Concluído" badge for completed status', async () => {
    renderWithState({ protocols: mockProtocols });
    await waitFor(() => {
      expect(screen.getByText('Concluído')).toBeInTheDocument();
    });
  });

  it('shows "Cancelado" badge for cancelled status', async () => {
    const cancelledProtocol = [{ id: 'proto-3', name: 'Cancelado Proto', status: 'cancelled', startDate: '2025-01-01', expirationDate: '2025-02-01' }];
    renderWithState({ protocols: cancelledProtocol });
    await waitFor(() => {
      expect(screen.getByText('Cancelado')).toBeInTheDocument();
    });
  });

  it('shows empty state when no protocols', async () => {
    renderWithState({ protocols: [] });
    await waitFor(() => {
      expect(screen.getByText('Nenhuma rotina encontrada')).toBeInTheDocument();
    });
  });

  it('shows "Criar Rotina" link in empty state pointing to new protocol', async () => {
    renderWithState({ protocols: [] });
    await waitFor(() => {
      expect(screen.getByText('Nenhuma rotina encontrada')).toBeInTheDocument();
    });
    const links = screen.getAllByRole('link', { name: /criar rotina/i });
    const emptyStateLink = links.find((l) => l.closest('.empty-state'));
    expect(emptyStateLink).toHaveAttribute('href', '/trainer/protocols/new?studentId=student-1');
  });

  it('shows "Criar Rotina" button in section header', async () => {
    renderWithState({ protocols: [] });
    await waitFor(() => {
      expect(screen.getAllByRole('link', { name: /criar rotina/i }).length).toBeGreaterThan(0);
    });
  });

  it('each protocol card links to protocol detail page', async () => {
    renderWithState({ protocols: mockProtocols });
    await waitFor(() => {
      expect(screen.getByText('Protocolo Full Body')).toBeInTheDocument();
    });
    const proto1Link = screen.getByRole('link', { name: /protocolo full body/i });
    expect(proto1Link).toHaveAttribute('href', '/trainer/protocols/proto-1');
  });

  it('fallback: fetches /trainer/students when no location state', async () => {
    renderWithState({ protocols: [], withState: false });
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
    renderWithState({ protocols: [] });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /voltar para alunos/i })).toBeInTheDocument();
    });
  });
});
