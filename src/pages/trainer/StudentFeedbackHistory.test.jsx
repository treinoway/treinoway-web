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

const DS = {
  Badge: 'badge',
  ConfirmDialog: 'ds-dialog',
};

// Pillar score with the fields of the trainer API
const pillar = (name, pillarLabel, score) => ({ pillar: name, pillarLabel, score });

// Feedback of the history with the fields of the trainer API; overrides replace any of them
const buildFeedback = (overrides = {}) => ({
  id: 'fb-1',
  milestone: 'D7',
  milestoneLabel: 'D7',
  status: 'answered',
  statusLabel: 'Respondido',
  sentAt: '2026-10-20T12:00:00.000Z',
  expiresAt: '2026-10-23T12:00:00.000Z',
  submittedAt: '2026-10-21T15:00:00.000Z',
  readAt: '2026-10-21T18:00:00.000Z',
  overallIndex: 55,
  band: 'stable',
  bandLabel: 'Estável',
  pillars: [pillar('training_adherence', 'Adesão ao treino', 60), pillar('sleep', 'Sono', 50)],
  openAnswers: [{ questionId: 'q-8', question: 'Quer contar mais alguma coisa?', pillar: 'report', pillarLabel: 'Relato', text: 'Dormi mal por causa do trabalho.' }],
  ...overrides,
});

const DAY_7 = buildFeedback();
const DAY_15_EXPIRED = buildFeedback({
  id: 'fb-2',
  milestone: 'D15',
  milestoneLabel: 'D15',
  status: 'expired',
  statusLabel: 'Expirado',
  sentAt: '2026-10-28T12:00:00.000Z',
  expiresAt: '2026-10-31T12:00:00.000Z',
  submittedAt: null,
  readAt: null,
  overallIndex: null,
  band: null,
  bandLabel: null,
  pillars: [],
  openAnswers: [],
});
const DAY_21 = buildFeedback({
  id: 'fb-3',
  milestone: 'D21',
  milestoneLabel: 'D21',
  sentAt: '2026-11-03T12:00:00.000Z',
  expiresAt: '2026-11-06T12:00:00.000Z',
  submittedAt: '2026-11-04T15:00:00.000Z',
  readAt: null,
  overallIndex: 77,
  band: 'good',
  bandLabel: 'Bom',
  pillars: [pillar('training_adherence', 'Adesão ao treino', 80), pillar('diet_adherence', 'Adesão à dieta', 70), pillar('sleep', 'Sono', 40)],
  openAnswers: [{ questionId: 'q-8', question: 'Quer contar mais alguma coisa?', pillar: 'report', pillarLabel: 'Relato', text: 'Semana ótima, consegui treinar tudo.' }],
});
const DAY_30_ATTENTION = buildFeedback({
  id: 'fb-4',
  milestone: 'D30',
  milestoneLabel: 'D30',
  sentAt: '2026-11-12T12:00:00.000Z',
  expiresAt: '2026-11-15T12:00:00.000Z',
  submittedAt: '2026-11-13T15:00:00.000Z',
  overallIndex: 30,
  band: 'attention',
  bandLabel: 'Atenção',
  pillars: [pillar('training_adherence', 'Adesão ao treino', 30)],
  openAnswers: [],
});
const ADHOC_CREATED = {
  id: 'fb-9',
  milestone: 'ADHOC',
  milestoneLabel: 'Avulso',
  status: 'pending',
  statusLabel: 'Pendente',
  sentAt: '2026-11-17T12:00:00.000Z',
  expiresAt: '2026-11-20T12:00:00.000Z',
};
const ADHOC_PENDING = buildFeedback({ ...ADHOC_CREATED, submittedAt: null, readAt: null, overallIndex: null, band: null, bandLabel: null, pillars: [], openAnswers: [] });

let history = [];

// History payload of the service for the current in-memory feedbacks
const buildHistory = () => ({
  student: { id: 'student-1', name: 'Ana Souza', avatarUrl: null },
  hasPending: history.some((feedback) => feedback.status === 'pending'),
  feedbacks: history,
});

