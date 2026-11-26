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
const SETTINGS_PATH = '/trainer/student-feedbacks/settings';

const DS = {
  Badge: 'badge',
  EmptyBlock: 'empty-block',
  Timeline: 'timeline',
  Meter: 'meter',
};

const LEGEND = 'Notas de 0 a 100, calculadas das respostas do aluno. Abaixo de 50 pede atenção; de 50 a 74, estável; 75 ou mais, bom.';
const EMPTY_INVITE = 'Envie um agora ou ative o envio automático para ouvir Ana automaticamente.';
const EMPTY_NOTHING_SCHEDULED = 'O envio automático está ativo, mas não há envio previsto para Ana. Envie um agora.';
const SLEEP_QUESTION = 'Como foi a qualidade do seu sono nesta semana?';
const TRAINING_QUESTION = 'De 0 a 10, quanto você seguiu o treino?';

const BAND_LABEL = { good: 'Bom', stable: 'Estável', attention: 'Atenção' };

// Scored answer behind a pillar, with the fields of the trainer API
const answer = (questionId, question, type, value) => ({
  questionId,
  question,
  type,
  typeLabel: type === 'stars' ? 'Estrelas' : 'Nota',
  value,
  max: type === 'stars' ? 5 : 10,
  inverted: false,
});

// Pillar score with its band and the answers behind it, as the service sends after this feature
const pillar = (name, pillarLabel, score, band, answers = []) => ({ pillar: name, pillarLabel, score, band, bandLabel: BAND_LABEL[band], answers });

// Pillar score as the service sent before this feature: no band and no answers
const oldPillar = (name, pillarLabel, score) => ({ pillar: name, pillarLabel, score });

// Feedback of the history with the fields of the trainer API; overrides replace any of them
const buildFeedback = (overrides = {}) => ({
  id: 'fb-1',
  milestone: 'D7',
  milestoneLabel: 'D7',
  status: 'answered',
  statusLabel: 'Respondido',
  sentAt: '2026-11-02T12:00:00.000Z',
  expiresAt: '2026-11-05T12:00:00.000Z',
  submittedAt: '2026-11-03T12:00:00.000Z',
  readAt: '2026-11-03T18:00:00.000Z',
  overallIndex: 62,
  band: 'stable',
  bandLabel: 'Estável',
  pillars: [
    pillar('training_adherence', 'Adesão ao treino', 80, 'good', [answer('q-1', TRAINING_QUESTION, 'score', 8)]),
    pillar('sleep', 'Sono', 50, 'stable', [answer('q-2', SLEEP_QUESTION, 'stars', 3)]),
    pillar('routine', 'Rotina', 60, 'stable', [answer('q-3', 'De 0 a 10, quanto sua rotina ajudou nos treinos?', 'score', 6)]),
  ],
  openAnswers: [],
  ...overrides,
});

// Feedback the student did not answer, in the given status
const buildUnanswered = (overrides) => buildFeedback({ submittedAt: null, readAt: null, overallIndex: null, band: null, bandLabel: null, pillars: [], openAnswers: [], ...overrides });

