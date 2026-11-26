import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render, screen, within } from '../../test/test-utils';

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

vi.mock('../../contexts/ToastContext', () => ({
  ToastProvider: ({ children }) => children,
  useToast: () => ({ showToast: vi.fn() }),
}));

import api from '../../api/axios';
import AutoSendStatus from './AutoSendStatus';
import StudentFeedbackHistory from '../../pages/trainer/StudentFeedbackHistory';

const SETTINGS_PATH = '/trainer/student-feedbacks/settings';
const HISTORY_URL = '/trainer/students/student-1/feedbacks';

const DS = { Badge: 'badge' };

const ON_LABEL = 'Envio automático ativo';
const OFF_LABEL = 'Envio automático desligado';
const OFF_NOTE = 'Ana só recebe o que você enviar.';
const CONFIGURE_LINK = { name: 'Configurar envios' };
const ENABLE_LINK = { name: 'Ativar envio automático' };

// why: the due instant is built in local time so the day and hour shown do not depend on the timezone of the machine
const NEXT_D30 = { milestone: 'D30', milestoneLabel: 'D30', dueAt: new Date(2026, 10, 26, 9, 0).toISOString() };
const AUTO_ON = { enabled: true, next: NEXT_D30 };
const AUTO_ON_NOTHING_LEFT = { enabled: true, next: null };
const AUTO_OFF = { enabled: false, next: null };

// Renders the status line inside a router with a marker for the settings page
const renderStatus = (autoSend, studentName = 'Ana') =>
  render(
    <MemoryRouter initialEntries={['/history']}>
      <Routes>
        <Route path="/history" element={<AutoSendStatus autoSend={autoSend} studentName={studentName} />} />
        <Route path={SETTINGS_PATH} element={<div>Settings Page</div>} />
      </Routes>
    </MemoryRouter>,
  );

// The status line, found by its accessible name
const statusLine = () => screen.getByRole('region', { name: 'Envio automático' });

