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

const STUDENT = { id: 'student-1', firstName: 'Aluno', lastName: 'Exemplo', email: 'aluno@example.com', lastWorkoutAt: null };
const HISTORY_PATH = '/trainer/students/student-1/feedbacks';

// Answers every request of the page by URL, with empty lists for what the test does not care about
const mockApi = () => {
  const routes = {
    '/trainer/students': [STUDENT],
    '/trainer/students/student-1': STUDENT,
    '/trainer/students/student-1/subscriptions/active': null,
    '/trainer/students/student-1/payments': { student: { id: 'student-1', name: 'Aluno Exemplo' }, summary: null, payments: [] },
    [HISTORY_PATH]: { student: { id: 'student-1', name: 'Aluno Exemplo', avatarUrl: null }, hasPending: false, feedbacks: [] },
  };
  api.get.mockImplementation((url) => Promise.resolve({ data: url in routes ? routes[url] : [] }));
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

describe('StudentDetail: feedback card', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
    vi.mocked(useAuth).mockReturnValue({
      user: { id: 'trainer-1', firstName: 'João', lastName: 'Lucas' },
      hasRole: (role) => role.toUpperCase() === 'TRAINER',
    });
    vi.mocked(useAiChat).mockReturnValue({ startConversation: vi.fn() });
    mockApi();
  });

  it('shows a "Feedback" card with its title', async () => {
    await renderDetail();

    const card = screen.getByRole('region', { name: 'Feedback' });
    expect(within(card).getByRole('heading', { level: 3, name: 'Feedback' })).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Ver feedbacks' })).toBeEnabled();
  });

  it('opens the feedback history of the student from "Ver feedbacks"', async () => {
    const user = userEvent.setup();
    await renderDetail();

    await user.click(within(screen.getByRole('region', { name: 'Feedback' })).getByRole('button', { name: 'Ver feedbacks' }));

    expect(mockNavigate).toHaveBeenCalledWith(HISTORY_PATH);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });
});