// Routes the requests of the page by URL; an ad-hoc send adds a pending feedback to the in-memory history
const mockApi = (feedbacks = [DAY_7, DAY_15_EXPIRED, DAY_21]) => {
  history = [...feedbacks];
  api.get.mockImplementation((url) => {
    if (url === HISTORY_URL) return Promise.resolve({ data: buildHistory() });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
  api.post.mockImplementation(() => {
    history = [...history, ADHOC_PENDING];
    return Promise.resolve({ data: ADHOC_CREATED });
  });
};

// Renders the history of student-1 with a marker for the student page
const renderPage = () =>
  render(
    <MemoryRouter initialEntries={[HISTORY_URL]}>
      <Routes>
        <Route path="/trainer/students/:id/feedbacks" element={<StudentFeedbackHistory />} />
        <Route path="/trainer/students/:id" element={<div>Student Page</div>} />
      </Routes>
    </MemoryRouter>,
  );

// Waits for the page to finish loading
const waitForPage = () => screen.findByRole('heading', { level: 1, name: 'Feedback de Ana Souza' });

// Items of the milestone timeline, in the order shown
const timelineItems = () => within(screen.getByRole('list', { name: 'Linha do tempo dos feedbacks' })).getAllByRole('listitem');

// The value cells of the pillar table row whose name matches, one per answered milestone
const valueCellsOf = (rowName) => {
  const table = screen.getByRole('table', { name: 'Pilares por envio' });
  return within(within(table).getByRole('row', { name: rowName })).getAllByRole('cell').slice(-2);
};

// Opens the ad-hoc confirmation and returns the dialog
const openAdhocDialog = async (user) => {
  await user.click(screen.getByRole('button', { name: 'Enviar feedback agora' }));
  return screen.getByRole('alertdialog');
};

describe('StudentFeedbackHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi();
  });

  it('loads the history of the student of the route and shows the name in the title', async () => {
    renderPage();
    await waitForPage();

    expect(api.get).toHaveBeenCalledWith(HISTORY_URL);
  });

  it('shows "Carregando..." and nothing else of the page while the request runs', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderPage();

    expect(screen.getByText('Carregando...')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum feedback enviado ainda.')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows the timeline with one item per feedback in the order of the service', async () => {
    renderPage();
    await waitForPage();

    const items = timelineItems();
    expect(items).toHaveLength(3);
    expect(within(items[0]).getByText('7 dias')).toBeInTheDocument();
    expect(within(items[1]).getByText('15 dias')).toBeInTheDocument();
    expect(within(items[1]).getByText('Expirou sem resposta')).toBeInTheDocument();
    expect(within(items[2]).getByText('21 dias')).toBeInTheDocument();
  });

  it('shows the band of each answered milestone as a badge with its tone, and none on an unanswered one', async () => {
    mockApi([DAY_7, DAY_15_EXPIRED, DAY_21, DAY_30_ATTENTION]);
    renderPage();
    await waitForPage();

    const items = timelineItems();
    expect(within(items[0]).getByText('Estável')).toHaveClass(DS.Badge, 'badge--warning');
    expect(within(items[2]).getByText('Bom')).toHaveClass(DS.Badge, 'badge--success');
    expect(within(items[3]).getByText('Atenção')).toHaveClass(DS.Badge, 'badge--error');
    expect(within(items[1]).queryByText(/Estável|Bom|Atenção/)).not.toBeInTheDocument();
  });

  it('shows the pillar table with one column per answered milestone', async () => {
    renderPage();
    await waitForPage();

    const table = screen.getByRole('table', { name: 'Pilares por envio' });
    expect(within(table).getByRole('columnheader', { name: 'Pilar' })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: /^7 dias/ })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: /^21 dias/ })).toBeInTheDocument();
    expect(within(table).queryByRole('columnheader', { name: /^15 dias/ })).not.toBeInTheDocument();
    expect(within(table).getByRole('row', { name: /Adesão ao treino/ })).toBeInTheDocument();
    expect(within(table).getByRole('row', { name: /Adesão à dieta/ })).toBeInTheDocument();
    expect(within(table).getByRole('row', { name: /Sono/ })).toBeInTheDocument();
  });

  it('shows each pillar score with the variation against the previous answered milestone', async () => {
    renderPage();
    await waitForPage();

    const [trainingFirst, trainingSecond] = valueCellsOf(/Adesão ao treino/);
    expect(trainingFirst).toHaveTextContent('60');
    expect(trainingFirst).not.toHaveTextContent(/[+−-]\s?\d/);
    expect(trainingSecond).toHaveTextContent('80');
    expect(trainingSecond).toHaveTextContent(/\+\s?20/);

    const [sleepFirst, sleepSecond] = valueCellsOf(/Sono/);
    expect(sleepFirst).toHaveTextContent('50');
    expect(sleepSecond).toHaveTextContent('40');
    expect(sleepSecond).toHaveTextContent(/[−-]\s?10/);
  });

  it('shows a dash where a milestone has no score for a pillar and no variation after it', async () => {
    renderPage();
    await waitForPage();

    const [dietFirst, dietSecond] = valueCellsOf(/Adesão à dieta/);
    expect(dietFirst.textContent.trim()).toBe('-');
    expect(dietSecond).toHaveTextContent('70');
    expect(dietSecond).not.toHaveTextContent(/[+−-]\s?\d/);
  });

  it('shows the overall index of each answered milestone with its variation', async () => {
    renderPage();
    await waitForPage();

    const [overallFirst, overallSecond] = valueCellsOf(/Índice geral/);
    expect(overallFirst).toHaveTextContent('55');
    expect(overallFirst).not.toHaveTextContent(/[+−-]\s?\d/);
    expect(overallSecond).toHaveTextContent('77');
    expect(overallSecond).toHaveTextContent(/\+\s?22/);
  });

  it('shows the open answers with their question', async () => {
    renderPage();
    await waitForPage();

    const answers = screen.getByRole('region', { name: 'Respostas abertas' });
    expect(within(answers).getByText('Dormi mal por causa do trabalho.')).toBeInTheDocument();
    expect(within(answers).getByText('Semana ótima, consegui treinar tudo.')).toBeInTheDocument();
    expect(within(answers).getAllByText('Quer contar mais alguma coisa?')).toHaveLength(2);
  });

  it('shows the empty message and still offers the ad-hoc send when the student has no feedback', async () => {
    mockApi([]);
    renderPage();
    await waitForPage();

    expect(screen.getByText('Nenhum feedback enviado ainda.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar feedback agora' })).toBeEnabled();
  });

  it('disables the ad-hoc send while the student already has a pending feedback', async () => {
    mockApi([DAY_7, ADHOC_PENDING]);
    renderPage();
    await waitForPage();

    expect(screen.getByRole('button', { name: 'Enviar feedback agora' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Enviar feedback agora' })).toHaveClass('btn--secondary');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('shows the API error with retry', async () => {
    let failing = true;
    api.get.mockImplementation(() => (failing ? Promise.reject({ userMessage: 'Aluno não encontrado.' }) : Promise.resolve({ data: buildHistory() })));
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Aluno não encontrado.')).toBeInTheDocument();
    failing = false;
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await waitForPage()).toBeInTheDocument();
    expect(screen.queryByText('Aluno não encontrado.')).not.toBeInTheDocument();
  });

  it('asks for confirmation before the ad-hoc send and sends nothing when cancelled', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();
    expect(screen.getByRole('button', { name: 'Enviar feedback agora' })).toHaveClass('btn', 'btn--secondary');

    const dialog = await openAdhocDialog(user);
    expect(dialog).toHaveClass(DS.ConfirmDialog);
    expect(dialog).toHaveAccessibleName(/feedback agora para Ana Souza/);
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
    expect(timelineItems()).toHaveLength(3);
  });

  it('creates the ad-hoc request once confirmed, tells the trainer and shows it on the timeline', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    const dialog = await openAdhocDialog(user);
    await user.click(within(dialog).getByRole('button', { name: 'Enviar' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith(HISTORY_URL));
    expect(api.post).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Feedback enviado.', 'success'));
    await waitFor(() => expect(timelineItems()).toHaveLength(4));
    expect(within(timelineItems()[3]).getByText('Envio manual')).toBeInTheDocument();
    expect(within(timelineItems()[3]).getByText('Aguardando resposta')).toBeInTheDocument();
  });

  it('shows the API message and adds nothing when the service refuses because one is already pending', async () => {
    api.post.mockRejectedValue({ userMessage: ALREADY_PENDING_MESSAGE, response: { data: { messageCode: 'STUDENT_FEEDBACK_ALREADY_PENDING' } } });
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    const dialog = await openAdhocDialog(user);
    await user.click(within(dialog).getByRole('button', { name: 'Enviar' }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith(ALREADY_PENDING_MESSAGE, 'error'));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(showToast).not.toHaveBeenCalledWith('Feedback enviado.', 'success');
    expect(timelineItems()).toHaveLength(3);
  });

  it('goes back to the student page from "Voltar"', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    await user.click(screen.getByRole('button', { name: 'Voltar' }));

    expect(await screen.findByText('Student Page')).toBeInTheDocument();
  });
});
