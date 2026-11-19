import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
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
import StudentFeedbackTemplates from './StudentFeedbackTemplates';

const TEMPLATES_URL = '/trainer/student-feedbacks/templates';
const OPENING_TEXT = 'Um modelo é o conjunto de perguntas que o aluno responde. O Padrão TeuFit já vem pronto; crie o seu para mudar as perguntas.';

const DS = {
  PrimaryButton: 'btn--primary',
  Segmented: 'segmented',
  Input: 'input',
  ConfirmDialog: 'ds-dialog',
  LibraryRow: '.library-row',
};

const CREATE = { name: 'Criar modelo' };
const NAME_FIELD = { name: 'Nome do modelo' };
const STARTING_POINT = { name: 'Ponto de partida' };
const FROM_GENERAL = { name: 'Começar do Padrão TeuFit' };
const BLANK = { name: 'Em branco' };
const CONFIRM = { name: 'Criar' };
const CANCEL = { name: 'Cancelar' };

const GENERAL = { id: 'tpl-general', name: 'Padrão TeuFit', isGeneral: true, version: 1, questionCount: 8, milestones: ['D7', 'D15'], updatedAt: '2026-11-01T12:00:00.000Z' };
const MONTHLY = { id: 'tpl-2', name: 'Avaliação mensal', isGeneral: false, version: 2, questionCount: 5, milestones: ['D30', 'RECURRING'], updatedAt: '2026-11-10T12:00:00.000Z' };
const QUICK = { id: 'tpl-5', name: 'Check rápido', isGeneral: false, version: 1, questionCount: 1, milestones: [], updatedAt: '2026-11-12T12:00:00.000Z' };
const CREATED = { id: 'tpl-created', name: 'Avaliação trimestral', isGeneral: false, version: 1, hasRequests: false, milestones: [], questions: [] };
const COPY = { id: 'tpl-copy', name: 'Avaliação mensal (cópia)', isGeneral: false, version: 1, hasRequests: false, milestones: [], questions: [] };

