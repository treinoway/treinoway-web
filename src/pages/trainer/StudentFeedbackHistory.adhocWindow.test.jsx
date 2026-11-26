import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { act, render, screen, waitFor, within } from '../../test/test-utils';

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
const CONFIG_URL = '/trainer/student-feedbacks/config';
const TEMPLATES_URL = '/trainer/student-feedbacks/templates';

const LEGACY_CONFIG = { autoSendEnabled: true, d7: true, d15: true, d21: true, d30: true, recurring: false };
const QUESTION = 'Enviar um feedback agora para Ana Souza?';
const SEND_NOW = { name: 'Enviar feedback agora' };

let config;

// Promise settled from outside, standing for a request still in flight
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
};

// Routes the requests of the page by URL; the configuration stays in flight until the test settles it
const mockApi = () => {
  config = deferred();
  const data = { student: { id: 'student-1', name: 'Ana Souza', avatarUrl: null }, hasPending: false, feedbacks: [], autoSend: { enabled: true, next: null } };
  api.get.mockImplementation((url) => {
    if (url === HISTORY_URL) return Promise.resolve({ data });
    if (url === CONFIG_URL) return config.promise;
    if (url === TEMPLATES_URL) return Promise.resolve({ data: { templates: [] } });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
  api.post.mockResolvedValue({ data: { id: 'fb-9' } });
};

// Renders the history of student-1 and waits for its title, with the configuration still in flight
const renderPage = async () => {
  render(
    <MemoryRouter initialEntries={[HISTORY_URL]}>
      <Routes>
        <Route path="/trainer/students/:id/feedbacks" element={<StudentFeedbackHistory />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { level: 1, name: 'Feedback de Ana Souza' });
  expect(api.get).toHaveBeenCalledWith(CONFIG_URL);
};

// Renders the page and answers the configuration request with the given configuration
const renderWithConfig = async (data) => {
  await renderPage();
  await act(async () => {
    config.resolve({ data });
  });
};

// Renders the page and fails the configuration request
const renderWithFailedConfig = async () => {
  await renderPage();
  await act(async () => {
    config.reject({ userMessage: 'Erro ao carregar a configuração.' });
  });
};

// Opens the confirmation of the ad-hoc send and returns the dialog
const openConfirm = async (user) => {
  await user.click(screen.getByRole('button', SEND_NOW));
  return screen.getByRole('alertdialog');
};

// The POST requests of the ad-hoc send
const sends = () => api.post.mock.calls.filter(([url]) => url === HISTORY_URL);

describe('StudentFeedbackHistory: response window in the ad-hoc confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi();
  });

  it.each([
    [5, '5 dias'],
    [7, '7 dias'],
    [3, '3 dias'],
    [2, '2 dias'],
  ])('says the student has the configured window of %i days to answer', async (responseWindowDays, window) => {
    const user = userEvent.setup();
    await renderWithConfig({ ...LEGACY_CONFIG, responseWindowDays });

    const dialog = await openConfirm(user);

    expect(dialog).toHaveAccessibleName(`${QUESTION} O aluno tem ${window} para responder.`);
    expect(within(dialog).getByText(`${QUESTION} O aluno tem ${window} para responder.`)).toBeInTheDocument();
  });

  it('writes a window of one day in the singular', async () => {
    const user = userEvent.setup();
    await renderWithConfig({ ...LEGACY_CONFIG, responseWindowDays: 1 });

    const dialog = await openConfirm(user);

    expect(dialog).toHaveAccessibleName(`${QUESTION} O aluno tem 1 dia para responder.`);
  });

  it('says 3 days when the configuration was answered without the field', async () => {
    const user = userEvent.setup();
    await renderWithConfig(LEGACY_CONFIG);

    const dialog = await openConfirm(user);

    expect(dialog).toHaveAccessibleName(`${QUESTION} O aluno tem 3 dias para responder.`);
  });

  it('sends the feedback once confirmed, with a success toast', async () => {
    const user = userEvent.setup();
    await renderWithConfig({ ...LEGACY_CONFIG, responseWindowDays: 5 });

    const dialog = await openConfirm(user);
    await user.click(within(dialog).getByRole('button', { name: 'Enviar' }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Feedback enviado.', 'success'));
    expect(sends()).toEqual([[HISTORY_URL]]);
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('sends nothing when the confirmation is cancelled', async () => {
    const user = userEvent.setup();
    await renderWithConfig({ ...LEGACY_CONFIG, responseWindowDays: 5 });

    const dialog = await openConfirm(user);
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
  });
});

describe('StudentFeedbackHistory: ad-hoc confirmation while the configuration is loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi();
  });

  it('shows the page and enables the send without waiting for the configuration', async () => {
    await renderPage();

    expect(screen.getByRole('button', SEND_NOW)).toBeEnabled();
    expect(screen.queryByText('Carregando...')).not.toBeInTheDocument();
  });

  it('asks only the question, with no sentence about the window', async () => {
    const user = userEvent.setup();
    await renderPage();

    const dialog = await openConfirm(user);

    expect(dialog).toHaveAccessibleName(QUESTION);
    expect(dialog).not.toHaveTextContent(/para responder|dias?\b|null|undefined|NaN/);
  });

  it('still sends the feedback once confirmed', async () => {
    const user = userEvent.setup();
    await renderPage();

    const dialog = await openConfirm(user);
    await user.click(within(dialog).getByRole('button', { name: 'Enviar' }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Feedback enviado.', 'success'));
    expect(sends()).toEqual([[HISTORY_URL]]);
  });

  it('states the window in a confirmation opened after the configuration arrives', async () => {
    const user = userEvent.setup();
    await renderPage();
    const first = await openConfirm(user);
    await user.click(within(first).getByRole('button', { name: 'Cancelar' }));
    await act(async () => {
      config.resolve({ data: { ...LEGACY_CONFIG, responseWindowDays: 4 } });
    });

    const dialog = await openConfirm(user);

    expect(dialog).toHaveAccessibleName(`${QUESTION} O aluno tem 4 dias para responder.`);
  });
});

describe('StudentFeedbackHistory: ad-hoc confirmation when the configuration fails to load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi();
  });

  it('keeps the history on screen, with no error banner or toast about the configuration', async () => {
    await renderWithFailedConfig();

    expect(screen.getByRole('heading', { level: 1, name: 'Feedback de Ana Souza' })).toBeInTheDocument();
    expect(screen.getByText('Nenhum feedback enviado ainda.')).toBeInTheDocument();
    expect(screen.queryByText('Erro ao carregar a configuração.')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument();
    expect(showToast).not.toHaveBeenCalled();
    expect(screen.getByRole('button', SEND_NOW)).toBeEnabled();
  });

  it('asks only the question, without guessing a window', async () => {
    const user = userEvent.setup();
    await renderWithFailedConfig();

    const dialog = await openConfirm(user);

    expect(dialog).toHaveAccessibleName(QUESTION);
    expect(dialog).not.toHaveTextContent(/para responder|dias?\b|null|undefined|NaN/);
  });

  it('still sends the feedback once confirmed, with a success toast', async () => {
    const user = userEvent.setup();
    await renderWithFailedConfig();

    const dialog = await openConfirm(user);
    await user.click(within(dialog).getByRole('button', { name: 'Enviar' }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Feedback enviado.', 'success'));
    expect(sends()).toEqual([[HISTORY_URL]]);
    expect(showToast).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('sends nothing when the confirmation is cancelled', async () => {
    const user = userEvent.setup();
    await renderWithFailedConfig();

    const dialog = await openConfirm(user);
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('shows the API message of a refused send, not a message about the configuration', async () => {
    api.post.mockRejectedValue({ userMessage: 'O aluno já tem um feedback pendente.' });
    const user = userEvent.setup();
    await renderWithFailedConfig();

    const dialog = await openConfirm(user);
    await user.click(within(dialog).getByRole('button', { name: 'Enviar' }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('O aluno já tem um feedback pendente.', 'error'));
    expect(showToast).not.toHaveBeenCalledWith('Feedback enviado.', 'success');
  });
});
