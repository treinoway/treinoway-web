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
import StudentFeedbacks from './StudentFeedbacks';

const BASE_URL = '/trainer/student-feedbacks';

const DS = {
  MetricCard: '.metric-card',
  Segmented: 'segmented',
  Badge: 'badge',
  Avatar: '.avatar',
  EmptyBlock: '.empty-block',
};

// Inbox item with the fields of the trainer API; overrides replace any of them
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

const ANA = buildItem();
const BRUNO = buildItem({
  id: 'fb-2',
  student: { id: 'student-2', name: 'Bruno Lima', avatarUrl: null },
  milestone: 'D15',
  milestoneLabel: 'D15',
  submittedAt: '2026-11-11T15:00:00.000Z',
  readAt: '2026-11-11T18:00:00.000Z',
  overallIndex: 63,
  band: 'stable',
  bandLabel: 'Estável',
});
const CARLA = buildItem({
  id: 'fb-3',
  student: { id: 'student-3', name: 'Carla Dias', avatarUrl: null },
  milestone: 'D30',
  milestoneLabel: 'D30',
  submittedAt: '2026-11-12T15:00:00.000Z',
  overallIndex: 88,
  band: 'good',
  bandLabel: 'Bom',
});
const DAVI = buildItem({
  id: 'fb-4',
  student: { id: 'student-4', name: 'Davi Rocha', avatarUrl: null },
  milestone: 'D21',
  milestoneLabel: 'D21',
  status: 'expired',
  statusLabel: 'Expirado',
  submittedAt: null,
  overallIndex: null,
  band: null,
  bandLabel: null,
});

const EMPTY_PAYLOAD = { summary: { responseRate30d: null, averageIndex: null, unansweredCount: 0, unreadCount: 0 }, items: [] };

let inbox = [];

// Whether the item is an answered feedback the trainer has not read yet
const isUnread = (item) => item.status === 'answered' && item.readAt === null;

// Whether the item matches the status and milestone the page asked for
const matchesParams = (item, params) => {
  if (params.status === 'unread' && !isUnread(item)) return false;
  if (params.status === 'unanswered' && item.status !== 'expired') return false;
  return !params.milestone || item.milestone === params.milestone;
};

// Inbox payload of the service for the request params, from the current in-memory inbox
const buildPayload = (params) => ({
  summary: {
    responseRate30d: 82,
    averageIndex: 64,
    unansweredCount: inbox.filter((item) => item.status === 'expired').length,
    unreadCount: inbox.filter(isUnread).length,
  },
  items: inbox.filter((item) => matchesParams(item, params)),
});