const DAY_7 = buildFeedback();
const DAY_15 = buildFeedback({
  id: 'fb-2',
  milestone: 'D15',
  milestoneLabel: 'D15',
  sentAt: '2026-11-10T12:00:00.000Z',
  expiresAt: '2026-11-13T12:00:00.000Z',
  submittedAt: '2026-11-11T12:00:00.000Z',
  overallIndex: 58,
  pillars: [
    pillar('training_adherence', 'Adesão ao treino', 90, 'good', [answer('q-1', TRAINING_QUESTION, 'score', 9)]),
    pillar('sleep', 'Sono', 25, 'attention', [answer('q-2', SLEEP_QUESTION, 'stars', 2)]),
    pillar('routine', 'Rotina', 60, 'stable', [answer('q-3', 'De 0 a 10, quanto sua rotina ajudou nos treinos?', 'score', 6)]),
    pillar('hydration', 'Hidratação', 55, 'stable', [answer('q-4', 'De 0 a 10, quanto você bebeu de água em relação à meta?', 'score', 5)]),
  ],
});
const DAY_21_EXPIRED = buildUnanswered({
  id: 'fb-3',
  milestone: 'D21',
  milestoneLabel: 'D21',
  status: 'expired',
  statusLabel: 'Expirado',
  sentAt: '2026-11-17T12:00:00.000Z',
  expiresAt: '2026-11-20T12:00:00.000Z',
});
const ADHOC_PENDING = buildUnanswered({
  id: 'fb-4',
  milestone: 'ADHOC',
  milestoneLabel: 'Avulso',
  status: 'pending',
  statusLabel: 'Pendente',
  sentAt: '2026-11-24T12:00:00.000Z',
  expiresAt: '2026-11-27T12:00:00.000Z',
});
const DAY_15_OLD_SHAPE = { ...DAY_15, pillars: [oldPillar('training_adherence', 'Adesão ao treino', 90), oldPillar('sleep', 'Sono', 25)] };

const FULL_HISTORY = [DAY_7, DAY_15, DAY_21_EXPIRED, ADHOC_PENDING];

const NEXT_D30 = { milestone: 'D30', milestoneLabel: 'D30', dueAt: '2026-11-26T12:00:00.000Z' };
const NEXT_D7 = { milestone: 'D7', milestoneLabel: 'D7', dueAt: '2026-12-01T12:00:00.000Z' };
const AUTO_ON = { enabled: true, next: NEXT_D30 };
const AUTO_ON_FIRST = { enabled: true, next: NEXT_D7 };
const AUTO_ON_NOTHING_LEFT = { enabled: true, next: null };
const AUTO_OFF = { enabled: false, next: null };

