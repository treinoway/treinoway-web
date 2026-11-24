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
const TEMPLATES_URL = '/trainer/student-feedbacks/templates';

const DS = { Input: 'input', ConfirmDialog: 'ds-dialog' };

const GENERAL = { id: 'tpl-general', name: 'Padrão TeuFit', isGeneral: true, version: 1, questionCount: 8, milestones: ['D7'], updatedAt: '2026-11-01T12:00:00.000Z' };
const MONTHLY = { id: 'tpl-2', name: 'Avaliação mensal', isGeneral: false, version: 2, questionCount: 5, milestones: ['D30'], updatedAt: '2026-11-10T12:00:00.000Z' };
const QUICK = { id: 'tpl-5', name: 'Check rápido', isGeneral: false, version: 1, questionCount: 1, milestones: [], updatedAt: '2026-11-12T12:00:00.000Z' };
const ADHOC_CREATED = {
  id: 'fb-9',
  milestone: 'ADHOC',
  milestoneLabel: 'Avulso',
  status: 'pending',
  statusLabel: 'Pendente',
  sentAt: '2026-11-17T12:00:00.000Z',
  expiresAt: '2026-11-20T12:00:00.000Z',
};
const ADHOC_PENDING = { ...ADHOC_CREATED, submittedAt: null, readAt: null, overallIndex: null, band: null, bandLabel: null, pillars: [], openAnswers: [] };

let history = [];

// History payload of the service for the current in-memory feedbacks
const buildHistory = () => ({
  student: { id: 'student-1', name: 'Ana Souza', avatarUrl: null },
  hasPending: history.some((feedback) => feedback.status === 'pending'),
  feedbacks: history,
});

// Routes the requests of the page by URL; an ad-hoc send adds a pending feedback to the in-memory history
const mockApi = (templates = [GENERAL, MONTHLY, QUICK]) => {
  history = [];
  api.get.mockImplementation((url) => {
    if (url === HISTORY_URL) return Promise.resolve({ data: buildHistory() });
    if (url === TEMPLATES_URL && templates) return Promise.resolve({ data: { templates } });
    return Promise.reject({ userMessage: 'Não foi possível carregar os modelos.' });
  });
  api.post.mockImplementation(() => {
    history = [...history, ADHOC_PENDING];
    return Promise.resolve({ status: 201, data: ADHOC_CREATED });
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

// Opens the ad-hoc confirmation and returns the dialog
const openAdhocDialog = async (user) => {
  await user.click(screen.getByRole('button', { name: 'Enviar feedback agora' }));
  return screen.getByRole('alertdialog');
};

// Opens the ad-hoc confirmation and waits for the template select inside it, with the own templates loaded
const openAdhocDialogWithTemplates = async (user) => {
  const dialog = await openAdhocDialog(user);
  const select = await within(dialog).findByRole('combobox', { name: 'Modelo' });
  await within(select).findByRole('option', { name: 'Avaliação mensal' });
  return { dialog, select };
};

describe('StudentFeedbackHistory — template of the ad-hoc send', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi();
  });

  it('shows a "Modelo" select inside the confirmation, which stays the same alert dialog', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    const { dialog, select } = await openAdhocDialogWithTemplates(user);

    expect(api.get).toHaveBeenCalledWith(TEMPLATES_URL);
    expect(dialog).toHaveClass(DS.ConfirmDialog);
    expect(dialog).toHaveAccessibleName(/feedback agora para Ana Souza/);
    expect(select).toHaveClass(DS.Input);
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Enviar' })).toBeInTheDocument();
  });

  it('offers the general template first, chosen by default, and then the own templates', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    const { select } = await openAdhocDialogWithTemplates(user);

    expect(within(select).getAllByRole('option').map((option) => option.textContent)).toEqual(['Padrão TeuFit', 'Avaliação mensal', 'Check rápido']);
    expect(within(select).getByRole('option', { selected: true })).toHaveTextContent('Padrão TeuFit');
  });

  it('posts with no body when the default template is kept', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    const { dialog } = await openAdhocDialogWithTemplates(user);
    await user.click(within(dialog).getByRole('button', { name: 'Enviar' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(api.post.mock.calls).toEqual([[HISTORY_URL]]);
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Feedback enviado.', 'success'));
  });

  it('posts the chosen template when the trainer picks one', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    const { dialog, select } = await openAdhocDialogWithTemplates(user);
    await user.selectOptions(select, 'Avaliação mensal');
    expect(within(select).getByRole('option', { selected: true })).toHaveTextContent('Avaliação mensal');
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Enviar' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(api.post.mock.calls).toEqual([[HISTORY_URL, { templateId: 'tpl-2' }]]);
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Feedback enviado.', 'success'));
  });

  it('sends nothing when the trainer picks a template and cancels, and starts from the default again', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    const first = await openAdhocDialogWithTemplates(user);
    await user.selectOptions(first.select, 'Check rápido');
    await user.click(within(first.dialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();

    const second = await openAdhocDialogWithTemplates(user);
    expect(within(second.select).getByRole('option', { selected: true })).toHaveTextContent('Padrão TeuFit');
    await user.click(within(second.dialog).getByRole('button', { name: 'Enviar' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(api.post.mock.calls).toEqual([[HISTORY_URL]]);
  });

  it('shows the API message when the service refuses the chosen template', async () => {
    api.post.mockRejectedValue({ userMessage: 'Modelo de feedback não encontrado.' });
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    const { dialog, select } = await openAdhocDialogWithTemplates(user);
    await user.selectOptions(select, 'Check rápido');
    await user.click(within(dialog).getByRole('button', { name: 'Enviar' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith(HISTORY_URL, { templateId: 'tpl-5' }));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Modelo de feedback não encontrado.', 'error'));
    expect(showToast).not.toHaveBeenCalledWith('Feedback enviado.', 'success');
  });

  it('still sends with the default template, with no body and no error toast, when the templates fail to load', async () => {
    mockApi(null);
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    const dialog = await openAdhocDialog(user);
    await waitFor(() => expect(api.get).toHaveBeenCalledWith(TEMPLATES_URL));
    expect(dialog).toHaveClass(DS.ConfirmDialog);
    await user.click(within(dialog).getByRole('button', { name: 'Enviar' }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(api.post.mock.calls).toEqual([[HISTORY_URL]]);
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Feedback enviado.', 'success'));
    expect(showToast).not.toHaveBeenCalledWith(expect.any(String), 'error');
  });
});
