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

const DS = {
  LibraryRow: '.library-row',
  Badge: 'badge',
  RowMenu: '.row-menu',
  ConfirmDialog: 'ds-dialog',
  EmptyBlock: '.empty-block',
};

const GENERAL = { id: 'tpl-general', name: 'Padrão TeuFit', isGeneral: true, version: 1, questionCount: 8, milestones: ['D7', 'D15'], updatedAt: '2026-11-01T12:00:00.000Z' };
const MONTHLY = { id: 'tpl-2', name: 'Avaliação mensal', isGeneral: false, version: 2, questionCount: 5, milestones: ['D30', 'RECURRING'], updatedAt: '2026-11-10T12:00:00.000Z' };
const QUICK = { id: 'tpl-5', name: 'Check rápido', isGeneral: false, version: 1, questionCount: 1, milestones: [], updatedAt: '2026-11-12T12:00:00.000Z' };
const COPY = {
  id: 'tpl-new',
  name: 'Padrão TeuFit (cópia)',
  isGeneral: false,
  version: 1,
  hasRequests: false,
  milestones: [],
  questions: [],
};

let templates = [];

// Routes the requests of the page by URL; deleting removes the template from the in-memory list
const mockApi = (items = [GENERAL, MONTHLY, QUICK]) => {
  templates = [...items];
  api.get.mockImplementation((url) => {
    if (url === TEMPLATES_URL) return Promise.resolve({ data: { templates } });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
  api.post.mockImplementation(() => Promise.resolve({ status: 201, data: { template: COPY } }));
  api.delete.mockImplementation((url) => {
    templates = templates.filter((template) => `${TEMPLATES_URL}/${template.id}` !== url);
    return Promise.resolve({ status: 204, data: '' });
  });
};

// Shows the current path so a test can tell where the page navigated to
const CurrentPath = () => <p>{`rota: ${useLocation().pathname}`}</p>;

// Renders the templates page with markers for the builder and the inbox
const renderPage = () =>
  render(
    <MemoryRouter initialEntries={[TEMPLATES_URL]}>
      <CurrentPath />
      <Routes>
        <Route path="/trainer/student-feedbacks/templates" element={<StudentFeedbackTemplates />} />
        <Route path="/trainer/student-feedbacks/templates/:id" element={<div>Builder Page</div>} />
        <Route path="/trainer/student-feedbacks" element={<div>Inbox Page</div>} />
      </Routes>
    </MemoryRouter>,
  );

// Waits for the list to finish loading
const waitForPage = async () => {
  await screen.findByRole('heading', { level: 1, name: 'Modelos de feedback' });
  return screen.findByRole('button', { name: 'Abrir Padrão TeuFit' });
};

// The row of the template with the given name
const rowOf = (name) => screen.getByRole('button', { name: `Abrir ${name}` }).closest(DS.LibraryRow);

// Opens the three-dot menu of the template with the given name and returns its row
const openMenuOf = async (user, name) => {
  await user.click(screen.getByRole('button', { name: `Opções de ${name}` }));
  return rowOf(name);
};

describe('StudentFeedbackTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi();
  });

  it('shows "Carregando..." and no template while the list loads', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderPage();

    expect(screen.getByText('Carregando...')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Abrir / })).not.toBeInTheDocument();
  });

  it('lists the general template first and then the own ones, one library row each', async () => {
    const { container } = renderPage();
    await waitForPage();

    expect(api.get).toHaveBeenCalledWith(TEMPLATES_URL);
    const rows = [...container.querySelectorAll(DS.LibraryRow)];
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByRole('button', { name: 'Abrir Padrão TeuFit' })).toHaveTextContent('Padrão TeuFit');
    expect(within(rows[1]).getByRole('button', { name: 'Abrir Avaliação mensal' })).toHaveTextContent('Avaliação mensal');
    expect(within(rows[2]).getByRole('button', { name: 'Abrir Check rápido' })).toHaveTextContent('Check rápido');
  });

  it('marks only the general template with the "Geral" badge', async () => {
    renderPage();
    await waitForPage();

    expect(within(rowOf('Padrão TeuFit')).getByText('Geral')).toHaveClass(DS.Badge);
    expect(within(rowOf('Avaliação mensal')).queryByText('Geral')).not.toBeInTheDocument();
    expect(within(rowOf('Check rápido')).queryByText('Geral')).not.toBeInTheDocument();
  });

  it('shows the version as a badge only from version 2 on', async () => {
    renderPage();
    await waitForPage();

    expect(within(rowOf('Avaliação mensal')).getByText(/^(vers[aã]o 2|v2)$/i)).toHaveClass(DS.Badge);
    expect(within(rowOf('Check rápido')).queryByText(/^(vers[aã]o 1|v1)$/i)).not.toBeInTheDocument();
    expect(within(rowOf('Padrão TeuFit')).queryByText(/^(vers[aã]o 1|v1)$/i)).not.toBeInTheDocument();
  });

  it('writes the version badge as "v" and the number, with no badge on version 1', async () => {
    mockApi([GENERAL, MONTHLY, { ...QUICK, version: 3 }, { ...QUICK, id: 'tpl-6', name: 'Check novo', version: 1 }]);
    renderPage();
    await waitForPage();

    expect(within(rowOf('Avaliação mensal')).getByText('v2')).toHaveClass(DS.Badge);
    expect(within(rowOf('Check rápido')).getByText('v3')).toHaveClass(DS.Badge);
    expect(within(rowOf('Check novo')).queryByText(/^v\d+$/i)).not.toBeInTheDocument();
    expect(within(rowOf('Padrão TeuFit')).queryByText(/^v\d+$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/vers[aã]o/i)).not.toBeInTheDocument();
  });

  it('says how many milestones send each template, in the singular for one', async () => {
    mockApi([GENERAL, { ...MONTHLY, milestones: ['D30'] }, QUICK]);
    renderPage();
    await waitForPage();

    expect(within(rowOf('Padrão TeuFit')).getByText(/\bem uso em 2 envios$/)).toBeInTheDocument();
    expect(within(rowOf('Avaliação mensal')).getByText(/\bem uso em 1 envio$/)).toBeInTheDocument();
    expect(within(rowOf('Check rápido')).queryByText(/em uso em/)).not.toBeInTheDocument();
  });

  it('says "ainda não usado nos envios" on a template no milestone uses', async () => {
    renderPage();
    await waitForPage();

    expect(within(rowOf('Check rápido')).getByText(/\bainda não usado nos envios$/)).toBeInTheDocument();
    expect(within(rowOf('Padrão TeuFit')).queryByText(/ainda não usado/)).not.toBeInTheDocument();
    expect(within(rowOf('Avaliação mensal')).queryByText(/ainda não usado/)).not.toBeInTheDocument();
  });

  it('shows how many questions each template has', async () => {
    renderPage();
    await waitForPage();

    expect(within(rowOf('Padrão TeuFit')).getByText(/\b8 perguntas\b/)).toBeInTheDocument();
    expect(within(rowOf('Avaliação mensal')).getByText(/\b5 perguntas\b/)).toBeInTheDocument();
    expect(within(rowOf('Check rápido')).getByText(/\b1 pergunta\b(?!s)/)).toBeInTheDocument();
  });

  it('shows the milestones using each template as badges, and none on a template no milestone uses', async () => {
    renderPage();
    await waitForPage();

    expect(within(rowOf('Padrão TeuFit')).getByText('7 dias')).toHaveClass(DS.Badge);
    expect(within(rowOf('Padrão TeuFit')).getByText('15 dias')).toHaveClass(DS.Badge);
    expect(within(rowOf('Avaliação mensal')).getByText('30 dias')).toHaveClass(DS.Badge);
    expect(within(rowOf('Avaliação mensal')).getByText('A cada 30 dias')).toHaveClass(DS.Badge);
    expect(within(rowOf('Avaliação mensal')).queryByText('7 dias')).not.toBeInTheDocument();
    expect(within(rowOf('Check rápido')).queryByText(/^(7 dias|15 dias|21 dias|30 dias|A cada 30 dias)$/)).not.toBeInTheDocument();
  });

  it('offers "Duplicar" and "Excluir" in the row menu of an own template', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    const row = await openMenuOf(user, 'Avaliação mensal');

    expect(row.querySelector(DS.RowMenu)).not.toBeNull();
    expect(within(row).getByRole('button', { name: 'Duplicar' })).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: 'Excluir' })).toBeInTheDocument();
  });

  it('offers "Duplicar" but no "Excluir" for the general template', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    const row = await openMenuOf(user, 'Padrão TeuFit');

    expect(row.querySelector(DS.RowMenu)).not.toBeNull();
    expect(within(row).getByRole('button', { name: 'Duplicar' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument();
  });

  it('opens the builder of a template from its name', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    await user.click(screen.getByRole('button', { name: 'Abrir Avaliação mensal' }));

    expect(await screen.findByText('Builder Page')).toBeInTheDocument();
    expect(screen.getByText(`rota: ${TEMPLATES_URL}/tpl-2`)).toBeInTheDocument();
  });

  it('duplicates the general template and opens the copy in the builder', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    const row = await openMenuOf(user, 'Padrão TeuFit');
    await user.click(within(row).getByRole('button', { name: 'Duplicar' }));

    await waitFor(() => expect(api.post.mock.calls).toEqual([[`${TEMPLATES_URL}/tpl-general/duplicate`]]));
    expect(await screen.findByText(`rota: ${TEMPLATES_URL}/tpl-new`)).toBeInTheDocument();
    expect(screen.getByText('Builder Page')).toBeInTheDocument();
  });

  it('duplicates an own template and opens the copy in the builder', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    const row = await openMenuOf(user, 'Avaliação mensal');
    await user.click(within(row).getByRole('button', { name: 'Duplicar' }));

    await waitFor(() => expect(api.post.mock.calls).toEqual([[`${TEMPLATES_URL}/tpl-2/duplicate`]]));
    expect(await screen.findByText(`rota: ${TEMPLATES_URL}/tpl-new`)).toBeInTheDocument();
  });

  it('shows the API message and stays on the list when duplicating fails', async () => {
    api.post.mockRejectedValue({ userMessage: 'Não foi possível duplicar o modelo.' });
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    const row = await openMenuOf(user, 'Avaliação mensal');
    await user.click(within(row).getByRole('button', { name: 'Duplicar' }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Não foi possível duplicar o modelo.', 'error'));
    expect(screen.getByText(`rota: ${TEMPLATES_URL}`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir Avaliação mensal' })).toBeInTheDocument();
    expect(screen.queryByText('Builder Page')).not.toBeInTheDocument();
  });

  it('asks for confirmation before deleting and deletes nothing when cancelled', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    const row = await openMenuOf(user, 'Avaliação mensal');
    await user.click(within(row).getByRole('button', { name: 'Excluir' }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveClass(DS.ConfirmDialog);
    expect(dialog).toHaveAccessibleName(/Avaliação mensal/);
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(api.delete).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Abrir Avaliação mensal' })).toBeInTheDocument();
  });

  it('deletes the template once confirmed and takes its row off the list', async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    await waitForPage();

    const row = await openMenuOf(user, 'Avaliação mensal');
    await user.click(within(row).getByRole('button', { name: 'Excluir' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith(`${TEMPLATES_URL}/tpl-2`));
    expect(api.delete).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Abrir Avaliação mensal' })).not.toBeInTheDocument());
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(container.querySelectorAll(DS.LibraryRow)).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Abrir Padrão TeuFit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir Check rápido' })).toBeInTheDocument();
  });

  it('shows the API message and keeps the row when deleting fails', async () => {
    api.delete.mockRejectedValue({ userMessage: 'Modelo de feedback não encontrado.' });
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    const row = await openMenuOf(user, 'Avaliação mensal');
    await user.click(within(row).getByRole('button', { name: 'Excluir' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Modelo de feedback não encontrado.', 'error'));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Abrir Avaliação mensal' })).toBeInTheDocument();
  });

  it('still lists the general template when the trainer has no template of their own', async () => {
    mockApi([GENERAL]);
    const { container } = renderPage();
    await waitForPage();

    expect(container.querySelectorAll(DS.LibraryRow)).toHaveLength(1);
    expect(within(rowOf('Padrão TeuFit')).getByText('Geral')).toHaveClass(DS.Badge);
  });

  it('shows the API error in an empty block with retry, and the list once the retry works', async () => {
    let failing = true;
    api.get.mockImplementation(() => (failing ? Promise.reject({ userMessage: 'Não foi possível carregar os modelos.' }) : Promise.resolve({ data: { templates } })));
    const user = userEvent.setup();
    renderPage();

    const message = await screen.findByText('Não foi possível carregar os modelos.');
    expect(message.closest(DS.EmptyBlock)).not.toBeNull();
    expect(screen.queryByRole('button', { name: /^Abrir / })).not.toBeInTheDocument();
    failing = false;
    await user.click(within(message.closest(DS.EmptyBlock)).getByRole('button', { name: /^Tentar (de novo|novamente)$/ }));

    expect(await screen.findByRole('button', { name: 'Abrir Padrão TeuFit' })).toBeInTheDocument();
    expect(screen.queryByText('Não foi possível carregar os modelos.')).not.toBeInTheDocument();
  });

  it('goes back to the inbox from "Voltar"', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    await user.click(screen.getByRole('button', { name: 'Voltar' }));

    expect(await screen.findByText('Inbox Page')).toBeInTheDocument();
  });
});
