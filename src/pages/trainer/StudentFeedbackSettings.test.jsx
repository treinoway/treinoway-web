import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
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
import StudentFeedbackSettings from './StudentFeedbackSettings';

const CONFIG_URL = '/trainer/student-feedbacks/config';
const CONFIG = { autoSendEnabled: true, d7: true, d15: true, d21: true, d30: false, recurring: false };

const DS = { Toggle: 'toggle' };

const AUTO_SEND = { name: 'Envio automático' };
const DAY_7 = { name: '7 dias' };
const DAY_15 = { name: '15 dias' };
const DAY_21 = { name: '21 dias' };
const DAY_30 = { name: '30 dias' };
const RECURRING = { name: 'A cada 30 dias' };

// Routes the requests of the page by URL; saving answers the full config with the changes applied
const mockApi = (config = CONFIG) => {
  api.get.mockImplementation((url) => {
    if (url === CONFIG_URL) return Promise.resolve({ data: config });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
  api.put.mockImplementation((url, body) => Promise.resolve({ data: { ...config, ...body } }));
};

// Renders the settings page with a menu link and markers for the inbox and the students page
const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/trainer/student-feedbacks/settings']}>
      <Link to="/trainer/students">Menu Alunos</Link>
      <Routes>
        <Route path="/trainer/student-feedbacks/settings" element={<StudentFeedbackSettings />} />
        <Route path="/trainer/student-feedbacks" element={<div>Inbox Page</div>} />
        <Route path="/trainer/students" element={<div>Página de alunos</div>} />
      </Routes>
    </MemoryRouter>,
  );

// Waits for the page to finish loading
const waitForPage = async () => {
  await screen.findByRole('heading', { level: 1, name: 'Feedback automático' });
  return screen.findByRole('switch', AUTO_SEND);
};

describe('StudentFeedbackSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi();
  });

  it('shows "Carregando..." and no switch while the config loads', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    renderPage();

    expect(screen.getByText('Carregando...')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });

  it('shows a switch for auto-send and one per milestone with the saved values', async () => {
    renderPage();
    await waitForPage();

    expect(api.get).toHaveBeenCalledWith(CONFIG_URL);
    expect(screen.getAllByRole('switch')).toHaveLength(6);
    screen.getAllByRole('switch').forEach((control) => expect(control).toHaveClass(DS.Toggle));
    expect(screen.getByRole('switch', AUTO_SEND)).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', DAY_7)).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', DAY_15)).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', DAY_21)).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', DAY_30)).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('switch', RECURRING)).toHaveAttribute('aria-checked', 'false');
  });

  it('groups the milestone switches under "Quando enviar", apart from the auto-send switch', async () => {
    renderPage();
    await waitForPage();

    const section = screen.getByRole('region', { name: 'Quando enviar' });
    expect(within(section).getByRole('heading', { level: 2, name: 'Quando enviar' })).toBeInTheDocument();
    expect(within(section).getAllByRole('switch')).toHaveLength(5);
    expect(within(section).getByRole('switch', DAY_7)).toBeInTheDocument();
    expect(within(section).getByRole('switch', RECURRING)).toBeInTheDocument();
    expect(within(section).queryByRole('switch', AUTO_SEND)).not.toBeInTheDocument();
  });

  it('shows auto-send off when the trainer never turned it on', async () => {
    mockApi({ ...CONFIG, autoSendEnabled: false });
    renderPage();
    await waitForPage();

    expect(screen.getByRole('switch', AUTO_SEND)).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('switch', AUTO_SEND)).not.toHaveClass('toggle--on');
  });

  it('keeps the primary "Salvar" disabled until something changes, and again when the change is undone', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();
    const save = screen.getByRole('button', { name: 'Salvar' });
    expect(save).toHaveClass('btn', 'btn--primary');
    expect(save).toBeDisabled();

    await user.click(screen.getByRole('switch', DAY_30));
    expect(screen.getByRole('switch', DAY_30)).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled();

    await user.click(screen.getByRole('switch', DAY_30));
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
    expect(api.put).not.toHaveBeenCalled();
  });

  it('sends only auto-send when only it was toggled', async () => {
    mockApi({ ...CONFIG, autoSendEnabled: false });
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    await user.click(screen.getByRole('switch', AUTO_SEND));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith(CONFIG_URL, { autoSendEnabled: true }));
    expect(api.put).toHaveBeenCalledTimes(1);
  });

  it('sends only the milestones that changed, leaving out one toggled back', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    await user.click(screen.getByRole('switch', DAY_21));
    await user.click(screen.getByRole('switch', RECURRING));
    await user.click(screen.getByRole('switch', DAY_7));
    await user.click(screen.getByRole('switch', DAY_7));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith(CONFIG_URL, { d21: false, recurring: true }));
    expect(api.put).toHaveBeenCalledTimes(1);
  });

  it('confirms the save with a toast and takes the saved values as the new baseline', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    await user.click(screen.getByRole('switch', DAY_30));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Configuração salva.', 'success'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled());
    expect(screen.getByRole('switch', DAY_30)).toHaveAttribute('aria-checked', 'true');

    await user.click(screen.getByRole('switch', DAY_15));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(api.put).toHaveBeenLastCalledWith(CONFIG_URL, { d15: false }));
  });

  it('shows the API message as a toast and keeps the change when saving fails', async () => {
    api.put.mockRejectedValue({ userMessage: 'Não foi possível salvar a configuração.' });
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    await user.click(screen.getByRole('switch', DAY_30));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Não foi possível salvar a configuração.', 'error'));
    expect(screen.getByRole('switch', DAY_30)).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled();
  });

  it('shows the API error with retry when the config fails to load', async () => {
    let failing = true;
    api.get.mockImplementation(() => (failing ? Promise.reject({ userMessage: 'Não foi possível carregar a configuração.' }) : Promise.resolve({ data: CONFIG })));
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('Não foi possível carregar a configuração.')).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    failing = false;
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByRole('switch', AUTO_SEND)).toBeInTheDocument();
  });

  it('asks before leaving through "Voltar" with unsaved changes and leaves once confirmed', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();
    await user.click(screen.getByRole('switch', DAY_30));

    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByRole('alertdialog')).toHaveAccessibleName(/mudanças não salvas/);
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Feedback automático' })).toBeInTheDocument();
    expect(screen.getByRole('switch', DAY_30)).toHaveAttribute('aria-checked', 'true');

    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Descartar' }));

    expect(await screen.findByText('Inbox Page')).toBeInTheDocument();
    expect(api.put).not.toHaveBeenCalled();
  });

  it('also asks when the trainer leaves through a menu link, and navigates once confirmed', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();
    await user.click(screen.getByRole('switch', DAY_30));

    await user.click(screen.getByRole('link', { name: 'Menu Alunos' }));
    expect(screen.getByRole('alertdialog')).toHaveAccessibleName(/mudanças não salvas/);
    expect(screen.queryByText('Página de alunos')).not.toBeInTheDocument();
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Feedback automático' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'Menu Alunos' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Descartar' }));

    expect(await screen.findByText('Página de alunos')).toBeInTheDocument();
  });

  it('also asks when the trainer presses the browser Back button with unsaved changes', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();
    await user.click(screen.getByRole('switch', DAY_30));

    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(await screen.findByRole('alertdialog')).toHaveAccessibleName(/mudanças não salvas/);
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('switch', DAY_30)).toHaveAttribute('aria-checked', 'true');
  });

  it('leaves at once through "Voltar" when nothing changed', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    await user.click(screen.getByRole('button', { name: 'Voltar' }));

    expect(await screen.findByText('Inbox Page')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('lets a menu link navigate at once after the changes were saved', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();
    await user.click(screen.getByRole('switch', DAY_30));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled());

    await user.click(screen.getByRole('link', { name: 'Menu Alunos' }));

    expect(await screen.findByText('Página de alunos')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