// Routes the requests of the page by URL; `autoSend` left undefined answers like the service before this feature
const mockApi = ({ feedbacks = FULL_HISTORY, autoSend } = {}) => {
  const data = {
    student: { id: 'student-1', name: 'Ana Souza', avatarUrl: null },
    hasPending: feedbacks.some((feedback) => feedback.status === 'pending'),
    feedbacks,
  };
  if (autoSend !== undefined) data.autoSend = autoSend;
  api.get.mockImplementation((url) => {
    if (url === HISTORY_URL) return Promise.resolve({ data });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
  api.post.mockResolvedValue({ data: { id: 'fb-9' } });
};

// Renders the history of student-1 with a marker for the settings page, and waits for it to load
const renderPage = async () => {
  const view = render(
    <MemoryRouter initialEntries={[HISTORY_URL]}>
      <Routes>
        <Route path="/trainer/students/:id/feedbacks" element={<StudentFeedbackHistory />} />
        <Route path={SETTINGS_PATH} element={<div>Settings Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { level: 1, name: 'Feedback de Ana Souza' });
  return view;
};

// Text made of a prefix and a day/month of 2026, shown with or without the year
const dated = (prefix, dayMonth) => new RegExp(`^${prefix} ${dayMonth}(/2026)?$`);

// Status line of the automatic sending
const autoSendLine = () => screen.getByRole('region', { name: 'Envio automático' });

// Status line of the automatic sending, or null when it is not shown
const queryAutoSendLine = () => screen.queryByRole('region', { name: 'Envio automático' });

// Items of the timeline, in the order shown
const timelineItems = () => within(screen.getByRole('list', { name: 'Linha do tempo dos feedbacks' })).getAllByRole('listitem');

// Block of the latest answered feedback
const latestBlock = () => screen.getByRole('region', { name: 'Último feedback respondido' });

// Row of a pillar in the latest block: the button that expands its answers
const pillarRow = (name) => within(latestBlock()).getByRole('button', { name: new RegExp(`^${name}`) });

// Elements with the given text in the latest block that sit outside the pillar rows
const outsidePillarRows = (text) => within(latestBlock()).getAllByText(text).filter((element) => !element.closest('button'));

describe('StudentFeedbackHistory: auto-send status line', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('says the automatic sending is active, in a success badge, with the next milestone and its date', async () => {
    mockApi({ autoSend: AUTO_ON });
    await renderPage();

    const line = autoSendLine();
    expect(within(line).getByText('Envio automático ativo')).toHaveClass(DS.Badge, 'badge--success');
    expect(line).toHaveTextContent(/Próximo: 30 dias, em 26\/11/);
  });

  it('offers "Configurar envios" as a link to the settings page while the sending is active', async () => {
    mockApi({ autoSend: AUTO_ON });
    const user = userEvent.setup();
    await renderPage();

    await user.click(within(autoSendLine()).getByRole('link', { name: 'Configurar envios' }));

    expect(await screen.findByText('Settings Page')).toBeInTheDocument();
  });

  it('says it is active without a "Próximo" when nothing is left to send', async () => {
    mockApi({ autoSend: AUTO_ON_NOTHING_LEFT });
    await renderPage();

    const line = autoSendLine();
    expect(within(line).getByText('Envio automático ativo')).toHaveClass(DS.Badge, 'badge--success');
    expect(line).not.toHaveTextContent(/Próximo/);
  });

  it('says the automatic sending is off, in a neutral badge, and what that means for the student', async () => {
    mockApi({ autoSend: AUTO_OFF });
    await renderPage();

    const line = autoSendLine();
    expect(within(line).getByText('Envio automático desligado')).toHaveClass(DS.Badge, 'badge--neutral');
    expect(within(line).getByText('Ana só recebe o que você enviar.')).toBeInTheDocument();
    expect(line).not.toHaveTextContent(/Próximo/);
    expect(within(line).queryByText('Envio automático ativo')).not.toBeInTheDocument();
  });

  it('offers "Ativar envio automático" as a link to the settings page while the sending is off', async () => {
    mockApi({ autoSend: AUTO_OFF });
    const user = userEvent.setup();
    await renderPage();

    const link = within(autoSendLine()).getByRole('link', { name: 'Ativar envio automático' });
    expect(link).toHaveAttribute('href', SETTINGS_PATH);
    await user.click(link);

    expect(await screen.findByText('Settings Page')).toBeInTheDocument();
  });

  it('shows the status line right under the title, also when the student has no feedback yet', async () => {
    mockApi({ feedbacks: [], autoSend: AUTO_OFF });
    await renderPage();

    expect(within(autoSendLine()).getByText('Envio automático desligado')).toBeInTheDocument();
  });

  it('hides the status line and still draws the new page when the service sends no autoSend', async () => {
    mockApi({ feedbacks: [DAY_7, DAY_15_OLD_SHAPE] });
    await renderPage();

    expect(latestBlock()).toBeInTheDocument();
    expect(queryAutoSendLine()).not.toBeInTheDocument();
    expect(screen.queryByText(/Envio automático (ativo|desligado)/)).not.toBeInTheDocument();
  });
});

describe('StudentFeedbackHistory: empty state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('says when the first automatic feedback goes out, in an EmptyBlock', async () => {
    mockApi({ feedbacks: [], autoSend: AUTO_ON_FIRST });
    await renderPage();

    const title = screen.getByRole('heading', { level: 2, name: /^O primeiro feedback sai em 01\/12(\/2026)?\.$/ });
    expect(title.parentElement).toHaveClass(DS.EmptyBlock);
    expect(within(title.parentElement).getByText('Ana recebe o de 7 dias automaticamente. Se quiser ouvir antes, envie um agora.')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum feedback enviado ainda.')).not.toBeInTheDocument();
  });

  it('invites to send one or turn the automatic sending on when it is off, in an EmptyBlock', async () => {
    mockApi({ feedbacks: [], autoSend: AUTO_OFF });
    await renderPage();

    const title = screen.getByRole('heading', { level: 2, name: 'Nenhum feedback enviado ainda.' });
    expect(title.parentElement).toHaveClass(DS.EmptyBlock);
    expect(within(title.parentElement).getByText(EMPTY_INVITE)).toBeInTheDocument();
    expect(title.parentElement).not.toHaveTextContent(/7, 15, 21 e 30 dias/);
  });

  it('says the sending is active with no send foreseen, without inviting to turn it on, when nothing is scheduled', async () => {
    mockApi({ feedbacks: [], autoSend: AUTO_ON_NOTHING_LEFT });
    const { container } = await renderPage();

    const title = screen.getByRole('heading', { level: 2, name: 'Nenhum feedback enviado ainda.' });
    expect(title.parentElement).toHaveClass(DS.EmptyBlock);
    expect(within(title.parentElement).getByText(EMPTY_NOTHING_SCHEDULED)).toBeInTheDocument();
    expect(within(autoSendLine()).getByText('Envio automático ativo')).toBeInTheDocument();
    expect(container).not.toHaveTextContent(/ative o envio automático/i);
    expect(screen.queryByText(/O primeiro feedback sai em/)).not.toBeInTheDocument();
  });

  it('keeps the header "Enviar feedback agora" as the single action when the sending is active but nothing is scheduled', async () => {
    mockApi({ feedbacks: [], autoSend: AUTO_ON_NOTHING_LEFT });
    await renderPage();

    const block = screen.getByText(EMPTY_NOTHING_SCHEDULED).parentElement;
    expect(block).toHaveClass(DS.EmptyBlock);
    expect(within(block).queryByRole('button')).not.toBeInTheDocument();
    expect(within(block).queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Enviar feedback agora' })).toHaveLength(1);
  });

  it('shows the invite to send one or turn the sending on when the service sends no autoSend', async () => {
    mockApi({ feedbacks: [] });
    const { container } = await renderPage();

    expect(screen.getByRole('heading', { level: 2, name: 'Nenhum feedback enviado ainda.' })).toBeInTheDocument();
    expect(screen.getByText(EMPTY_INVITE)).toBeInTheDocument();
    expect(container).not.toHaveTextContent(/7, 15, 21 e 30 dias|não há envio previsto/);
  });

  it('draws no timeline, no latest result and no table while there is nothing sent', async () => {
    mockApi({ feedbacks: [], autoSend: AUTO_ON_FIRST });
    await renderPage();

    expect(screen.getByRole('heading', { level: 2, name: /^O primeiro feedback sai em/ })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Linha do tempo dos feedbacks' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Último feedback respondido' })).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByText('Próximo envio')).not.toBeInTheDocument();
  });

  it('keeps the header "Enviar feedback agora" as the single send action, with no button inside the empty block', async () => {
    mockApi({ feedbacks: [], autoSend: AUTO_OFF });
    await renderPage();

    const block = screen.getByText(EMPTY_INVITE).parentElement;
    expect(block).toHaveClass(DS.EmptyBlock);
    expect(within(block).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Enviar feedback agora' })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Enviar feedback agora' })).toBeEnabled();
  });

  it('keeps a single send action on the empty page that announces the first automatic feedback, and it still sends', async () => {
    mockApi({ feedbacks: [], autoSend: AUTO_ON_FIRST });
    const user = userEvent.setup();
    await renderPage();

    const block = screen.getByRole('heading', { level: 2, name: /^O primeiro feedback sai em/ }).parentElement;
    expect(within(block).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Enviar feedback agora' })).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Enviar feedback agora' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Enviar' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith(HISTORY_URL));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Feedback enviado.', 'success'));
  });
});

