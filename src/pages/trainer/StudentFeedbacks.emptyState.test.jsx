import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { render, screen, within } from '../../test/test-utils';

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock('../../contexts/ToastContext', () => ({
  ToastProvider: ({ children }) => children,
  useToast: () => ({ showToast: vi.fn() }),
}));

import api from '../../api/axios';
import StudentFeedbacks from './StudentFeedbacks';

const BASE_URL = '/trainer/student-feedbacks';
const SETTINGS_PATH = '/trainer/student-feedbacks/settings';
const EMPTY_TITLE = { level: 2, name: 'Nenhum feedback encontrado' };
const AUTO_SEND_OFF = 'O envio automático começa desligado. Ative para os alunos receberem o feedback nos dias certos.';
const OLD_DESCRIPTION = 'Os feedbacks aparecem aqui quando forem enviados aos seus alunos.';
const FILTERED_DESCRIPTION = 'Nenhum feedback corresponde aos filtros escolhidos.';
const CONFIGURE_AUTO_SEND = { name: 'Configurar envio automático' };
const DS = { EmptyBlock: '.empty-block' };

const SUMMARY = { responseRate30d: null, averageIndex: null, unansweredCount: 0, unreadCount: 0 };
const ANA = {
  id: 'fb-1',
  student: { id: 'student-1', name: 'Ana Souza', avatarUrl: null },
  milestone: 'D15',
  milestoneLabel: 'D15',
  status: 'answered',
  statusLabel: 'Respondido',
  sentAt: '2026-11-09T12:00:00.000Z',
  expiresAt: '2026-11-12T12:00:00.000Z',
  submittedAt: '2026-11-10T15:00:00.000Z',
  readAt: '2026-11-10T18:00:00.000Z',
  overallIndex: 63,
  band: 'stable',
  bandLabel: 'Estável',
};