// Routes the requests of the page by URL; reading a feedback updates the in-memory inbox
const mockApi = (items = [ANA, BRUNO, CARLA, DAVI]) => {
  inbox = items.map((item) => ({ ...item }));
  api.get.mockImplementation((url, options) => {
    if (url === BASE_URL) return Promise.resolve({ data: buildPayload(options?.params ?? {}) });
    if (url === `${BASE_URL}/unread-count`) return Promise.resolve({ data: { count: inbox.filter(isUnread).length } });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
  api.patch.mockImplementation((url) => {
    const id = url.replace(`${BASE_URL}/`, '').replace('/read', '');
    const readAt = '2026-11-13T15:00:00.000Z';
    inbox = inbox.map((item) => (item.id === id ? { ...item, readAt } : item));
    return Promise.resolve({ data: { id, readAt } });
  });
};

// Renders the inbox with markers for the settings and the student history routes
const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/trainer/student-feedbacks']}>
      <Routes>
        <Route path="/trainer/student-feedbacks" element={<StudentFeedbacks />} />
        <Route path="/trainer/student-feedbacks/settings" element={<div>Settings Page</div>} />
        <Route path="/trainer/students/:id/feedbacks" element={<div>History Page</div>} />
      </Routes>
    </MemoryRouter>,
  );

// Table row of the student with the given name
const rowOf = (name) => screen.getByRole('row', { name: new RegExp(name) });

// Waits for the first rows to be on screen
const waitForRows = () => screen.findByRole('link', { name: 'Ana Souza' });

// Metric tile whose label is the given text
const tileOf = (label) => within(screen.getByRole('region', { name: 'Resumo dos feedbacks' })).getByText(label).closest(DS.MetricCard);

describe('StudentFeedbacks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi();
  });

  it('shows the title and asks for every feedback on the first load', async () => {
    renderPage();
    await waitForRows();

    expect(screen.getByRole('heading', { level: 1, name: 'Feedbacks' })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith(BASE_URL, { params: { status: 'all' } });
  });

  it('shows the four metric tiles with the summary of the service', async () => {
    const { container } = renderPage();
    await waitForRows();

    const summary = screen.getByRole('region', { name: 'Resumo dos feedbacks' });
    expect(summary.querySelectorAll(DS.MetricCard)).toHaveLength(4);
    expect(container.querySelectorAll(DS.MetricCard)).toHaveLength(4);
    expect(within(tileOf('Taxa de resposta (30 dias)')).getByText('82%')).toBeInTheDocument();
    expect(within(tileOf('Média do índice geral')).getByText('64')).toBeInTheDocument();
    expect(within(tileOf('Sem resposta')).getByText('1')).toBeInTheDocument();
    expect(within(tileOf('Não lidos')).getByText('2')).toBeInTheDocument();
  });

  it('shows a dash in the rate and index tiles when the service has no value yet', async () => {
    api.get.mockResolvedValue({ data: { ...EMPTY_PAYLOAD, items: [ANA] } });
    renderPage();
    await waitForRows();

    expect(within(tileOf('Taxa de resposta (30 dias)')).getByText('-')).toBeInTheDocument();
    expect(within(tileOf('Média do índice geral')).getByText('-')).toBeInTheDocument();
  });

  it('shows the status filter with the unread and unanswered counts, "Todos" selected', async () => {
    renderPage();
    await waitForRows();

    const filter = screen.getByRole('tablist', { name: 'Filtrar por status' });
    expect(filter).toHaveClass(DS.Segmented);
    expect(within(filter).getByRole('tab', { name: 'Todos' })).toHaveAttribute('aria-selected', 'true');
    expect(within(filter).getByRole('tab', { name: /^Não lidos/ })).toHaveTextContent('(2)');
    expect(within(filter).getByRole('tab', { name: /^Sem resposta/ })).toHaveTextContent('(1)');
  });

  it('re-queries with the status chosen and shows only what the service returns', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForRows();

    await user.click(screen.getByRole('tab', { name: /^Não lidos/ }));

    await waitFor(() => expect(api.get).toHaveBeenCalledWith(BASE_URL, { params: { status: 'unread' } }));
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Bruno Lima' })).not.toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'Ana Souza' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Não lidos/ })).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('tab', { name: /^Sem resposta/ }));

    await waitFor(() => expect(api.get).toHaveBeenCalledWith(BASE_URL, { params: { status: 'unanswered' } }));
    expect(await screen.findByRole('link', { name: 'Davi Rocha' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Ana Souza' })).not.toBeInTheDocument());
  });

  it('shows a chip per milestone with "Momento: todos" pressed', async () => {
    renderPage();
    await waitForRows();

    const chips = screen.getByRole('group', { name: 'Filtrar por momento do envio' });
    const names = within(chips).getAllByRole('button').map((chip) => chip.textContent);
    expect(names).toEqual(['Momento: todos', '7 dias', '15 dias', '21 dias', '30 dias', 'A cada 30 dias', 'Envio manual']);
    within(chips).getAllByRole('button').forEach((chip) => expect(chip).toHaveClass('chip'));
    expect(within(chips).getByRole('button', { name: 'Momento: todos' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(chips).getByRole('button', { name: 'Momento: todos' })).toHaveClass('chip--active');
    expect(within(chips).getByRole('button', { name: '15 dias' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('re-queries with the milestone chosen and drops it again with "Momento: todos"', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForRows();
    const chips = screen.getByRole('group', { name: 'Filtrar por momento do envio' });

    await user.click(within(chips).getByRole('button', { name: '15 dias' }));

    await waitFor(() => expect(api.get).toHaveBeenCalledWith(BASE_URL, { params: { status: 'all', milestone: 'D15' } }));
    await waitFor(() => expect(screen.queryByRole('link', { name: 'Ana Souza' })).not.toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'Bruno Lima' })).toBeInTheDocument();
    expect(within(chips).getByRole('button', { name: '15 dias' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(chips).getByRole('button', { name: '15 dias' })).toHaveClass('chip--active');

    await user.click(within(chips).getByRole('button', { name: 'Momento: todos' }));

    expect(await screen.findByRole('link', { name: 'Ana Souza' })).toBeInTheDocument();
    expect(api.get).toHaveBeenLastCalledWith(BASE_URL, { params: { status: 'all' } });
  });

  it.each([
    ['A cada 30 dias', 'RECURRING'],
    ['Envio manual', 'ADHOC'],
  ])('sends the milestone of the chip "%s" together with the status chosen', async (label, milestone) => {
    const user = userEvent.setup();
    renderPage();
    await waitForRows();

    await user.click(screen.getByRole('tab', { name: /^Não lidos/ }));
    await user.click(within(screen.getByRole('group', { name: 'Filtrar por momento do envio' })).getByRole('button', { name: label }));

    await waitFor(() => expect(api.get).toHaveBeenLastCalledWith(BASE_URL, { params: { status: 'unread', milestone } }));
  });

  it('shows the table with student, milestone, received date and index, hiding the date column on mobile', async () => {
    renderPage();
    await waitForRows();

    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'Aluno' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Momento' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Índice' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: 'Recebido' })).toHaveClass('table-col-desktop-only');

    const row = rowOf('Ana Souza');
    expect(within(row).getByText('7 dias')).toBeInTheDocument();
    expect(within(row).getByText('42')).toBeInTheDocument();
    expect(within(row).getAllByText('10/11/2026').length).toBeGreaterThan(0);
    expect(within(row).getAllByText('10/11/2026').some((node) => node.closest('td').classList.contains('table-col-desktop-only'))).toBe(true);
  });

  it('names the milestone of each row with the web label, not the label the service sent', async () => {
    mockApi([ANA, { ...BRUNO, milestone: 'ADHOC', milestoneLabel: 'Avulso' }, { ...CARLA, milestone: 'D60', milestoneLabel: '60 dias' }]);
    renderPage();
    await waitForRows();

    expect(within(rowOf('Ana Souza')).getByText('7 dias')).toBeInTheDocument();
    expect(within(rowOf('Ana Souza')).queryByText('D7')).not.toBeInTheDocument();
    expect(within(rowOf('Bruno Lima')).getByText('Envio manual')).toBeInTheDocument();
    expect(within(rowOf('Bruno Lima')).queryByText('Avulso')).not.toBeInTheDocument();
    expect(within(rowOf('Carla Dias')).getByText('60 dias')).toBeInTheDocument();
  });

  it('shows the avatar of each student and links the name to the student history', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForRows();

    expect(rowOf('Ana Souza').querySelector(DS.Avatar)).toBeInTheDocument();
    expect(rowOf('Davi Rocha').querySelector(DS.Avatar)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bruno Lima' })).toHaveAttribute('href', '/trainer/students/student-2/feedbacks');

    await user.click(screen.getByRole('link', { name: 'Ana Souza' }));

    expect(await screen.findByText('History Page')).toBeInTheDocument();
  });

  it.each([
    ['Ana Souza', 'Atenção', 'badge--error'],
    ['Bruno Lima', 'Estável', 'badge--warning'],
    ['Carla Dias', 'Bom', 'badge--success'],
  ])('shows the band of %s as a "%s" badge with the tone %s', async (name, bandLabel, toneClass) => {
    renderPage();
    await waitForRows();

    const band = within(rowOf(name)).getByText(bandLabel);
    expect(band).toHaveClass(DS.Badge);
    expect(band).toHaveClass(toneClass);
  });

  it('shows the status and dashes instead of index, band and date on a feedback that was not answered', async () => {
    renderPage();
    await waitForRows();

    const row = rowOf('Davi Rocha');
    expect(within(row).getByText('Expirado')).toBeInTheDocument();
    expect(within(row).getAllByText('-').length).toBeGreaterThan(0);
    expect(within(row).queryByText('Atenção')).not.toBeInTheDocument();
    expect(within(row).queryByText(/Invalid Date/)).not.toBeInTheDocument();
  });

  it('offers "Marcar como lido" only on answered feedbacks that are unread', async () => {
    renderPage();
    await waitForRows();

    expect(within(rowOf('Ana Souza')).getByRole('button', { name: 'Marcar como lido' })).toBeInTheDocument();
    expect(within(rowOf('Carla Dias')).getByRole('button', { name: 'Marcar como lido' })).toBeInTheDocument();
    expect(within(rowOf('Bruno Lima')).queryByRole('button', { name: 'Marcar como lido' })).not.toBeInTheDocument();
    expect(within(rowOf('Davi Rocha')).queryByRole('button', { name: 'Marcar como lido' })).not.toBeInTheDocument();
  });

  it('marks a feedback as read and updates the row, the unread tile and the unread count of the filter', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForRows();

    await user.click(within(rowOf('Ana Souza')).getByRole('button', { name: 'Marcar como lido' }));

    await waitFor(() => expect(api.patch).toHaveBeenCalledWith(`${BASE_URL}/fb-1/read`));
    await waitFor(() => expect(within(rowOf('Ana Souza')).queryByRole('button', { name: 'Marcar como lido' })).not.toBeInTheDocument());
    expect(within(rowOf('Carla Dias')).getByRole('button', { name: 'Marcar como lido' })).toBeInTheDocument();
    await waitFor(() => expect(within(tileOf('Não lidos')).getByText('1')).toBeInTheDocument());
    expect(screen.getByRole('tab', { name: /^Não lidos/ })).toHaveTextContent('(1)');
    expect(showToast).not.toHaveBeenCalledWith(expect.anything(), 'error');
  });

  it('keeps the feedback unread and shows the API message when marking as read fails', async () => {
    api.patch.mockRejectedValue({ userMessage: 'Feedback não encontrado.' });
    const user = userEvent.setup();
    renderPage();
    await waitForRows();

    await user.click(within(rowOf('Ana Souza')).getByRole('button', { name: 'Marcar como lido' }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Feedback não encontrado.', 'error'));
    expect(within(rowOf('Ana Souza')).getByRole('button', { name: 'Marcar como lido' })).toBeEnabled();
    expect(within(tileOf('Não lidos')).getByText('2')).toBeInTheDocument();
  });

  it('opens the settings from "Configurar feedback"', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForRows();

    await user.click(screen.getByRole('button', { name: 'Configurar feedback' }));

    expect(await screen.findByText('Settings Page')).toBeInTheDocument();
  });

  it('shows a loading state and no table while the first request runs', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderPage();

    expect(screen.getByRole('status', { name: 'Carregando feedbacks' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows the empty block instead of the table when there is no feedback', async () => {
    api.get.mockResolvedValue({ data: EMPTY_PAYLOAD });
    const { container } = renderPage();

    const title = await screen.findByRole('heading', { level: 2, name: 'Nenhum feedback encontrado' });
    expect(title.closest(DS.EmptyBlock)).toBeInTheDocument();
    expect(container.querySelectorAll(DS.EmptyBlock)).toHaveLength(1);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('keeps the filters on screen when a filter returns nothing, so the trainer can go back', async () => {
    mockApi([ANA, BRUNO]);
    const user = userEvent.setup();
    renderPage();
    await waitForRows();

    await user.click(screen.getByRole('tab', { name: /^Sem resposta/ }));

    expect(await screen.findByRole('heading', { level: 2, name: 'Nenhum feedback encontrado' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Todos' }));
    expect(await screen.findByRole('link', { name: 'Ana Souza' })).toBeInTheDocument();
  });

  it('shows the API error with retry', async () => {
    let failing = true;
    api.get.mockImplementation((url) => {
      if (url === BASE_URL && failing) return Promise.reject({ userMessage: 'Não foi possível carregar os feedbacks.' });
      return Promise.resolve({ data: { ...EMPTY_PAYLOAD, items: [ANA] } });
    });
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Não foi possível carregar os feedbacks.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    failing = false;
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByRole('link', { name: 'Ana Souza' })).toBeInTheDocument();
    expect(screen.queryByText('Não foi possível carregar os feedbacks.')).not.toBeInTheDocument();
  });
});