// Renders the history page of student-1 answered with the given autoSend and waits for its title
const renderHistory = async (autoSend) => {
  const data = { student: { id: 'student-1', name: 'Ana Souza', avatarUrl: null }, hasPending: false, feedbacks: [] };
  if (autoSend !== undefined) data.autoSend = autoSend;
  api.get.mockImplementation((url) => (url === HISTORY_URL ? Promise.resolve({ data }) : Promise.reject(new Error(`unexpected GET ${url}`))));
  render(
    <MemoryRouter initialEntries={[HISTORY_URL]}>
      <Routes>
        <Route path="/trainer/students/:id/feedbacks" element={<StudentFeedbackHistory />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { level: 1, name: 'Feedback de Ana Souza' });
};

describe('AutoSendStatus: automatic sending on with a next send', () => {
  it('says the sending is on in a success badge', () => {
    renderStatus(AUTO_ON);

    expect(within(statusLine()).getByText(ON_LABEL)).toHaveClass(DS.Badge, 'badge--success');
    expect(within(statusLine()).queryByText(OFF_LABEL)).not.toBeInTheDocument();
  });

  it('names the next milestone with the web label, its day and its time', () => {
    renderStatus(AUTO_ON);

    expect(statusLine()).toHaveTextContent('Próximo: 30 dias, em 26/11 às 09:00');
  });

  it('names a milestone the app does not know with the label the service sent', () => {
    renderStatus({ enabled: true, next: { ...NEXT_D30, milestone: 'D45', milestoneLabel: '45 dias' } });

    expect(statusLine()).toHaveTextContent('Próximo: 45 dias, em 26/11 às 09:00');
  });

  it('shows no note about manual sends', () => {
    renderStatus(AUTO_ON);

    expect(within(statusLine()).queryByText(OFF_NOTE)).not.toBeInTheDocument();
  });

  it('links to the settings page as "Configurar envios"', async () => {
    const user = userEvent.setup();
    renderStatus(AUTO_ON);

    const link = within(statusLine()).getByRole('link', CONFIGURE_LINK);
    expect(link).toHaveAttribute('href', SETTINGS_PATH);
    expect(within(statusLine()).queryByRole('link', ENABLE_LINK)).not.toBeInTheDocument();
    await user.click(link);

    expect(screen.getByText('Settings Page')).toBeInTheDocument();
  });

  it('shows a dash, never "Invalid Date", when the service sent no due date', () => {
    renderStatus({ enabled: true, next: { ...NEXT_D30, dueAt: null } });

    expect(statusLine()).toHaveTextContent('Próximo: 30 dias');
    expect(statusLine()).not.toHaveTextContent(/Invalid Date|null|undefined/);
  });
});

describe('AutoSendStatus: automatic sending on with nothing left to send', () => {
  it('says the sending is on and names no next send', () => {
    renderStatus(AUTO_ON_NOTHING_LEFT);

    expect(within(statusLine()).getByText(ON_LABEL)).toHaveClass(DS.Badge, 'badge--success');
    expect(statusLine()).not.toHaveTextContent('Próximo');
    expect(within(statusLine()).queryByText(OFF_NOTE)).not.toBeInTheDocument();
  });

  it('still links to the settings page as "Configurar envios"', () => {
    renderStatus(AUTO_ON_NOTHING_LEFT);

    expect(within(statusLine()).getByRole('link', CONFIGURE_LINK)).toHaveAttribute('href', SETTINGS_PATH);
  });
});

describe('AutoSendStatus: automatic sending off', () => {
  it('says the sending is off in a neutral badge', () => {
    renderStatus(AUTO_OFF);

    expect(within(statusLine()).getByText(OFF_LABEL)).toHaveClass(DS.Badge, 'badge--neutral');
    expect(within(statusLine()).queryByText(ON_LABEL)).not.toBeInTheDocument();
  });

  it('notes that the student only receives what the trainer sends, with the name it was given', () => {
    renderStatus(AUTO_OFF);

    expect(within(statusLine()).getByText(OFF_NOTE)).toBeInTheDocument();
  });

  it('opens the note with "O aluno" for a student without a name', () => {
    renderStatus(AUTO_OFF, 'O aluno');

    expect(within(statusLine()).getByText('O aluno só recebe o que você enviar.')).toBeInTheDocument();
  });

  it('names no next send, even if the service sent one', () => {
    renderStatus({ enabled: false, next: NEXT_D30 });

    expect(statusLine()).not.toHaveTextContent('Próximo');
    expect(statusLine()).not.toHaveTextContent('30 dias');
  });

  it('links to the settings page as "Ativar envio automático"', async () => {
    const user = userEvent.setup();
    renderStatus(AUTO_OFF);

    const link = within(statusLine()).getByRole('link', ENABLE_LINK);
    expect(link).toHaveAttribute('href', SETTINGS_PATH);
    expect(within(statusLine()).queryByRole('link', CONFIGURE_LINK)).not.toBeInTheDocument();
    await user.click(link);

    expect(screen.getByText('Settings Page')).toBeInTheDocument();
  });
});

describe('AutoSendStatus: history answered without autoSend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows no status line when the service sends no autoSend', async () => {
    await renderHistory(undefined);

    expect(screen.queryByRole('region', { name: 'Envio automático' })).not.toBeInTheDocument();
    expect(screen.queryByText(ON_LABEL)).not.toBeInTheDocument();
    expect(screen.queryByText(OFF_LABEL)).not.toBeInTheDocument();
  });

  it('shows no status line when the service sends autoSend as null', async () => {
    await renderHistory(null);

    expect(screen.queryByRole('region', { name: 'Envio automático' })).not.toBeInTheDocument();
  });

  it('shows the status line when the service sends autoSend', async () => {
    await renderHistory(AUTO_OFF);

    expect(within(statusLine()).getByText(OFF_LABEL)).toBeInTheDocument();
  });
});