// Answers the inbox with the given items whatever the filters; any other GET fails, as in the inbox tests
const mockApi = (items = []) => {
  api.get.mockImplementation((url) => {
    if (url === BASE_URL) return Promise.resolve({ data: { summary: SUMMARY, items } });
    if (url === `${BASE_URL}/unread-count`) return Promise.resolve({ data: { count: 0 } });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
};

// Promise settled from outside, standing for a request still in flight
const deferred = () => {
  let resolve;
  const promise = new Promise((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
};

// Leaves every inbox request from now on in flight; the returned function answers them with the given items
const holdInboxRequests = () => {
  const pending = deferred();
  api.get.mockImplementation((url) => {
    if (url === BASE_URL) return pending.promise;
    if (url === `${BASE_URL}/unread-count`) return Promise.resolve({ data: { count: 0 } });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
  return (items = []) => pending.resolve({ data: { summary: SUMMARY, items } });
};

// Params of the last inbox request the page made
const lastInboxParams = () => api.get.mock.calls.filter(([url]) => url === BASE_URL).at(-1)[1].params;

// Asserts that the inbox shows the loading placeholder and no empty message of either kind
const expectLoadingWithoutEmptyMessage = () => {
  expect(screen.getByRole('status', { name: 'Carregando feedbacks' })).toBeInTheDocument();
  expect(screen.queryByText(AUTO_SEND_OFF)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', CONFIGURE_AUTO_SEND)).not.toBeInTheDocument();
  expect(screen.queryByText(FILTERED_DESCRIPTION)).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', EMPTY_TITLE)).not.toBeInTheDocument();
};

// Shows the current path so a test can tell where the page navigated to
const CurrentPath = () => <p>{`rota: ${useLocation().pathname}`}</p>;

// Renders the inbox with a marker for the settings route
const renderPage = () =>
  render(
    <MemoryRouter initialEntries={[BASE_URL]}>
      <CurrentPath />
      <Routes>
        <Route path="/trainer/student-feedbacks" element={<StudentFeedbacks />} />
        <Route path="/trainer/student-feedbacks/settings" element={<div>Settings Page</div>} />
      </Routes>
    </MemoryRouter>,
  );

// The empty block of the inbox, once the list has loaded
const findEmptyBlock = async () => (await screen.findByRole('heading', EMPTY_TITLE)).closest(DS.EmptyBlock);

// URLs of every GET the page made
const requestedUrls = () => api.get.mock.calls.map(([url]) => url);

describe('StudentFeedbacks: empty state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi();
  });

  it('says that automatic sending starts off when there is no feedback and no filter', async () => {
    renderPage();

    const block = await findEmptyBlock();

    expect(within(block).getByText(AUTO_SEND_OFF)).toBeInTheDocument();
    expect(screen.queryByText(OLD_DESCRIPTION)).not.toBeInTheDocument();
    expect(screen.queryByText(FILTERED_DESCRIPTION)).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('offers "Configurar envio automático" inside the empty block, next to the header "Configurar feedback"', async () => {
    renderPage();

    const block = await findEmptyBlock();

    expect(within(block).getByRole('button', CONFIGURE_AUTO_SEND)).toBeEnabled();
    expect(screen.getAllByRole('button', CONFIGURE_AUTO_SEND)).toHaveLength(1);
    expect(within(block).queryByRole('button', { name: 'Configurar feedback' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Configurar feedback' })).toBeInTheDocument();
  });

  it('opens the settings page from "Configurar envio automático"', async () => {
    const user = userEvent.setup();
    renderPage();
    const block = await findEmptyBlock();

    await user.click(within(block).getByRole('button', CONFIGURE_AUTO_SEND));

    expect(await screen.findByText('Settings Page')).toBeInTheDocument();
    expect(screen.getByText(`rota: ${SETTINGS_PATH}`)).toBeInTheDocument();
  });

  it('asks the service for nothing but the inbox to show the empty state', async () => {
    renderPage();
    const block = await findEmptyBlock();

    expect(within(block).getByRole('button', CONFIGURE_AUTO_SEND)).toBeInTheDocument();
    expect(requestedUrls().filter((url) => url === BASE_URL)).toHaveLength(1);
    expect(requestedUrls().filter((url) => url !== BASE_URL && url !== `${BASE_URL}/unread-count`)).toEqual([]);
    expect(api.post).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
  });

  it('swaps to the filtered text with no action while a status filter is on, and back when it is cleared', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(within(await findEmptyBlock()).getByRole('button', CONFIGURE_AUTO_SEND)).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /^Sem resposta/ }));

    expect(await screen.findByText(FILTERED_DESCRIPTION)).toBeInTheDocument();
    expect(screen.queryByText(AUTO_SEND_OFF)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', CONFIGURE_AUTO_SEND)).not.toBeInTheDocument();
    expect(within(await findEmptyBlock()).queryByRole('button')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Todos' }));

    expect(await screen.findByText(AUTO_SEND_OFF)).toBeInTheDocument();
    expect(screen.getByRole('button', CONFIGURE_AUTO_SEND)).toBeInTheDocument();
    expect(screen.queryByText(FILTERED_DESCRIPTION)).not.toBeInTheDocument();
  });

  it('swaps to the filtered text with no action while a milestone filter is on, and back when it is cleared', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(within(await findEmptyBlock()).getByRole('button', CONFIGURE_AUTO_SEND)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '7 dias' }));

    expect(await screen.findByText(FILTERED_DESCRIPTION)).toBeInTheDocument();
    expect(screen.queryByText(AUTO_SEND_OFF)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', CONFIGURE_AUTO_SEND)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /: todos$/i }));

    expect(await screen.findByText(AUTO_SEND_OFF)).toBeInTheDocument();
    expect(screen.getByRole('button', CONFIGURE_AUTO_SEND)).toBeInTheDocument();
  });

  it.each([
    ['a status filter', (user) => user.click(screen.getByRole('tab', { name: /^Sem resposta/ })), { status: 'unanswered' }],
    ['a milestone filter', (user) => user.click(screen.getByRole('button', { name: '7 dias' })), { status: 'all', milestone: 'D7' }],
  ])('shows no empty message while the request of %s is pending, then the filtered text', async (_case, applyFilter, params) => {
    const user = userEvent.setup();
    renderPage();
    expect(within(await findEmptyBlock()).getByRole('button', CONFIGURE_AUTO_SEND)).toBeInTheDocument();
    const answer = holdInboxRequests();

    await applyFilter(user);

    expect(lastInboxParams()).toEqual(params);
    expectLoadingWithoutEmptyMessage();

    answer([]);

    expect(await screen.findByText(FILTERED_DESCRIPTION)).toBeInTheDocument();
    expect(screen.queryByText(AUTO_SEND_OFF)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', CONFIGURE_AUTO_SEND)).not.toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Carregando feedbacks' })).not.toBeInTheDocument();
  });

  it('shows no empty message while the request of a filter is pending, then the feedbacks it returns', async () => {
    const user = userEvent.setup();
    renderPage();
    await findEmptyBlock();
    const answer = holdInboxRequests();

    await user.click(screen.getByRole('button', { name: '15 dias' }));
    expectLoadingWithoutEmptyMessage();
    answer([ANA]);

    expect(await screen.findByRole('link', { name: 'Ana Souza' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', EMPTY_TITLE)).not.toBeInTheDocument();
    expect(screen.queryByText(FILTERED_DESCRIPTION)).not.toBeInTheDocument();
    expect(screen.queryByText(AUTO_SEND_OFF)).not.toBeInTheDocument();
  });

  it('shows no empty message while the request of "Todos" is pending after a filtered empty list, then the auto-send text', async () => {
    const user = userEvent.setup();
    renderPage();
    await findEmptyBlock();
    await user.click(screen.getByRole('tab', { name: /^Sem resposta/ }));
    expect(await screen.findByText(FILTERED_DESCRIPTION)).toBeInTheDocument();
    const answer = holdInboxRequests();

    await user.click(screen.getByRole('tab', { name: 'Todos' }));

    expect(lastInboxParams()).toEqual({ status: 'all' });
    expectLoadingWithoutEmptyMessage();

    answer([]);

    const block = await findEmptyBlock();
    expect(within(block).getByText(AUTO_SEND_OFF)).toBeInTheDocument();
    expect(within(block).getByRole('button', CONFIGURE_AUTO_SEND)).toBeEnabled();
    expect(screen.queryByText(FILTERED_DESCRIPTION)).not.toBeInTheDocument();
  });

  it('shows no empty message while the request of "Momento: todos" is pending after a filtered empty list, then the auto-send text', async () => {
    const user = userEvent.setup();
    renderPage();
    await findEmptyBlock();
    await user.click(screen.getByRole('button', { name: '7 dias' }));
    expect(await screen.findByText(FILTERED_DESCRIPTION)).toBeInTheDocument();
    const answer = holdInboxRequests();

    await user.click(screen.getByRole('button', { name: 'Momento: todos' }));

    expect(lastInboxParams()).toEqual({ status: 'all' });
    expectLoadingWithoutEmptyMessage();

    answer([]);

    expect(await screen.findByText(AUTO_SEND_OFF)).toBeInTheDocument();
    expect(screen.getByRole('button', CONFIGURE_AUTO_SEND)).toBeInTheDocument();
    expect(screen.queryByText(FILTERED_DESCRIPTION)).not.toBeInTheDocument();
  });

  it('shows neither the text nor the action when the inbox has feedbacks', async () => {
    mockApi([ANA]);
    renderPage();

    expect(await screen.findByRole('link', { name: 'Ana Souza' })).toBeInTheDocument();
    expect(screen.queryByText(AUTO_SEND_OFF)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', CONFIGURE_AUTO_SEND)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', EMPTY_TITLE)).not.toBeInTheDocument();
  });
});
