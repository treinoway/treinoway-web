import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { selectOption } from '../../test-utils/selectOption';
import { renderWithRoute } from '../../test/test-utils';
import StudentDetail from './StudentDetail';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAiChat } from '../../contexts/AiChatContext';
import api from '../../api/axios';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../contexts/AiChatContext', () => ({ useAiChat: vi.fn() }));

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

vi.mock('../../hooks/useStudentDashboard', () => ({
  default: () => ({
    summary: { data: null, loading: false, error: null },
    previousSummary: { data: null, loading: false, error: null },
    recentSessions: { data: null, loading: false, error: null },
    progression: { data: null, loading: false, error: null },
    dailyActivity: { data: null, loading: false, error: null },
    studentNotFound: false,
    retryBlock: vi.fn(),
  }),
}));

vi.mock('../../hooks/usePeriodPersistence', () => ({
  default: () => [
    { presetKey: 'last-30-days', from: '2026-04-15', to: '2026-05-15' },
    vi.fn(),
  ],
}));

vi.mock('../../components/StudentCockpitHero', () => ({
  default: ({ student, onCreateProtocol, onLinkAnamnesis, onPeriodClick, periodLabel }) => (
    <div data-testid="cockpit-hero">
      {student?.firstName && <span>{student.firstName} {student.lastName}</span>}
      {student?.email && <span>{student.email}</span>}
      <button type="button" onClick={onCreateProtocol}>Nova rotina</button>
      <button type="button" onClick={onLinkAnamnesis}>Vincular anamnese</button>
      <button type="button" onClick={onPeriodClick}>
        {periodLabel ?? 'Período'}
      </button>
    </div>
  ),
}));

vi.mock('../../components/RecentSessionsPanel', () => ({
  default: () => <div data-testid="recent-sessions" />,
}));

vi.mock('../../components/ProgressionPanel', () => ({
  default: () => <div data-testid="progression-panel" />,
}));

vi.mock('../../components/PeriodPickerSheet', () => ({
  default: ({ open, onApply, onCancel }) =>
    open ? (
      <div data-testid="period-picker">
        <button onClick={() => onApply({ presetKey: 'last-30-days', from: '2026-04-15', to: '2026-05-15' })}>
          Aplicar
        </button>
        <button onClick={onCancel}>Fechar picker</button>
      </div>
    ) : null,
}));

