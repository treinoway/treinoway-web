import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render, screen, within } from '../../test/test-utils';

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
const TEMPLATES_URL = '/trainer/student-feedbacks/templates';

const DS = { EmptyBlock: 'empty-block' };

const UNNAMED_TITLE = 'Feedback de Aluno sem nome';
const OFF_NOTE = 'O aluno só recebe o que você enviar.';
const EMPTY_INVITE = 'Envie um agora ou ative o envio automático para ouvir o aluno automaticamente.';
const EMPTY_NOTHING_SCHEDULED = 'O envio automático está ativo, mas não há envio previsto para o aluno. Envie um agora.';
const SCHEDULED_DESCRIPTION = 'O aluno recebe o de 7 dias automaticamente. Se quiser ouvir antes, envie um agora.';

const NEXT_D7 = { milestone: 'D7', milestoneLabel: 'D7', dueAt: '2026-12-01T12:00:00.000Z' };
const AUTO_ON_FIRST = { enabled: true, next: NEXT_D7 };
const AUTO_ON_NOTHING_LEFT = { enabled: true, next: null };
const AUTO_OFF = { enabled: false, next: null };

const ANSWERED = {
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
  pillars: [{ pillar: 'sleep', pillarLabel: 'Sono', score: 50, band: 'stable', bandLabel: 'Estável', answers: [] }],
  openAnswers: [],
};

// Routes the requests of the page by URL, answering the history of a student with the given name
const mockApi = ({ name = null, feedbacks = [], autoSend } = {}) => {
  const data = { student: { id: 'student-1', name, avatarUrl: null }, hasPending: false, feedbacks };
  if (autoSend !== undefined) data.autoSend = autoSend;
  api.get.mockImplementation((url) => {
    if (url === HISTORY_URL) return Promise.resolve({ data });
    if (url === TEMPLATES_URL) return Promise.resolve({ data: { templates: [] } });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
};

// Renders the history of student-1 and waits for the title of a student without a name
const renderPage = async () => {
  const view = render(
    <MemoryRouter initialEntries={[HISTORY_URL]}>
      <Routes>
        <Route path="/trainer/students/:id/feedbacks" element={<StudentFeedbackHistory />} />
        <Route path="/trainer/student-feedbacks/settings" element={<div>Settings Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { level: 1, name: UNNAMED_TITLE });
  return view;
};

// Status line of the automatic sending
const autoSendLine = () => screen.getByRole('region', { name: 'Envio automático' });

describe('StudentFeedbackHistory: student without a name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([[null], [''], [undefined]])('titles the page "Feedback de Aluno sem nome" when the name is %j', async (name) => {
    mockApi({ name, autoSend: AUTO_OFF });
    await renderPage();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(UNNAMED_TITLE);
  });

  it('opens the note of the status line with "O aluno" when the automatic sending is off', async () => {
    mockApi({ autoSend: AUTO_OFF });
    await renderPage();

    expect(within(autoSendLine()).getByText(OFF_NOTE)).toBeInTheDocument();
    expect(within(autoSendLine()).getByRole('link', { name: 'Ativar envio automático' })).toBeInTheDocument();
  });

  it('invites to hear "o aluno", in lower case inside the sentence, on the empty page with the sending off', async () => {
    mockApi({ autoSend: AUTO_OFF });
    const { container } = await renderPage();

    expect(screen.getByText('Nenhum feedback enviado ainda.')).toBeInTheDocument();
    expect(screen.getByText(EMPTY_INVITE)).toBeInTheDocument();
    expect(container.querySelector(`.${DS.EmptyBlock}`)).toHaveTextContent(EMPTY_INVITE);
  });

  it('shows the same invite when the service sends no autoSend', async () => {
    mockApi();
    await renderPage();

    expect(screen.getByText(EMPTY_INVITE)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Envio automático' })).not.toBeInTheDocument();
  });

  it('says no send is foreseen for "o aluno", in lower case inside the sentence, with the sending on and nothing scheduled', async () => {
    mockApi({ autoSend: AUTO_ON_NOTHING_LEFT });
    const { container } = await renderPage();

    expect(screen.getByText('Nenhum feedback enviado ainda.')).toBeInTheDocument();
    expect(screen.getByText(EMPTY_NOTHING_SCHEDULED)).toBeInTheDocument();
    expect(container.querySelector(`.${DS.EmptyBlock}`)).toHaveTextContent(EMPTY_NOTHING_SCHEDULED);
    expect(container).not.toHaveTextContent(/ative o envio automático/i);
  });

  it('opens the scheduled empty description with "O aluno" when the first automatic feedback has a date', async () => {
    mockApi({ autoSend: AUTO_ON_FIRST });
    const { container } = await renderPage();

    expect(screen.getByText(/^O primeiro feedback sai em 01\/12(\/2026)?\.$/)).toBeInTheDocument();
    expect(screen.getByText(SCHEDULED_DESCRIPTION)).toBeInTheDocument();
    expect(container.querySelector(`.${DS.EmptyBlock}`)).toHaveTextContent(SCHEDULED_DESCRIPTION);
    expect(screen.queryByText(EMPTY_INVITE)).not.toBeInTheDocument();
  });

  it.each([
    ['sending off, nothing sent', { autoSend: AUTO_OFF }],
    ['first send scheduled', { autoSend: AUTO_ON_FIRST }],
    ['sending on, nothing scheduled', { autoSend: AUTO_ON_NOTHING_LEFT }],
    ['one answered feedback', { autoSend: AUTO_OFF, feedbacks: [ANSWERED] }],
  ])('never prints "null" or "undefined" in place of the name (%s)', async (_label, payload) => {
    mockApi(payload);
    const { container } = await renderPage();

    expect(container).not.toHaveTextContent(/null|undefined/);
  });

  it('still draws the latest result of a student without a name', async () => {
    mockApi({ autoSend: AUTO_OFF, feedbacks: [ANSWERED] });
    await renderPage();

    expect(screen.getByRole('region', { name: 'Último feedback respondido' })).toBeInTheDocument();
    expect(within(autoSendLine()).getByText(OFF_NOTE)).toBeInTheDocument();
  });

  it('asks to confirm the ad-hoc send naming the student "Aluno sem nome"', async () => {
    mockApi({ autoSend: AUTO_OFF });
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByRole('button', { name: 'Enviar feedback agora' }));

    expect(screen.getByRole('alertdialog')).toHaveAccessibleName(/^Enviar um feedback agora para Aluno sem nome\?/);
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('calls a student with a name by the first name in the same texts', async () => {
    mockApi({ name: 'Ana Souza', autoSend: AUTO_OFF });
    render(
      <MemoryRouter initialEntries={[HISTORY_URL]}>
        <Routes>
          <Route path="/trainer/students/:id/feedbacks" element={<StudentFeedbackHistory />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByRole('heading', { level: 1, name: 'Feedback de Ana Souza' });

    expect(within(autoSendLine()).getByText('Ana só recebe o que você enviar.')).toBeInTheDocument();
    expect(screen.getByText('Envie um agora ou ative o envio automático para ouvir Ana automaticamente.')).toBeInTheDocument();
    expect(screen.queryByText(/o aluno/i)).not.toBeInTheDocument();
  });
});