// Routes the requests of the page by URL: the list, the create and the duplicate; anything else fails
const mockApi = () => {
  api.get.mockImplementation((url) => {
    if (url === TEMPLATES_URL) return Promise.resolve({ data: { templates: [GENERAL, MONTHLY, QUICK] } });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
  api.post.mockImplementation((url) => {
    if (url === TEMPLATES_URL) return Promise.resolve({ status: 201, data: { template: CREATED } });
    if (url.endsWith('/duplicate')) return Promise.resolve({ status: 201, data: { template: COPY } });
    return Promise.reject(new Error(`unexpected POST ${url}`));
  });
};

// Shows the current path so a test can tell where the page navigated to
const CurrentPath = () => <p>{`rota: ${useLocation().pathname}`}</p>;

// Renders the templates page with a marker for the builder
const renderPage = () =>
  render(
    <MemoryRouter initialEntries={[TEMPLATES_URL]}>
      <CurrentPath />
      <Routes>
        <Route path="/trainer/student-feedbacks/templates" element={<StudentFeedbackTemplates />} />
        <Route path="/trainer/student-feedbacks/templates/:id" element={<div>Builder Page</div>} />
      </Routes>
    </MemoryRouter>,
  );

// Waits for the list to finish loading
const waitForPage = () => screen.findByRole('button', { name: 'Abrir Padrão TeuFit' });

// The row of the template with the given name
const rowOf = (name) => screen.getByRole('button', { name: `Abrir ${name}` }).closest(DS.LibraryRow);

// Presses "Criar modelo" once the list is loaded and returns the dialog it opens
const openCreateDialog = async (user) => {
  await waitForPage();
  await user.click(screen.getByRole('button', CREATE));
  return screen.getByRole('alertdialog');
};

// The POSTs sent to the create endpoint
const createCalls = () => api.post.mock.calls.filter(([url]) => url === TEMPLATES_URL);

describe('StudentFeedbackTemplates: create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi();
  });

  describe('opening text', () => {
    it('explains what a template is above the list', async () => {
      renderPage();
      await waitForPage();

      expect(screen.getByText(OPENING_TEXT)).toBeInTheDocument();
    });
  });

  describe('"Criar modelo"', () => {
    it('is the primary button of the page and opens no dialog by itself', async () => {
      renderPage();
      await waitForPage();

      expect(screen.getByRole('button', CREATE)).toHaveClass('btn', DS.PrimaryButton);
      expect(screen.getByRole('button', CREATE)).toBeEnabled();
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(api.post).not.toHaveBeenCalled();
    });

    it('opens a dialog with an empty name field and the starting point on "Começar do Padrão TeuFit"', async () => {
      const user = userEvent.setup();
      renderPage();

      const dialog = await openCreateDialog(user);

      expect(dialog).toHaveClass(DS.ConfirmDialog);
      const name = within(dialog).getByRole('textbox', NAME_FIELD);
      expect(name).toHaveClass(DS.Input);
      expect(name).toHaveValue('');
      expect(name).toHaveAttribute('maxlength', '80');
      const startingPoint = within(dialog).getByRole('tablist', STARTING_POINT);
      expect(startingPoint).toHaveClass(DS.Segmented);
      expect(within(startingPoint).getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Começar do Padrão TeuFit', 'Em branco']);
      expect(within(startingPoint).getByRole('tab', FROM_GENERAL)).toHaveAttribute('aria-selected', 'true');
      expect(within(startingPoint).getByRole('tab', BLANK)).toHaveAttribute('aria-selected', 'false');
      expect(within(dialog).getByRole('button', CONFIRM)).toBeInTheDocument();
      expect(within(dialog).getByRole('button', CANCEL)).toBeEnabled();
      expect(api.post).not.toHaveBeenCalled();
    });

    it('keeps "Criar" disabled while the name is empty or only spaces, and enables it with a name', async () => {
      const user = userEvent.setup();
      renderPage();
      const dialog = await openCreateDialog(user);
      const name = within(dialog).getByRole('textbox', NAME_FIELD);

      expect(within(dialog).getByRole('button', CONFIRM)).toBeDisabled();
      await user.type(name, '   ');
      expect(within(dialog).getByRole('button', CONFIRM)).toBeDisabled();
      await user.type(name, 'Avaliação trimestral');
      expect(within(dialog).getByRole('button', CONFIRM)).toBeEnabled();
      await user.clear(name);
      expect(within(dialog).getByRole('button', CONFIRM)).toBeDisabled();
      expect(api.post).not.toHaveBeenCalled();
    });

    it('never types past 80 characters in the name', async () => {
      const user = userEvent.setup();
      renderPage();
      const dialog = await openCreateDialog(user);

      await user.type(within(dialog).getByRole('textbox', NAME_FIELD), 'a'.repeat(85));

      expect(within(dialog).getByRole('textbox', NAME_FIELD)).toHaveValue('a'.repeat(80));
    });

    it('creates from the general template with one POST carrying the trimmed name and its id, then opens the new template in the builder', async () => {
      const user = userEvent.setup();
      renderPage();
      const dialog = await openCreateDialog(user);

      await user.type(within(dialog).getByRole('textbox', NAME_FIELD), '  Avaliação trimestral  ');
      await user.click(within(dialog).getByRole('button', CONFIRM));

      expect(await screen.findByText(`rota: ${TEMPLATES_URL}/tpl-created`)).toBeInTheDocument();
      expect(screen.getByText('Builder Page')).toBeInTheDocument();
      expect(api.post.mock.calls).toEqual([[TEMPLATES_URL, { name: 'Avaliação trimestral', sourceTemplateId: 'tpl-general' }]]);
      expect(showToast).not.toHaveBeenCalledWith(expect.anything(), 'error');
    });

    it('creates a blank template with one POST carrying only the name when "Em branco" is chosen', async () => {
      const user = userEvent.setup();
      renderPage();
      const dialog = await openCreateDialog(user);

      await user.type(within(dialog).getByRole('textbox', NAME_FIELD), 'Check semanal');
      await user.click(within(dialog).getByRole('tab', BLANK));
      expect(within(dialog).getByRole('tab', BLANK)).toHaveAttribute('aria-selected', 'true');
      expect(within(dialog).getByRole('tab', FROM_GENERAL)).toHaveAttribute('aria-selected', 'false');
      expect(within(dialog).getByRole('textbox', NAME_FIELD)).toHaveValue('Check semanal');
      await user.click(within(dialog).getByRole('button', CONFIRM));

      expect(await screen.findByText(`rota: ${TEMPLATES_URL}/tpl-created`)).toBeInTheDocument();
      expect(api.post.mock.calls).toEqual([[TEMPLATES_URL, { name: 'Check semanal' }]]);
    });

    it('goes back to the general template as the source when the trainer switches back from "Em branco"', async () => {
      const user = userEvent.setup();
      renderPage();
      const dialog = await openCreateDialog(user);

      await user.type(within(dialog).getByRole('textbox', NAME_FIELD), 'Check semanal');
      await user.click(within(dialog).getByRole('tab', BLANK));
      await user.click(within(dialog).getByRole('tab', FROM_GENERAL));
      await user.click(within(dialog).getByRole('button', CONFIRM));

      await waitFor(() => expect(api.post.mock.calls).toEqual([[TEMPLATES_URL, { name: 'Check semanal', sourceTemplateId: 'tpl-general' }]]));
    });

    it('sends nothing and closes when cancelled, leaving the trainer on the list', async () => {
      const user = userEvent.setup();
      renderPage();
      const dialog = await openCreateDialog(user);

      await user.type(within(dialog).getByRole('textbox', NAME_FIELD), 'Avaliação trimestral');
      await user.click(within(dialog).getByRole('button', CANCEL));

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(api.post).not.toHaveBeenCalled();
      expect(showToast).not.toHaveBeenCalled();
      expect(screen.getByText(`rota: ${TEMPLATES_URL}`)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Abrir Avaliação mensal' })).toBeInTheDocument();
      expect(screen.queryByText('Builder Page')).not.toBeInTheDocument();
    });

    it('sends a single POST and locks the dialog while the create is in flight', async () => {
      let resolveCreate;
      api.post.mockImplementation(() => new Promise((resolve) => { resolveCreate = resolve; }));
      const user = userEvent.setup();
      renderPage();
      const dialog = await openCreateDialog(user);

      await user.type(within(dialog).getByRole('textbox', NAME_FIELD), 'Avaliação trimestral');
      await user.click(within(dialog).getByRole('button', CONFIRM));

      await waitFor(() => expect(within(dialog).getByRole('button', CANCEL)).toBeDisabled());
      within(dialog).getAllByRole('button').forEach((button) => expect(button).toBeDisabled());
      expect(createCalls()).toHaveLength(1);
      expect(screen.getByText(`rota: ${TEMPLATES_URL}`)).toBeInTheDocument();
      resolveCreate({ status: 201, data: { template: CREATED } });
      expect(await screen.findByText(`rota: ${TEMPLATES_URL}/tpl-created`)).toBeInTheDocument();
      expect(createCalls()).toHaveLength(1);
    });

    it('shows the API message as an error toast and keeps the dialog with the typed name when the create fails', async () => {
      api.post.mockRejectedValue({ userMessage: 'Modelo de feedback inválido.' });
      const user = userEvent.setup();
      renderPage();
      const dialog = await openCreateDialog(user);

      await user.type(within(dialog).getByRole('textbox', NAME_FIELD), 'Avaliação trimestral');
      await user.click(within(dialog).getByRole('button', CONFIRM));

      await waitFor(() => expect(showToast).toHaveBeenCalledWith('Modelo de feedback inválido.', 'error'));
      expect(showToast).toHaveBeenCalledTimes(1);
      expect(createCalls()).toHaveLength(1);
      expect(screen.getByText(`rota: ${TEMPLATES_URL}`)).toBeInTheDocument();
      expect(screen.queryByText('Builder Page')).not.toBeInTheDocument();
      const kept = screen.getByRole('alertdialog');
      expect(within(kept).getByRole('textbox', NAME_FIELD)).toHaveValue('Avaliação trimestral');
      await waitFor(() => expect(within(kept).getByRole('button', CONFIRM)).toBeEnabled());
      expect(within(kept).getByRole('button', CANCEL)).toBeEnabled();
      expect(within(kept).getByRole('tab', FROM_GENERAL)).toHaveAttribute('aria-selected', 'true');
      expect(showToast).toHaveBeenCalledTimes(1);
    });

    it('keeps "Duplicar" in the row menu working next to "Criar modelo"', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitForPage();
      expect(screen.getByRole('button', CREATE)).toHaveClass(DS.PrimaryButton);

      await user.click(screen.getByRole('button', { name: 'Opções de Avaliação mensal' }));
      await user.click(within(rowOf('Avaliação mensal')).getByRole('button', { name: 'Duplicar' }));

      expect(await screen.findByText(`rota: ${TEMPLATES_URL}/tpl-copy`)).toBeInTheDocument();
      expect(api.post.mock.calls).toEqual([[`${TEMPLATES_URL}/tpl-2/duplicate`]]);
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });
});
