import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen, waitFor, renderWithRoute } from '../../test/test-utils';
import StudentSessions from './StudentSessions';
import api from '../../api/axios';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'trainer-1' } }) }));
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const ROUTE = '/trainer/students/s-1/sessions?from=2026-04-01T00:00:00.000Z&to=2026-05-01T00:00:00.000Z';
const PATH = '/trainer/students/:id/sessions';
const SESSIONS_URL = '/trainer/students/s-1/dashboard/recent-sessions';

// Builds N completed session rows.
const buildSessions = (count) => Array.from({ length: count }, (_, index) => ({
  id: `sess-${index}`,
  trainingName: `Treino ${index}`,
  startedAt: '2026-04-10T12:00:00.000Z',
  durationSeconds: 3600,
  status: 'completed',
}));

// Mocks the student profile and the recent-sessions endpoint.
const mockApi = (sessionsResponse) => {
  api.get.mockImplementation((url) => {
    if (url === '/trainer/students/s-1') {
      return Promise.resolve({ data: { id: 's-1', firstName: 'Ana', lastName: 'Lima' } });
    }
    return sessionsResponse(url);
  });
};

// Calls made to the recent-sessions endpoint.
const sessionsCalls = () => api.get.mock.calls.filter(([url]) => url === SESSIONS_URL);

// Renders the page on its route.
const renderPage = (route = ROUTE) => renderWithRoute(<StudentSessions />, { route, path: PATH });

describe('StudentSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('shows the loading state before the request completes', () => {
    mockApi(() => new Promise(() => {}));
    renderPage();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the sessions returned by the API and the student name', async () => {
    mockApi(() => Promise.resolve({ data: { data: buildSessions(2) } }));
    renderPage();
    expect(await screen.findByRole('button', { name: /Abrir sessão Treino 0/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Abrir sessão Treino 1/ })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Voltar para o aluno' })).toHaveTextContent('Ana Lima');
    expect(screen.queryByText(/mais recentes do período/)).not.toBeInTheDocument();
  });

  it('sends the period from the query string and limit 50', async () => {
    mockApi(() => Promise.resolve({ data: { data: [] } }));
    renderPage();
    await waitFor(() => expect(sessionsCalls()).toHaveLength(1));
    expect(sessionsCalls()[0][1].params).toEqual({
      dateFrom: '2026-04-01T00:00:00.000Z',
      dateTo: '2026-05-01T00:00:00.000Z',
      limit: 50,
    });
  });

  it('falls back to the default period when the query string has none', async () => {
    mockApi(() => Promise.resolve({ data: { data: [] } }));
    renderPage('/trainer/students/s-1/sessions');
    await waitFor(() => expect(sessionsCalls()).toHaveLength(1));
    const { params } = sessionsCalls()[0][1];
    expect(params.dateFrom).toEqual(expect.any(String));
    expect(params.dateTo).toEqual(expect.any(String));
    expect(screen.getByRole('button', { name: /Últimos 30 dias/ })).toBeInTheDocument();
  });

  it('shows the empty state when there are no sessions', async () => {
    mockApi(() => Promise.resolve({ data: { data: [] } }));
    renderPage();
    expect(await screen.findByText('Sem sessões no período.')).toBeInTheDocument();
  });

  it('shows the limit note when 50 sessions are returned', async () => {
    mockApi(() => Promise.resolve({ data: { data: buildSessions(50) } }));
    renderPage();
    expect(await screen.findByText('Mostrando as 50 sessões mais recentes do período.')).toBeInTheDocument();
  });

  it('shows an error and retries the request', async () => {
    const user = userEvent.setup();
    let attempts = 0;
    mockApi(() => {
      attempts += 1;
      return attempts === 1
        ? Promise.reject(new Error('boom'))
        : Promise.resolve({ data: { data: buildSessions(1) } });
    });
    renderPage();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('button', { name: /Abrir sessão Treino 0/ })).toBeInTheDocument();
    expect(sessionsCalls()).toHaveLength(2);
  });

  it('navigates to the session detail when a row is clicked', async () => {
    const user = userEvent.setup();
    mockApi(() => Promise.resolve({ data: { data: buildSessions(1) } }));
    renderPage();
    await user.click(await screen.findByRole('button', { name: /Abrir sessão Treino 0/ }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/students/s-1/sessions/sess-0', {
      state: { returnTo: ROUTE },
    });
  });

  it('navigates back to the student detail', async () => {
    const user = userEvent.setup();
    mockApi(() => Promise.resolve({ data: { data: [] } }));
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Voltar para o aluno' }));
    expect(mockNavigate).toHaveBeenCalledWith('/trainer/students/s-1');
  });

  it('refetches when the period is changed in the picker', async () => {
    const user = userEvent.setup();
    mockApi(() => Promise.resolve({ data: { data: [] } }));
    renderPage();
    await waitFor(() => expect(sessionsCalls()).toHaveLength(1));
    await user.click(screen.getByRole('button', { name: /Alterar período/ }));
    await user.click(await screen.findByRole('radio', { name: /Últimos 90 dias/ }));
    await user.click(screen.getByRole('button', { name: /Aplicar/ }));
    await waitFor(() => expect(sessionsCalls()).toHaveLength(2));
  });
});
