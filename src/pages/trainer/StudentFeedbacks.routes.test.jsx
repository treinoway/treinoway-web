import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '../../test/test-utils';

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));
vi.mock('../../contexts/ToastContext', () => ({
  ToastProvider: ({ children }) => children,
  useToast: () => ({ showToast: vi.fn() }),
}));
vi.mock('../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: vi.fn(),
}));
vi.mock('../../contexts/AiChatContext', () => ({
  AiChatProvider: ({ children }) => children,
  useAiChat: () => ({ loading: false, hasNewResponse: false }),
}));
vi.mock('../Login', () => ({ default: () => <div>Login Page</div> }));
vi.mock('../Dashboard', () => ({ default: () => <div>Dashboard Page</div> }));

import api from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import App from '../../App';

const ORIGINAL_URL = window.location.href;
const PRODUCTION_ORIGIN = 'https://app.teufit.com.br';
const BASE_URL = '/trainer/student-feedbacks';
const HISTORY_URL = '/trainer/students/student-1/feedbacks';

const GATED_ROUTES = [
  [BASE_URL, 'Feedbacks'],
  [HISTORY_URL, 'Feedback de Ana Souza'],
  [`${BASE_URL}/settings`, 'Feedback automático'],
];

// Unread answered inbox item with the fields of the trainer API; overrides replace any of them
const buildItem = (overrides = {}) => ({
  id: 'fb-1',
  student: { id: 'student-1', name: 'Ana Souza', avatarUrl: null },
  milestone: 'D7',
  milestoneLabel: 'D7',
  status: 'answered',
  statusLabel: 'Respondido',
  sentAt: '2026-11-09T12:00:00.000Z',
  expiresAt: '2026-11-12T12:00:00.000Z',
  submittedAt: '2026-11-10T15:00:00.000Z',
  readAt: null,
  overallIndex: 42,
  band: 'attention',
  bandLabel: 'Atenção',
  ...overrides,
});

const HISTORY = { student: { id: 'student-1', name: 'Ana Souza', avatarUrl: null }, hasPending: false, feedbacks: [] };
const CONFIG = { autoSendEnabled: false, d7: true, d15: true, d21: true, d30: true, recurring: true };

let inbox = [];

// How many answered feedbacks of the in-memory inbox are still unread
const unreadCount = () => inbox.filter((item) => item.readAt === null).length;

