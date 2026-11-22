import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render, screen, waitFor, within } from '../../test/test-utils';

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const showToast = vi.fn();
vi.mock('../../contexts/ToastContext', () => ({
  ToastProvider: ({ children }) => children,
  useToast: () => ({ showToast }),
}));

import api from '../../api/axios';
import StudentFeedbackHistory from './StudentFeedbackHistory';

const HISTORY_URL = '/trainer/students/student-1/feedbacks';
const ALREADY_PENDING_MESSAGE = 'Já existe um feedback pendente para este aluno.';
const PENDING_NOTE = /O aluno já tem um feedback esperando resposta/;

const DAY_7 = {
  id: 'fb-1',
  milestone: 'D7',
  milestoneLabel: 'D7',
  status: 'answered',
  statusLabel: 'Respondido',
  sentAt: '2026-10-20T12:00:00.000Z',
  expiresAt: '2026-10-23T12:00:00.000Z',
  submittedAt: '2026-10-21T12:00:00.000Z',
  readAt: '2026-10-21T18:00:00.000Z',
  overallIndex: 55,
  band: 'stable',
  bandLabel: 'Estável',
  pillars: [{ pillar: 'sleep', pillarLabel: 'Sono', score: 50 }],
  openAnswers: [],
};
const DAY_15_PENDING = {
  id: 'fb-2',
  milestone: 'D15',
  milestoneLabel: 'D15',
  status: 'pending',
  statusLabel: 'Pendente',
  sentAt: '2026-10-28T12:00:00.000Z',
  expiresAt: '2026-10-31T12:00:00.000Z',
  submittedAt: null,
  readAt: null,
  overallIndex: null,
  band: null,
  bandLabel: null,
  pillars: [],
  openAnswers: [],
};

let history = [];

// History payload of the service for the current in-memory feedbacks
const buildHistory = () => ({
  student: { id: 'student-1', name: 'Ana Souza', avatarUrl: null },
  hasPending: history.some((feedback) => feedback.status === 'pending'),
  feedbacks: history,
});

// Serves a history that is stale on screen: the cron creates a pending feedback right after the first load, so the ad-hoc send is refused
const mockStaleHistory = () => {
  history = [DAY_7];
  api.get.mockImplementation((url) => {
    if (url === HISTORY_URL) return Promise.resolve({ data: buildHistory() });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
  api.post.mockImplementation(() => {
    history = [DAY_7, DAY_15_PENDING];
    return Promise.reject({ userMessage: ALREADY_PENDING_MESSAGE });
  });
};

// Renders the history of student-1
const renderPage = () =>
  render(
    <MemoryRouter initialEntries={[HISTORY_URL]}>
      <Routes>
        <Route path="/trainer/students/:id/feedbacks" element={<StudentFeedbackHistory />} />
      </Routes>
    </MemoryRouter>,
  );

// Waits for the page to finish loading
const waitForPage = () => screen.findByRole('heading', { level: 1, name: 'Feedback de Ana Souza' });

// Items of the milestone timeline, in the order shown
const timelineItems = () => within(screen.getByRole('list', { name: 'Linha do tempo dos feedbacks' })).getAllByRole('listitem');

// Confirms the ad-hoc send in the dialog
const confirmAdhocSend = async (user) => {
  await user.click(screen.getByRole('button', { name: 'Enviar feedback agora' }));
  await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Enviar' }));
};

// How many times the history was requested
const historyRequests = () => api.get.mock.calls.filter(([url]) => url === HISTORY_URL).length;

describe('StudentFeedbackHistory: refused ad-hoc send', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStaleHistory();
  });

  it('asks for the history again after the service refuses the send', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();
    expect(historyRequests()).toBe(1);

    await confirmAdhocSend(user);

    await waitFor(() => expect(historyRequests()).toBe(2));
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith(HISTORY_URL);
  });

  it('shows the pending feedback that caused the refusal, the pending note and a disabled send', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();
    expect(timelineItems()).toHaveLength(1);
    expect(screen.queryByText(PENDING_NOTE)).not.toBeInTheDocument();

    await confirmAdhocSend(user);

    await waitFor(() => expect(timelineItems()).toHaveLength(2));
    expect(within(timelineItems()[1]).getByText('15 dias')).toBeInTheDocument();
    expect(within(timelineItems()[1]).getByText('Pendente')).toBeInTheDocument();
    expect(screen.getByText(PENDING_NOTE)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar feedback agora' })).toBeDisabled();
  });

  it('shows the API message as the only toast and closes the dialog', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    await confirmAdhocSend(user);

    await waitFor(() => expect(showToast).toHaveBeenCalledWith(ALREADY_PENDING_MESSAGE, 'error'));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    await waitFor(() => expect(timelineItems()).toHaveLength(2));
    expect(showToast).toHaveBeenCalledTimes(1);
  });

  it('refreshes without going back to the loading screen: the page stays on screen the whole time', async () => {
    let answerRefresh;
    const user = userEvent.setup();
    renderPage();
    await waitForPage();
    api.get.mockImplementation(() => new Promise((resolve) => {
      answerRefresh = resolve;
    }));

    await confirmAdhocSend(user);

    await waitFor(() => expect(historyRequests()).toBe(2));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.queryByText('Carregando...')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Feedback de Ana Souza' })).toBeInTheDocument();
    expect(timelineItems()).toHaveLength(1);

    answerRefresh({ data: buildHistory() });
    await waitFor(() => expect(timelineItems()).toHaveLength(2));
    expect(screen.queryByText('Carregando...')).not.toBeInTheDocument();
  });

  it('keeps the history on screen and reports both failures when the refresh fails too', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();
    api.get.mockRejectedValue({ userMessage: 'Erro ao carregar o histórico.' });

    await confirmAdhocSend(user);

    await waitFor(() => expect(showToast).toHaveBeenCalledWith(ALREADY_PENDING_MESSAGE, 'error'));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Erro ao carregar o histórico.', 'error'));
    expect(screen.getByRole('heading', { level: 1, name: 'Feedback de Ana Souza' })).toBeInTheDocument();
    expect(timelineItems()).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar feedback agora' })).toBeEnabled();
  });

  it('does not ask for the history again when the send is cancelled', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    await user.click(screen.getByRole('button', { name: 'Enviar feedback agora' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
    expect(historyRequests()).toBe(1);
  });
});
