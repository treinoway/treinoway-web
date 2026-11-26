import userEvent from '@testing-library/user-event';
import { act, renderWithRoute, screen, within } from '../../test/test-utils';
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
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockDashboardBlock = { data: null, loading: false, error: null };

vi.mock('../../hooks/useStudentDashboard', () => ({
  default: () => ({
    summary: mockDashboardBlock,
    recentSessions: mockDashboardBlock,
    progression: mockDashboardBlock,
    dailyActivity: mockDashboardBlock,
    studentNotFound: false,
    retryBlock: vi.fn(),
  }),
}));

vi.mock('../../hooks/usePeriodPersistence', () => ({
  default: () => [{ presetKey: 'last-30-days', from: '2026-04-15', to: '2026-05-15' }, vi.fn()],
}));

vi.mock('../../components/PeriodPickerSheet', () => ({ default: () => null }));
vi.mock('../../components/IArnoldFAB', () => ({ default: () => null }));
vi.mock('../../components/finance/AssignPlanSheet', () => ({ default: () => null }));

const DS = { Badge: 'badge' };
const STUDENT = { id: 'student-1', firstName: 'Aluno', lastName: 'Exemplo', email: 'aluno@example.com', lastWorkoutAt: null };
const HISTORY_PATH = '/trainer/students/student-1/feedbacks';
const STATIC_TEXT = 'Veja o que o aluno respondeu em cada envio e envie um feedback quando quiser.';

const ANSWERED = {
  id: 'fb-1',
  milestone: 'D7',
  milestoneLabel: 'D7',
  status: 'answered',
  statusLabel: 'Respondido',
  sentAt: '2026-11-02T12:00:00.000Z',
  expiresAt: '2026-11-05T12:00:00.000Z',
  submittedAt: '2026-11-03T12:00:00.000Z',
  readAt: null,
  overallIndex: 58,
  band: 'stable',
  bandLabel: 'Estável',
  pillars: [],
  openAnswers: [],
};

const HISTORY = {
  student: { id: 'student-1', name: 'Aluno Exemplo', avatarUrl: null },
  hasPending: false,
  feedbacks: [ANSWERED],
  autoSend: { enabled: true, next: { milestone: 'D15', milestoneLabel: 'D15', dueAt: '2026-11-26T12:00:00.000Z' } },
};

const showToast = vi.fn();

// Answers every request of the page by URL, with empty lists for what the test does not care about; the history answers with `historyResponse()`
const mockApi = (historyResponse) => {
  const routes = {
    '/trainer/students': [STUDENT],
    '/trainer/students/student-1': STUDENT,
    '/trainer/students/student-1/subscriptions/active': null,
    '/trainer/students/student-1/payments': { student: { id: 'student-1', name: 'Aluno Exemplo' }, summary: null, payments: [] },
  };
  api.get.mockImplementation((url) => {
    if (url === HISTORY_PATH) return historyResponse();
    return Promise.resolve({ data: url in routes ? routes[url] : [] });
  });
};

// Renders the student page and lets the mocked requests settle inside act()
const renderDetail = async () => {
  const view = renderWithRoute(<StudentDetail />, {
    route: { pathname: '/trainer/students/student-1', state: { student: STUDENT } },
    path: '/trainer/students/:id',
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return view;
};

// The "Feedback" card of the page
const feedbackCard = () => screen.getByRole('region', { name: 'Feedback' });

// How many times the page asked the service for the feedback history of the student
const historyRequests = () => api.get.mock.calls.filter(([url]) => url === HISTORY_PATH).length;

describe('StudentDetail: state shown by the feedback card', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast });
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'trainer-1', firstName: 'João', lastName: 'Lucas' },
      hasRole: (role) => role.toUpperCase() === 'TRAINER',
    });
    vi.mocked(useAiChat).mockReturnValue({ startConversation: vi.fn() });
  });

  it('asks the service for the feedback history of the student once', async () => {
    mockApi(() => Promise.resolve({ data: HISTORY }));
    await renderDetail();

    expect(historyRequests()).toBe(1);
  });

  it('shows the auto-send state as a badge and the last overall index on the card', async () => {
    mockApi(() => Promise.resolve({ data: HISTORY }));
    await renderDetail();

    const card = feedbackCard();
    expect(within(card).getByText('Envio automático ativo')).toHaveClass(DS.Badge, 'badge--success');
    expect(card).toHaveTextContent(/Último índice geral:\s*58 de 100/);
    expect(within(card).getByText('Estável')).toHaveClass(DS.Badge, 'badge--warning');
  });

  it('shows "Envio automático desligado" in a neutral badge when the automatic sending is off', async () => {
    mockApi(() => Promise.resolve({ data: { ...HISTORY, feedbacks: [], autoSend: { enabled: false, next: null } } }));
    await renderDetail();

    const card = feedbackCard();
    expect(within(card).getByText('Envio automático desligado')).toHaveClass(DS.Badge, 'badge--neutral');
    expect(card).not.toHaveTextContent(/de 100/);
  });

  it('keeps the card with its static text and a working "Ver feedbacks" while the history loads', async () => {
    mockApi(() => new Promise(() => {}));
    const user = userEvent.setup();
    await renderDetail();

    const card = feedbackCard();
    expect(historyRequests()).toBe(1);
    expect(within(card).getByText(STATIC_TEXT)).toBeInTheDocument();
    expect(within(card).queryByText(/Envio automático/)).not.toBeInTheDocument();
    await user.click(within(card).getByRole('button', { name: 'Ver feedbacks' }));

    expect(mockNavigate).toHaveBeenCalledWith(HISTORY_PATH);
  });

  it('falls back to the static text, with no error toast, when the history fails to load', async () => {
    mockApi(() => Promise.reject({ userMessage: 'Aluno não encontrado.' }));
    await renderDetail();

    const card = feedbackCard();
    expect(historyRequests()).toBe(1);
    expect(within(card).getByText(STATIC_TEXT)).toBeInTheDocument();
    expect(within(card).queryByText(/Envio automático/)).not.toBeInTheDocument();
    expect(card).not.toHaveTextContent(/de 100/);
    expect(within(card).getByRole('button', { name: 'Ver feedbacks' })).toBeEnabled();
    expect(screen.queryByText('Aluno não encontrado.')).not.toBeInTheDocument();
    expect(showToast).not.toHaveBeenCalled();
  });
});