describe('StudentFeedbackHistory: timeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi({ autoSend: AUTO_ON });
  });

  it('draws the sends with the DS Timeline: one item per feedback in the order of the service, then the next send', async () => {
    await renderPage();

    expect(screen.getByRole('list', { name: 'Linha do tempo dos feedbacks' })).toHaveClass(DS.Timeline);
    const items = timelineItems();
    expect(items).toHaveLength(5);
    expect(within(items[0]).getByText('7 dias')).toBeInTheDocument();
    expect(within(items[1]).getByText('15 dias')).toBeInTheDocument();
    expect(within(items[2]).getByText('21 dias')).toBeInTheDocument();
    expect(within(items[3]).getByText('Envio manual')).toBeInTheDocument();
    expect(within(items[4]).getByText('30 dias')).toBeInTheDocument();
  });

  it('marks each item with the state of its send', async () => {
    await renderPage();

    const items = timelineItems();
    expect(items[0]).toHaveClass('timeline__item--answered');
    expect(items[1]).toHaveClass('timeline__item--answered');
    expect(items[2]).toHaveClass('timeline__item--expired');
    expect(items[3]).toHaveClass('timeline__item--pending');
    expect(items[4]).toHaveClass('timeline__item--upcoming');
  });

  it('shows an answered feedback with the answer date, the index and the band badge', async () => {
    await renderPage();

    const [first] = timelineItems();
    expect(within(first).getByText(dated('Respondido em', '03/11'))).toBeInTheDocument();
    expect(within(first).getByText('62')).toBeInTheDocument();
    expect(within(first).getByText('Estável')).toHaveClass(DS.Badge, 'badge--warning');
    expect(within(first).queryByText(/^[+−]\d/)).not.toBeInTheDocument();
  });

  it('shows the variation against the previous answered feedback as a badge with its tone', async () => {
    await renderPage();

    const second = timelineItems()[1];
    expect(within(second).getByText(dated('Respondido em', '11/11'))).toBeInTheDocument();
    expect(within(second).getByText('58')).toBeInTheDocument();
    expect(within(second).getByText('−4')).toHaveClass(DS.Badge, 'badge--error');
  });

  it('compares an answered feedback with the previous answered one, skipping the unanswered in between', async () => {
    const day30 = buildFeedback({ id: 'fb-5', milestone: 'D30', milestoneLabel: 'D30', sentAt: '2026-11-22T12:00:00.000Z', submittedAt: '2026-11-23T12:00:00.000Z', overallIndex: 80, band: 'good', bandLabel: 'Bom' });
    mockApi({ feedbacks: [DAY_7, DAY_21_EXPIRED, day30], autoSend: AUTO_ON_NOTHING_LEFT });
    await renderPage();

    const items = timelineItems();
    expect(items).toHaveLength(3);
    expect(items[2]).toHaveClass('timeline__item--answered');
    expect(within(items[2]).getByText('Bom')).toHaveClass(DS.Badge, 'badge--success');
    expect(within(items[2]).getByText('+18')).toHaveClass(DS.Badge, 'badge--success');
  });

  it('shows an expired feedback with the send date and "Expirou sem resposta" in a neutral badge', async () => {
    await renderPage();

    const expired = timelineItems()[2];
    expect(within(expired).getByText(dated('Enviado em', '17/11'))).toBeInTheDocument();
    expect(within(expired).getByText('Expirou sem resposta')).toHaveClass(DS.Badge, 'badge--neutral');
    expect(within(expired).queryByText('Expirado')).not.toBeInTheDocument();
    expect(within(expired).queryByText(/Estável|Bom|Atenção/)).not.toBeInTheDocument();
  });

  it('shows a pending feedback with the send date and "Aguardando resposta" in a brand badge', async () => {
    await renderPage();

    const pending = timelineItems()[3];
    expect(within(pending).getByText(dated('Enviado em', '24/11'))).toBeInTheDocument();
    expect(within(pending).getByText('Aguardando resposta')).toHaveClass(DS.Badge, 'badge--brand');
    expect(within(pending).queryByText('Pendente')).not.toBeInTheDocument();
  });

  it('closes with the next scheduled milestone as "Próximo envio", with the date it is scheduled for', async () => {
    await renderPage();

    expect(timelineItems()).toHaveLength(5);
    const upcoming = timelineItems()[4];
    expect(within(upcoming).getByText('30 dias')).toBeInTheDocument();
    expect(within(upcoming).getByText(dated('Agendado para', '26/11'))).toBeInTheDocument();
    expect(within(upcoming).getByText('Próximo envio')).toBeInTheDocument();
    expect(within(upcoming).queryByText(/Enviado em|Respondido em/)).not.toBeInTheDocument();
  });

  it('adds no upcoming item when nothing is scheduled', async () => {
    mockApi({ autoSend: AUTO_ON_NOTHING_LEFT });
    await renderPage();

    const items = timelineItems();
    expect(items).toHaveLength(4);
    expect(items[3]).toHaveClass('timeline__item--pending');
    expect(screen.queryByText('Próximo envio')).not.toBeInTheDocument();
  });

  it('adds no upcoming item when the service sends no autoSend', async () => {
    mockApi();
    await renderPage();

    const items = timelineItems();
    expect(items).toHaveLength(4);
    expect(within(items[3]).getByText('Aguardando resposta')).toBeInTheDocument();
    expect(screen.queryByText('Próximo envio')).not.toBeInTheDocument();
  });
});

