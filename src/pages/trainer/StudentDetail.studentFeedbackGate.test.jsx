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

const ORIGINAL_URL = window.location.href;
const STUDENT = { id: 'student-1', firstName: 'Aluno', lastName: 'Exemplo', email: 'aluno@example.com', lastWorkoutAt: null };
const HISTORY_PATH = '/trainer/students/student-1/feedbacks';

// Answers every request of the page by URL, with empty lists for what the test does not care about
const mockApi = () => {
  const routes = {
    '/trainer/students': [STUDENT],
    '/trainer/students/student-1': STUDENT,
    '/trainer/students/student-1/subscriptions/active': null,
    '/trainer/students/student-1/payments': { student: { id: 'student-1', name: 'Aluno Exemplo' }, summary: null, payments: [] },
  };
  api.get.mockImplementation((url) => Promise.resolve({ data: url in routes ? routes[url] : [] }));
};

// Mocks an authenticated user with the given roles (hasRole is case-insensitive like the real one)
const mockRoles = (roles) => {
  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'trainer-1', firstName: 'João', lastName: 'Lucas' },
    hasRole: (role) => roles.includes(role.toUpperCase()),
  });
};

// Points window.location at the production hostname through the jsdom instance
const setProductionHostname = () => {
  globalThis.jsdom.reconfigure({ url: 'https://app.teufit.com.br/' });
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

// The "Feedback" card of the page, or null when it is not shown
const feedbackCard = () => screen.queryByRole('region', { name: 'Feedback' });

// Whether the page asked the service for anything about student feedbacks
const askedForFeedbacks = () => api.get.mock.calls.some(([url]) => String(url).includes('feedbacks'));

describe('StudentDetail: feedback card behind the rollout gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('DEV', false);
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
    vi.mocked(useAiChat).mockReturnValue({ startConversation: vi.fn() });
    mockApi();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    globalThis.jsdom.reconfigure({ url: ORIGINAL_URL });
  });

  it('hides the card from a trainer who is not an admin on the production hostname, keeping the rest of the page', async () => {
    mockRoles(['TRAINER']);
    setProductionHostname();
    await renderDetail();

    expect(screen.getByRole('heading', { level: 2, name: 'Diagnóstico e prescrição' })).toBeInTheDocument();
    expect(feedbackCard()).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver feedbacks' })).not.toBeInTheDocument();
    expect(askedForFeedbacks()).toBe(false);
  });

  it('shows the same trainer the card on localhost', async () => {
    mockRoles(['TRAINER']);
    await renderDetail();

    expect(screen.getByRole('heading', { level: 2, name: 'Diagnóstico e prescrição' })).toBeInTheDocument();
    expect(within(feedbackCard()).getByRole('button', { name: 'Ver feedbacks' })).toBeEnabled();
  });

  it('shows the card to an admin trainer on the production hostname', async () => {
    mockRoles(['TRAINER', 'ADMIN']);
    setProductionHostname();
    await renderDetail();

    expect(within(feedbackCard()).getByRole('button', { name: 'Ver feedbacks' })).toBeEnabled();
    expect(mockNavigate).not.toHaveBeenCalledWith(HISTORY_PATH);
  });

  it('shows the card to everyone in a development build, even on the production hostname', async () => {
    vi.stubEnv('DEV', true);
    mockRoles(['TRAINER']);
    setProductionHostname();
    await renderDetail();

    expect(feedbackCard()).toBeInTheDocument();
  });
});