vi.mock('../../components/IArnoldFAB', () => ({
  default: () => <div data-testid="iarnold-fab" />,
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
    name: 'Rotina Ativa',
    status: 'active',
    startDate: '2025-01-01',
    expirationDate: '2025-03-31',
  },
  {
    id: 'proto-2',
    name: 'Rotina Arquivada',
    status: 'completed',
    startDate: '2024-07-01',
    expirationDate: '2024-09-30',
  },
];

const mockLinkedAnamneses = [
  {
    id: 'link-1',
    createdAt: '2026-01-15',
    anamnesis: { id: 'anam-1', title: 'Anamnese de Saúde', isGeneral: false },
  },
];

const mockShowToast = vi.fn();
const mockSendMessage = vi.fn();

function setupMocks(overrides = {}) {
  vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
  vi.mocked(useAuth).mockReturnValue({ user: { id: 'trainer-1' } });
  vi.mocked(useAiChat).mockReturnValue({ sendMessage: mockSendMessage });

  api.get.mockImplementation((url) => {
    if (url === '/trainer/students') return Promise.resolve({ data: [mockStudent] });
    if (url === '/trainer/protocols') return Promise.resolve({ data: overrides.protocols ?? mockProtocols });
    if (url === '/trainer/students/student-1/anamneses') return Promise.resolve({ data: overrides.anamneses ?? [] });
    if (url === '/trainer/anamneses') return Promise.resolve({ data: overrides.allAnamneses ?? [] });
    return Promise.resolve({ data: [] });
  });
}

function renderDetail({ withState = true } = {}) {
  const route = withState
    ? { pathname: '/trainer/students/student-1', state: { student: mockStudent } }
    : '/trainer/students/student-1';
  return renderWithRoute(<StudentDetail />, { route, path: '/trainer/students/:id' });
}

describe('StudentDetail (cockpit)', () => {
  beforeEach(() => {
    mockShowToast.mockReset();
    mockNavigate.mockReset();
    mockSendMessage.mockReset();
    api.get.mockReset();
    api.post.mockReset();
    api.delete.mockReset();
    setupMocks();
  });

  it('renders cockpit immediately without blocking on student fetch', () => {
    api.get.mockReturnValue(new Promise(() => {}));
    renderWithRoute(<StudentDetail />, {
      route: '/trainer/students/student-1',
      path: '/trainer/students/:id',
    });
    expect(screen.getByRole('button', { name: /voltar para alunos/i })).toBeInTheDocument();
    expect(screen.queryByText('Carregando...')).not.toBeInTheDocument();
  });

  it('renders back button to /trainer/students', async () => {
    renderDetail();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /voltar para alunos/i })).toBeInTheDocument(),
    );
  });

  it('back button navigates to /trainer/students', async () => {
    const user = userEvent.setup();
    renderDetail();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /voltar para alunos/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: /voltar para alunos/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/students');
  });

  it('renders cockpit hero with student name and email', async () => {
    renderDetail();
    await waitFor(() => expect(screen.getByTestId('cockpit-hero')).toBeInTheDocument());
    expect(screen.getByText('Aluno Exemplo')).toBeInTheDocument();
    expect(screen.getByText('aluno@example.com')).toBeInTheDocument();
  });

  it('"Nova rotina" button navigates to protocol new route with studentId', async () => {
    const user = userEvent.setup();
    renderDetail();
    await waitFor(() => expect(screen.getByTestId('cockpit-hero')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Nova rotina' }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/protocols/new?studentId=student-1');
  });

  it('"Vincular anamnese" button opens link modal', async () => {
    const user = userEvent.setup();
    renderDetail();
    await waitFor(() => expect(screen.getByTestId('cockpit-hero')).toBeInTheDocument());
    // Hero mock and section empty state both render this label — click the hero one (index 0)
    const btns = screen.getAllByRole('button', { name: 'Vincular anamnese' });
    await user.click(btns[0]);
    await waitFor(() =>
      expect(screen.getByLabelText('Selecionar anamnese')).toBeInTheDocument(),
    );
  });

  it('period picker sheet opens on period button click', async () => {
    const user = userEvent.setup();
    renderDetail();
    await waitFor(() => expect(screen.getByTestId('cockpit-hero')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /últimos 30 dias/i }));
    expect(screen.getByTestId('period-picker')).toBeInTheDocument();
  });

  it('period picker closes on cancel', async () => {
    const user = userEvent.setup();
    renderDetail();
    await waitFor(() => expect(screen.getByTestId('cockpit-hero')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /últimos 30 dias/i }));
    await user.click(screen.getByRole('button', { name: 'Fechar picker' }));
    expect(screen.queryByTestId('period-picker')).not.toBeInTheDocument();
  });

  it('renders recent sessions panel', async () => {
    renderDetail();
    await waitFor(() => expect(screen.getByTestId('recent-sessions')).toBeInTheDocument());
  });

  it('renders progression panel', async () => {
    renderDetail();
    await waitFor(() => expect(screen.getByTestId('progression-panel')).toBeInTheDocument());
  });

  it('renders Rotinas section with all protocols', async () => {
    renderDetail();
    await waitFor(() => expect(screen.getByText('Rotinas')).toBeInTheDocument());
    expect(screen.getByText('Rotina Arquivada')).toBeInTheDocument();
  });

  it('shows active protocol in Rotinas section', async () => {
    renderDetail();
    await waitFor(() => expect(screen.getByText('Rotinas')).toBeInTheDocument());
    expect(screen.getByText('Rotina Ativa')).toBeInTheDocument();
  });

  it('active protocol appears before archived in Rotinas section', async () => {
    renderDetail();
    await waitFor(() => expect(screen.getByText('Rotina Ativa')).toBeInTheDocument());
    const activeEl = screen.getByText('Rotina Ativa');
    const archivedEl = screen.getByText('Rotina Arquivada');
    // Node.DOCUMENT_POSITION_FOLLOWING (4) means archivedEl comes after activeEl
    expect(activeEl.compareDocumentPosition(archivedEl) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('"Ver todas" in Rotinas section navigates to protocols sub-route', async () => {
    const user = userEvent.setup();
    renderDetail();
    await waitFor(() => expect(screen.getByText('Rotinas')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /ver todas as rotinas/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/students/student-1/protocols');
  });

  it('shows empty state with CTA when student has no protocols', async () => {
    setupMocks({ protocols: [] });
    renderDetail();
    await waitFor(() => expect(screen.getByText('Sem rotinas ainda')).toBeInTheDocument());
    expect(screen.getAllByRole('button', { name: 'Nova rotina' }).length).toBeGreaterThan(0);
  });

  it('renders Anamneses section heading', async () => {
    renderDetail();
    await waitFor(() => expect(screen.getByText('Anamneses')).toBeInTheDocument());
  });

  it('"Ver todas (n)" navigates to anamneses sub-route', async () => {
    const user = userEvent.setup();
    setupMocks({ anamneses: mockLinkedAnamneses });
    renderDetail();
    await waitFor(() => expect(screen.getByText('Anamneses')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /ver todas as \d+ anamneses/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/students/student-1/anamneses');
  });

  it('shows empty state with CTA when no anamneses', async () => {
    setupMocks({ anamneses: [] });
    renderDetail();
    await waitFor(() => expect(screen.getByText('Sem anamneses vinculadas')).toBeInTheDocument());
    // Hero mock also renders "Vincular anamnese"; getAllByRole ensures the section CTA is present too
    expect(screen.getAllByRole('button', { name: 'Vincular anamnese' }).length).toBeGreaterThan(0);
  });

  it('links anamnesis via modal and shows success toast', async () => {
    const user = userEvent.setup();
    setupMocks({
      allAnamneses: [{ id: 'anam-1', title: 'Anamnese de Saúde', isGeneral: false }],
    });
    api.post.mockResolvedValue({ data: {} });
    renderDetail();
    await waitFor(() => expect(screen.getByTestId('cockpit-hero')).toBeInTheDocument());
    await user.click(screen.getAllByRole('button', { name: 'Vincular anamnese' })[0]);
    await waitFor(() =>
      expect(screen.getByLabelText('Selecionar anamnese')).toBeInTheDocument(),
    );
    await selectOption(user, screen.getByLabelText('Selecionar anamnese'), 'anam-1');
    await user.click(screen.getByRole('button', { name: 'Vincular' }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/trainer/students/student-1/anamneses',
        { anamnesisId: 'anam-1' },
      );
      expect(mockShowToast).toHaveBeenCalledWith(
        'Anamnese vinculada com sucesso!',
        'success',
        expect.objectContaining({ actionLabel: 'Preencher agora' }),
      );
    });
    mockShowToast.mock.calls[0][2].onAction();
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/students/student-1/anamneses/anam-1/fill');
  });

  it('offers "Preencher com o aluno" and "Ver respostas" in the anamnesis card menu', async () => {
    const user = userEvent.setup();
    setupMocks({ anamneses: mockLinkedAnamneses });
    renderDetail();
    await user.click(await screen.findByRole('button', { name: 'Opções da anamnese Anamnese de Saúde' }));
    await user.click(screen.getByRole('button', { name: 'Preencher com o aluno' }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/students/student-1/anamneses/anam-1/fill');
  });

  it('opens the responses from the anamnesis card menu', async () => {
    const user = userEvent.setup();
    setupMocks({ anamneses: mockLinkedAnamneses });
    renderDetail();
    await user.click(await screen.findByRole('button', { name: 'Opções da anamnese Anamnese de Saúde' }));
    await user.click(screen.getByRole('button', { name: 'Ver respostas' }));
    expect(mockNavigate).toHaveBeenCalledWith(
      '/trainer/students/student-1/anamneses/anam-1/response',
    );
  });

  it('cancel button closes link modal without calling api.post', async () => {
    const user = userEvent.setup();
    renderDetail();
    await waitFor(() => expect(screen.getByTestId('cockpit-hero')).toBeInTheDocument());
    await user.click(screen.getAllByRole('button', { name: 'Vincular anamnese' })[0]);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByLabelText('Selecionar anamnese')).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('fetches /trainer/students when no location state', async () => {
    renderDetail({ withState: false });
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/trainer/students'));
  });

  it('renders iArnold FAB', async () => {
    renderDetail();
    await waitFor(() => expect(screen.getByTestId('iarnold-fab')).toBeInTheDocument());
  });
});