describe('StudentFeedbackHistory: latest answered feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi({ autoSend: AUTO_ON });
  });

  it('is a section named "Último feedback respondido" that says which feedback it is and what it is compared with', async () => {
    await renderPage();

    const block = latestBlock();
    expect(within(block).getByRole('heading', { level: 2, name: 'Último feedback respondido' })).toBeInTheDocument();
    expect(block).toHaveTextContent(/15 dias · respondido em 11\/11(\/2026)? · comparado com 7 dias/);
  });

  it('shows the overall index as "58 de 100" with a meter in the tone of its band', async () => {
    await renderPage();

    const block = latestBlock();
    expect(within(block).getAllByText('Índice geral').length).toBeGreaterThan(0);
    expect(block).toHaveTextContent(/58\s*de 100/);
    expect(within(block).getByRole('img', { name: '58 de 100' })).toHaveClass(DS.Meter, 'meter--warning');
  });

  it('shows the band of the overall index as a badge and the variation since the previous answered feedback', async () => {
    await renderPage();

    const [band] = outsidePillarRows('Estável');
    expect(outsidePillarRows('Estável')).toHaveLength(1);
    expect(band).toHaveClass(DS.Badge, 'badge--warning');
    const [variation] = outsidePillarRows('−4');
    expect(variation).toHaveClass(DS.Badge, 'badge--error');
    expect(latestBlock()).toHaveTextContent(/−4\s*desde 7 dias/);
  });

  it('explains the scale and the bands in one line', async () => {
    await renderPage();

    expect(within(latestBlock()).getByText(LEGEND)).toBeInTheDocument();
  });

  it('shows one row per pillar of the latest answered feedback', async () => {
    await renderPage();

    expect(pillarRow('Adesão ao treino')).toBeInTheDocument();
    expect(pillarRow('Sono')).toBeInTheDocument();
    expect(pillarRow('Rotina')).toBeInTheDocument();
    expect(pillarRow('Hidratação')).toBeInTheDocument();
    expect(within(latestBlock()).getAllByRole('button')).toHaveLength(4);
  });

  it('shows each pillar as "N de 100" with a meter named the same way', async () => {
    await renderPage();

    expect(pillarRow('Sono')).toHaveTextContent(/25\s*de 100/);
    expect(within(pillarRow('Sono')).getByRole('img', { name: '25 de 100' })).toHaveClass(DS.Meter);
    expect(pillarRow('Adesão ao treino')).toHaveTextContent(/90\s*de 100/);
    expect(within(pillarRow('Adesão ao treino')).getByRole('img', { name: '90 de 100' })).toHaveClass(DS.Meter);
  });

  it('tints each pillar meter by its band: good is success, stable is warning, attention is danger', async () => {
    await renderPage();

    expect(within(pillarRow('Adesão ao treino')).getByRole('img', { name: '90 de 100' })).toHaveClass('meter--success');
    expect(within(pillarRow('Rotina')).getByRole('img', { name: '60 de 100' })).toHaveClass('meter--warning');
    expect(within(pillarRow('Sono')).getByRole('img', { name: '25 de 100' })).toHaveClass('meter--danger');
  });

  it('shows the band of each pillar as a badge with its tone', async () => {
    await renderPage();

    expect(within(pillarRow('Adesão ao treino')).getByText('Bom')).toHaveClass(DS.Badge, 'badge--success');
    expect(within(pillarRow('Rotina')).getByText('Estável')).toHaveClass(DS.Badge, 'badge--warning');
    expect(within(pillarRow('Sono')).getByText('Atenção')).toHaveClass(DS.Badge, 'badge--error');
  });

  it('shows the variation of each pillar against the previous answered feedback as a badge with its tone', async () => {
    await renderPage();

    expect(within(pillarRow('Adesão ao treino')).getByText('+10')).toHaveClass(DS.Badge, 'badge--success');
    expect(within(pillarRow('Sono')).getByText('−25')).toHaveClass(DS.Badge, 'badge--error');
    expect(within(pillarRow('Rotina')).getByText('0')).toHaveClass(DS.Badge, 'badge--neutral');
  });

  it('shows no variation on a pillar the previous answered feedback did not score', async () => {
    await renderPage();

    const hydration = pillarRow('Hidratação');
    expect(within(hydration).getByText('Estável')).toBeInTheDocument();
    expect(within(hydration).queryByText(/^([+−]\d+|0)$/)).not.toBeInTheDocument();
  });

  it('describes the latest answered feedback even when later sends were not answered', async () => {
    await renderPage();

    const block = latestBlock();
    expect(block).toHaveTextContent(/15 dias · respondido em 11\/11/);
    expect(block).not.toHaveTextContent(/Envio manual|21 dias/);
  });

  it('shows the only answered feedback without variations and without a comparison', async () => {
    mockApi({ feedbacks: [DAY_7], autoSend: AUTO_ON });
    await renderPage();

    const block = latestBlock();
    expect(block).toHaveTextContent(/62\s*de 100/);
    expect(within(block).getByRole('img', { name: '62 de 100' })).toHaveClass(DS.Meter, 'meter--warning');
    expect(pillarRow('Sono')).toHaveTextContent(/50\s*de 100/);
    expect(block).not.toHaveTextContent(/comparado com|desde/);
    expect(within(block).queryByText(/^([+−]\d+|0)$/)).not.toBeInTheDocument();
  });

  it('is not drawn while no feedback was answered, and the timeline still is', async () => {
    mockApi({ feedbacks: [ADHOC_PENDING], autoSend: AUTO_ON });
    await renderPage();

    expect(within(timelineItems()[0]).getByText('Aguardando resposta')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Último feedback respondido' })).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /de 100$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('draws the pillars of a response without band and answers: neutral meter, no band badge and nothing to expand', async () => {
    mockApi({ feedbacks: [DAY_7, DAY_15_OLD_SHAPE] });
    await renderPage();

    const block = latestBlock();
    expect(block).toHaveTextContent(/Sono/);
    expect(block).toHaveTextContent(/25\s*de 100/);
    expect(within(block).getByRole('img', { name: '25 de 100' })).toHaveClass(DS.Meter, 'meter--neutral');
    expect(within(block).getByText('−25')).toHaveClass(DS.Badge, 'badge--error');
    expect(within(block).queryByText('Atenção')).not.toBeInTheDocument();
    expect(within(block).queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('StudentFeedbackHistory: answers behind a pillar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi({ autoSend: AUTO_ON });
  });

  it('keeps every pillar collapsed at first, with no question on screen', async () => {
    await renderPage();

    expect(pillarRow('Sono')).toHaveAttribute('aria-expanded', 'false');
    expect(pillarRow('Adesão ao treino')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(SLEEP_QUESTION)).not.toBeInTheDocument();
    expect(screen.queryByText(TRAINING_QUESTION)).not.toBeInTheDocument();
    expect(screen.queryByText('O que o aluno respondeu')).not.toBeInTheDocument();
  });

  it('reveals the question and the stars answer as "2 de 5" when the pillar is expanded', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(pillarRow('Sono'));

    const block = latestBlock();
    expect(pillarRow('Sono')).toHaveAttribute('aria-expanded', 'true');
    expect(within(block).getByText('O que o aluno respondeu')).toBeInTheDocument();
    expect(within(block).getByText(SLEEP_QUESTION)).toBeInTheDocument();
    expect(within(block).getByText('2 de 5')).toBeInTheDocument();
    expect(within(block).getByRole('img', { name: '2 de 5 estrelas' })).toBeInTheDocument();
  });

  it('reveals the question and the score answer as "9 de 10" when the pillar is expanded', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(pillarRow('Adesão ao treino'));

    const block = latestBlock();
    expect(within(block).getByText(TRAINING_QUESTION)).toBeInTheDocument();
    expect(within(block).getByText('9 de 10')).toBeInTheDocument();
    expect(within(block).queryByRole('img', { name: /estrelas/ })).not.toBeInTheDocument();
  });

  it('expands only the pillar that was used', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(pillarRow('Sono'));

    expect(pillarRow('Adesão ao treino')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText(SLEEP_QUESTION)).toBeInTheDocument();
    expect(screen.queryByText(TRAINING_QUESTION)).not.toBeInTheDocument();
  });

  it('collapses the pillar again on a second click', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(pillarRow('Sono'));
    expect(screen.getByText(SLEEP_QUESTION)).toBeInTheDocument();
    await user.click(pillarRow('Sono'));

    expect(pillarRow('Sono')).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(SLEEP_QUESTION)).not.toBeInTheDocument();
  });

  it('expands from the keyboard: the row takes focus and Enter opens it', async () => {
    const user = userEvent.setup();
    await renderPage();

    pillarRow('Sono').focus();
    expect(pillarRow('Sono')).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(pillarRow('Sono')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('2 de 5')).toBeInTheDocument();
  });

  it('shows every question of a pillar scored by more than one', async () => {
    const twoQuestions = buildFeedback({
      pillars: [pillar('sleep', 'Sono', 45, 'attention', [answer('q-2', SLEEP_QUESTION, 'stars', 2), answer('q-9', 'De 0 a 10, quanto você acordou descansado?', 'score', 4)])],
    });
    mockApi({ feedbacks: [twoQuestions], autoSend: AUTO_ON });
    const user = userEvent.setup();
    await renderPage();

    await user.click(pillarRow('Sono'));

    expect(screen.getByText(SLEEP_QUESTION)).toBeInTheDocument();
    expect(screen.getByText('2 de 5')).toBeInTheDocument();
    expect(screen.getByText('De 0 a 10, quanto você acordou descansado?')).toBeInTheDocument();
    expect(screen.getByText('4 de 10')).toBeInTheDocument();
  });
});