// Routes every request of the feature by URL; reading a feedback updates the in-memory inbox
const mockApi = () => {
  inbox = [buildItem(), buildItem({ id: 'fb-2', student: { id: 'student-2', name: 'Bruno Lima', avatarUrl: null } })];
  api.get.mockImplementation((url) => {
    if (url === BASE_URL) {
      return Promise.resolve({ data: { summary: { responseRate30d: 82, averageIndex: 64, unansweredCount: 0, unreadCount: unreadCount() }, items: inbox } });
    }
    if (url === `${BASE_URL}/unread-count`) return Promise.resolve({ data: { count: unreadCount() } });
    if (url === HISTORY_URL) return Promise.resolve({ data: HISTORY });
    if (url === `${BASE_URL}/config`) return Promise.resolve({ data: CONFIG });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
  api.patch.mockImplementation((url) => {
    const id = url.replace(`${BASE_URL}/`, '').replace('/read', '');
    const readAt = '2026-11-13T15:00:00.000Z';
    inbox = inbox.map((item) => (item.id === id ? { ...item, readAt } : item));
    return Promise.resolve({ data: { id, readAt } });
  });
};

// Signs in a user with the given roles (hasRole is case-insensitive like the real one)
const signIn = (roles) => {
  useAuth.mockReturnValue({
    user: { id: 'trainer-1', firstName: 'Tamyres', lastName: 'Lima', betaAccess: true, platformPlan: { tier: 'BETA', limits: {} } },
    isAuthenticated: true,
    hasRole: (role) => roles.includes(role.toUpperCase()),
    logout: vi.fn(),
  });
};

// Whether the app asked the service for anything of the student feedback feature
const askedForStudentFeedback = () => api.get.mock.calls.some(([url]) => url.startsWith(BASE_URL) || url === HISTORY_URL);

// Table row of the student with the given name
const rowOf = (name) => screen.getByRole('row', { name: new RegExp(name) });

// The sidebar of the app layout
const sidebar = () => within(screen.getByRole('complementary'));

describe('Student feedback routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('DEV', false);
    Element.prototype.scrollTo = vi.fn();
    mockApi();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    globalThis.jsdom.reconfigure({ url: ORIGINAL_URL });
  });

  it.each(GATED_ROUTES)('renders %s for an admin trainer on the production hostname', async (route, heading) => {
    signIn(['TRAINER', 'ADMIN']);
    globalThis.jsdom.reconfigure({ url: `${PRODUCTION_ORIGIN}${route}` });

    render(<App />);

    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    expect(screen.queryByText('Dashboard Page')).not.toBeInTheDocument();
  });

  it.each(GATED_ROUTES)('renders %s for a non-admin trainer on localhost, inside the app layout', async (route, heading) => {
    signIn(['TRAINER']);
    window.history.pushState({}, '', route);

    render(<App />);

    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    expect(screen.getByRole('complementary')).toBeInTheDocument();
  });

  it.each(GATED_ROUTES)('redirects %s home for a non-admin trainer on the production hostname, after opening it for an admin', async (route, heading) => {
    signIn(['TRAINER', 'ADMIN']);
    globalThis.jsdom.reconfigure({ url: `${PRODUCTION_ORIGIN}${route}` });
    const adminView = render(<App />);
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    adminView.unmount();
    api.get.mockClear();
    signIn(['TRAINER']);
    globalThis.jsdom.reconfigure({ url: `${PRODUCTION_ORIGIN}${route}` });

    render(<App />);

    expect(await screen.findByText('Dashboard Page')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1, name: heading })).not.toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
    expect(sidebar().queryByRole('link', { name: /^Feedback(,|$)/ })).not.toBeInTheDocument();
    expect(askedForStudentFeedback()).toBe(false);
  });

  it.each(GATED_ROUTES)('sends an unauthenticated visitor of %s to the login', (route, heading) => {
    useAuth.mockReturnValue({ user: null, isAuthenticated: false, hasRole: () => false });
    window.history.pushState({}, '', route);

    render(<App />);

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1, name: heading })).not.toBeInTheDocument();
  });

  it('opens the inbox from the "Feedback" sidebar item, which carries the unread count', async () => {
    signIn(['TRAINER']);
    window.history.pushState({}, '', '/');
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText('Dashboard Page');

    await user.click(await sidebar().findByRole('link', { name: 'Feedback, 2 não lidos' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Feedbacks' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Ana Souza' })).toBeInTheDocument();
    expect(window.location.pathname).toBe(BASE_URL);
  });

  it('updates the row and the sidebar count when a feedback is marked as read', async () => {
    signIn(['TRAINER']);
    window.history.pushState({}, '', BASE_URL);
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('link', { name: 'Ana Souza' });
    const row = rowOf('Ana Souza');
    expect(await sidebar().findByRole('link', { name: 'Feedback, 2 não lidos' })).toBeInTheDocument();

    await user.click(within(row).getByRole('button', { name: 'Marcar como lido' }));

    await waitFor(() => expect(api.patch).toHaveBeenCalledWith(`${BASE_URL}/fb-1/read`));
    const link = await sidebar().findByRole('link', { name: 'Feedback, 1 não lido' });
    expect(within(link).getByText('1')).toHaveClass('sidebar-link-badge');
    await waitFor(() => expect(within(rowOf('Ana Souza')).queryByRole('button', { name: 'Marcar como lido' })).not.toBeInTheDocument());
  });

  it('clears the sidebar count when the last unread feedback is marked as read', async () => {
    signIn(['TRAINER']);
    window.history.pushState({}, '', BASE_URL);
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('link', { name: 'Ana Souza' });
    await sidebar().findByRole('link', { name: 'Feedback, 2 não lidos' });

    await user.click(within(rowOf('Ana Souza')).getByRole('button', { name: 'Marcar como lido' }));
    await sidebar().findByRole('link', { name: 'Feedback, 1 não lido' });
    await user.click(within(rowOf('Bruno Lima')).getByRole('button', { name: 'Marcar como lido' }));

    expect(await sidebar().findByRole('link', { name: 'Feedback' })).toBeInTheDocument();
    expect(sidebar().queryByRole('link', { name: /^Feedback,/ })).not.toBeInTheDocument();
  });

  it('keeps the sidebar count when marking as read fails', async () => {
    api.patch.mockRejectedValue({ userMessage: 'Feedback não encontrado.' });
    signIn(['TRAINER']);
    window.history.pushState({}, '', BASE_URL);
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('link', { name: 'Ana Souza' });
    await sidebar().findByRole('link', { name: 'Feedback, 2 não lidos' });

    await user.click(within(rowOf('Ana Souza')).getByRole('button', { name: 'Marcar como lido' }));

    await waitFor(() => expect(api.patch).toHaveBeenCalledTimes(1));
    expect(await sidebar().findByRole('link', { name: 'Feedback, 2 não lidos' })).toBeInTheDocument();
    expect(sidebar().queryByRole('link', { name: 'Feedback, 1 não lido' })).not.toBeInTheDocument();
  });
});
