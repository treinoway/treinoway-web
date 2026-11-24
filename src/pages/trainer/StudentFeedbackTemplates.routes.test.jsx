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
const TEMPLATES_URL = `${BASE_URL}/templates`;
const BUILDER_URL = `${TEMPLATES_URL}/tpl-2`;

const GATED_ROUTES = [
  [TEMPLATES_URL, 'heading', 'Modelos de feedback'],
  [BUILDER_URL, 'textbox', 'Nome do modelo'],
];

const QUESTION = {
  id: 'q-1',
  order: 1,
  text: 'Como foi sua adesão ao treino?',
  helpText: null,
  type: 'score',
  typeLabel: 'Nota',
  pillar: 'training_adherence',
  pillarLabel: 'Adesão (treino)',
  required: true,
  condition: null,
  invertScore: false,
  minLabel: 'Não treinei',
  maxLabel: 'Treinei tudo',
};
const GENERAL = { id: 'tpl-general', name: 'Padrão TeuFit', isGeneral: true, version: 1, questionCount: 8, milestones: ['D7'], updatedAt: '2026-11-01T12:00:00.000Z' };
const MONTHLY = { id: 'tpl-2', name: 'Avaliação mensal', isGeneral: false, version: 2, questionCount: 1, milestones: ['D30'], updatedAt: '2026-11-10T12:00:00.000Z' };
const MONTHLY_DETAIL = { id: 'tpl-2', name: 'Avaliação mensal', isGeneral: false, version: 2, hasRequests: false, milestones: ['D30'], questions: [QUESTION] };
const INBOX = { summary: { responseRate30d: 82, averageIndex: 64, unansweredCount: 0, unreadCount: 0 }, items: [] };

// Routes every request of the feature by URL
const mockApi = () => {
  api.get.mockImplementation((url) => {
    if (url === BASE_URL) return Promise.resolve({ data: INBOX });
    if (url === `${BASE_URL}/unread-count`) return Promise.resolve({ data: { count: 0 } });
    if (url === TEMPLATES_URL) return Promise.resolve({ data: { templates: [GENERAL, MONTHLY] } });
    if (url === BUILDER_URL) return Promise.resolve({ data: { template: MONTHLY_DETAIL } });
    return Promise.reject(new Error(`unexpected GET ${url}`));
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

// Whether the app asked the service for a template or the template list
const askedForTemplates = () => api.get.mock.calls.some(([url]) => url.startsWith(TEMPLATES_URL));

describe('Student feedback template routes', () => {
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

  it.each(GATED_ROUTES)('renders %s for an admin trainer on the production hostname', async (route, role, name) => {
    signIn(['TRAINER', 'ADMIN']);
    globalThis.jsdom.reconfigure({ url: `${PRODUCTION_ORIGIN}${route}` });

    render(<App />);

    expect(await screen.findByRole(role, { name })).toBeInTheDocument();
    expect(screen.queryByText('Dashboard Page')).not.toBeInTheDocument();
    expect(window.location.pathname).toBe(route);
  });

  it.each(GATED_ROUTES)('renders %s for a non-admin trainer on localhost, inside the app layout', async (route, role, name) => {
    signIn(['TRAINER']);
    window.history.pushState({}, '', route);

    render(<App />);

    expect(await screen.findByRole(role, { name })).toBeInTheDocument();
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    expect(askedForTemplates()).toBe(true);
  });

  it.each(GATED_ROUTES)('redirects %s home for a non-admin trainer on the production hostname, after opening it for an admin', async (route, role, name) => {
    signIn(['TRAINER', 'ADMIN']);
    globalThis.jsdom.reconfigure({ url: `${PRODUCTION_ORIGIN}${route}` });
    const adminView = render(<App />);
    expect(await screen.findByRole(role, { name })).toBeInTheDocument();
    adminView.unmount();
    api.get.mockClear();
    signIn(['TRAINER']);
    globalThis.jsdom.reconfigure({ url: `${PRODUCTION_ORIGIN}${route}` });

    render(<App />);

    expect(await screen.findByText('Dashboard Page')).toBeInTheDocument();
    expect(screen.queryByRole(role, { name })).not.toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
    expect(askedForTemplates()).toBe(false);
  });

  it.each(GATED_ROUTES)('sends an unauthenticated visitor of %s to the login, after opening it for a trainer', async (route, role, name) => {
    signIn(['TRAINER']);
    window.history.pushState({}, '', route);
    const trainerView = render(<App />);
    expect(await screen.findByRole(role, { name })).toBeInTheDocument();
    trainerView.unmount();
    api.get.mockClear();
    useAuth.mockReturnValue({ user: null, isAuthenticated: false, hasRole: () => false });
    window.history.pushState({}, '', route);

    render(<App />);

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByRole(role, { name })).not.toBeInTheDocument();
    expect(askedForTemplates()).toBe(false);
  });

  it('opens the template list from "Modelos" on the inbox and the builder from a template name', async () => {
    signIn(['TRAINER']);
    window.history.pushState({}, '', BASE_URL);
    const user = userEvent.setup();
    render(<App />);
    await screen.findByRole('heading', { level: 1, name: 'Feedbacks' });
    const main = within(screen.getByRole('main'));

    await user.click(main.queryByRole('link', { name: 'Modelos' }) ?? main.getByRole('button', { name: 'Modelos' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Modelos de feedback' })).toBeInTheDocument();
    expect(window.location.pathname).toBe(TEMPLATES_URL);

    await user.click(await screen.findByRole('button', { name: 'Abrir Avaliação mensal' }));

    expect(await screen.findByRole('textbox', { name: 'Nome do modelo' })).toHaveValue('Avaliação mensal');
    await waitFor(() => expect(window.location.pathname).toBe(BUILDER_URL));
    expect(api.get).toHaveBeenCalledWith(BUILDER_URL);
  });
});