describe('StudentFeedbackHistory: comparison by send', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the "Evolução por envio" table with one column per answered feedback when there are two or more', async () => {
    mockApi({ autoSend: AUTO_ON });
    await renderPage();

    const section = screen.getByRole('region', { name: 'Evolução por envio' });
    expect(within(section).getByRole('heading', { level: 2, name: 'Evolução por envio' })).toBeInTheDocument();
    const table = within(section).getByRole('table');
    expect(within(table).getByRole('columnheader', { name: /^7 dias/ })).toBeInTheDocument();
    expect(within(table).getByRole('columnheader', { name: /^15 dias/ })).toBeInTheDocument();
    expect(within(table).queryByRole('columnheader', { name: /^21 dias|^Envio manual/ })).not.toBeInTheDocument();
    expect(within(table).getByRole('row', { name: /^Sono/ })).toHaveTextContent(/50.*25/);
    expect(within(table).getByRole('row', { name: /^Índice geral/ })).toHaveTextContent(/62.*58/);
  });

  it('renders no comparison table with exactly one answered feedback, next to its latest result', async () => {
    mockApi({ feedbacks: [DAY_7, DAY_21_EXPIRED], autoSend: AUTO_ON });
    await renderPage();

    expect(latestBlock()).toHaveTextContent(/62\s*de 100/);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Evolução por envio' })).not.toBeInTheDocument();
    expect(screen.queryByText('Pilares por envio')).not.toBeInTheDocument();
  });
});
