import { describe, it, expect, vi, beforeEach } from 'vitest';
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
const TEMPLATES_URL = '/trainer/student-feedbacks/templates';
const MILESTONE_TEMPLATES_URL = '/trainer/student-feedbacks/milestone-templates';

const LEGACY_CONFIG = { autoSendEnabled: true, d7: true, d15: true, d21: true, d30: false, recurring: false };
const CONFIG = { ...LEGACY_CONFIG, responseWindowDays: 3 };
const GENERAL = { id: 'tpl-general', name: 'Padrão TeuFit', isGeneral: true, version: 1, questionCount: 8, milestones: ['D7', 'D15', 'D21', 'RECURRING'], updatedAt: '2026-11-01T12:00:00.000Z' };
const MONTHLY = { id: 'tpl-2', name: 'Avaliação mensal', isGeneral: false, version: 2, questionCount: 5, milestones: ['D30'], updatedAt: '2026-11-10T12:00:00.000Z' };
const MILESTONE_TEMPLATES = { d7: null, d15: null, d21: null, d30: 'tpl-2', recurring: null };

const DS = { Input: 'input' };

const SAVE = { name: 'Salvar' };
const BACK = { name: 'Voltar' };
const RESPONSE_WINDOW = { name: 'Prazo para responder' };
const DAY_30_SWITCH = { name: '30 dias' };
const DAY_7_TEMPLATE = { name: /^Modelo\b.*\b7 dias$/ };
const WINDOW_OPTIONS = ['1 dia', '2 dias', '3 dias', '4 dias', '5 dias', '6 dias', '7 dias'];
const HELP_TEXT = 'Vale para os próximos envios. Feedbacks já enviados mantêm o prazo.';
const WINDOW_RULE = /^O aluno tem uma janela de resposta de /;

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

// Routes the requests of the page by URL; saving the config answers the full config with the changes applied
const mockApi = (config = CONFIG) => {
  api.get.mockImplementation((url) => {
    if (url === CONFIG_URL) return Promise.resolve({ data: config });
    if (url === TEMPLATES_URL) return Promise.resolve({ data: { templates: [GENERAL, MONTHLY] } });
    if (url === MILESTONE_TEMPLATES_URL) return Promise.resolve({ data: { milestoneTemplates: MILESTONE_TEMPLATES } });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
  api.put.mockImplementation((url, body) => {
    if (url === CONFIG_URL) return Promise.resolve({ data: { ...config, ...body } });
    if (url === MILESTONE_TEMPLATES_URL) return Promise.resolve({ data: { milestoneTemplates: { ...MILESTONE_TEMPLATES, ...body } } });
    return Promise.reject(new Error(`unexpected PUT ${url}`));
  });
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

// Waits for the page and the template selects to finish loading
const waitForPage = async () => {
  await screen.findByRole('heading', { level: 1, name: 'Feedback automático' });
  return screen.findByRole('combobox', DAY_7_TEMPLATE);
};

// The response window select
const windowSelect = () => screen.getByRole('combobox', RESPONSE_WINDOW);

// The text of the option currently chosen in the response window select
const chosenWindow = () => within(windowSelect()).getByRole('option', { selected: true }).textContent;

// The rule of the send rules that states the response window
const windowRule = () => screen.getByText(WINDOW_RULE).textContent;

// The PUT requests sent to the given URL
const putsTo = (target) => api.put.mock.calls.filter(([url]) => url === target);

describe('StudentFeedbackSettings: response window', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi();
  });

  it('shows the select "Prazo para responder" with the options from 1 to 7 days and the DS class of the template selects', async () => {
    renderPage();
    await waitForPage();

    const select = windowSelect();
    expect(select).toHaveClass(DS.Input);
    expect(select).toBeEnabled();
    const options = within(select).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(WINDOW_OPTIONS);
    expect(options.map((option) => option.value)).toEqual(['1', '2', '3', '4', '5', '6', '7']);
  });

  it('shows the saved window as the chosen option, with "Salvar" disabled', async () => {
    mockApi({ ...CONFIG, responseWindowDays: 5 });
    renderPage();
    await waitForPage();

    expect(windowSelect()).toHaveValue('5');
    expect(chosenWindow()).toBe('5 dias');
    expect(screen.getByRole('button', SAVE)).toBeDisabled();
  });

  it('shows the help text about new sends only', async () => {
    renderPage();
    await waitForPage();

    expect(screen.getByText(HELP_TEXT)).toBeInTheDocument();
  });

  it('shows 3 days, clean, when the API answers without the field, and stays clean when 3 is picked again', async () => {
    mockApi(LEGACY_CONFIG);
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    expect(windowSelect()).toHaveValue('3');
    expect(windowRule()).toBe('O aluno tem uma janela de resposta de 3 dias.');
    expect(screen.getByRole('button', SAVE)).toBeDisabled();

    await user.selectOptions(windowSelect(), '6 dias');
    expect(screen.getByRole('button', SAVE)).toBeEnabled();

    await user.selectOptions(windowSelect(), '3 dias');
    expect(screen.getByRole('button', SAVE)).toBeDisabled();
    expect(api.put).not.toHaveBeenCalled();
  });

  it('enables "Salvar" when another window is picked and disables it again when the saved one is picked back', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    await user.selectOptions(windowSelect(), '5 dias');
    expect(windowSelect()).toHaveValue('5');
    expect(screen.getByRole('button', SAVE)).toBeEnabled();

    await user.selectOptions(windowSelect(), '3 dias');
    expect(screen.getByRole('button', SAVE)).toBeDisabled();
    expect(api.put).not.toHaveBeenCalled();
  });

  it('sends only responseWindowDays, as a number, when it is the only change', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    await user.selectOptions(windowSelect(), '5 dias');
    await user.click(screen.getByRole('button', SAVE));

    await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1));
    expect(api.put).toHaveBeenCalledWith(CONFIG_URL, { responseWindowDays: 5 });
    expect(api.put.mock.calls[0][1].responseWindowDays).toBeTypeOf('number');
  });

  it('sends the window together with a switch changed in the same save, in one config request', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    await user.click(screen.getByRole('switch', DAY_30_SWITCH));
    await user.selectOptions(windowSelect(), '7 dias');
    await user.click(screen.getByRole('button', SAVE));

    await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1));
    expect(api.put).toHaveBeenCalledWith(CONFIG_URL, { d30: true, responseWindowDays: 7 });
  });

  it('confirms the save with a toast, shows the new window and takes it as the new baseline', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    await user.selectOptions(windowSelect(), '5 dias');
    await user.click(screen.getByRole('button', SAVE));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Configuração salva.', 'success'));
    await waitFor(() => expect(screen.getByRole('button', SAVE)).toBeDisabled());
    expect(windowSelect()).toHaveValue('5');
    expect(windowRule()).toBe('O aluno tem uma janela de resposta de 5 dias.');

    await user.selectOptions(windowSelect(), '3 dias');
    expect(screen.getByRole('button', SAVE)).toBeEnabled();
    await user.click(screen.getByRole('button', SAVE));

    await waitFor(() => expect(api.put).toHaveBeenLastCalledWith(CONFIG_URL, { responseWindowDays: 3 }));
  });

  it('shows the API message as a toast and keeps the picked window when saving fails', async () => {
    api.put.mockRejectedValue({ userMessage: 'Não foi possível salvar a configuração.' });
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    await user.selectOptions(windowSelect(), '5 dias');
    await user.click(screen.getByRole('button', SAVE));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Não foi possível salvar a configuração.', 'error'));
    await waitFor(() => expect(screen.getByRole('button', SAVE)).toBeEnabled());
    expect(windowSelect()).toHaveValue('5');
    expect(windowSelect()).toBeEnabled();
    expect(windowRule()).toBe('O aluno tem uma janela de resposta de 5 dias.');
    expect(showToast).not.toHaveBeenCalledWith('Configuração salva.', 'success');
  });

  it('disables the select while the config save is in flight and enables it once the save ends', async () => {
    const save = deferred();
    api.put.mockImplementation(() => save.promise);
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    await user.selectOptions(windowSelect(), '5 dias');
    await user.click(screen.getByRole('button', SAVE));
    await waitFor(() => expect(putsTo(CONFIG_URL)).toHaveLength(1));
    expect(windowSelect()).toBeDisabled();

    save.resolve({ data: { ...CONFIG, responseWindowDays: 5 } });
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Configuração salva.', 'success'));
    await waitFor(() => expect(windowSelect()).toBeEnabled());
    expect(windowSelect()).toHaveValue('5');
  });

  it('disables the select while a template save is in flight too', async () => {
    const save = deferred();
    api.put.mockImplementation(() => save.promise);
    const user = userEvent.setup();
    renderPage();
    await user.selectOptions(await waitForPage(), 'Avaliação mensal');

    await user.click(screen.getByRole('button', SAVE));
    await waitFor(() => expect(putsTo(MILESTONE_TEMPLATES_URL)).toHaveLength(1));
    expect(windowSelect()).toBeDisabled();

    save.resolve({ data: { milestoneTemplates: { ...MILESTONE_TEMPLATES, d7: 'tpl-2' } } });
    await waitFor(() => expect(windowSelect()).toBeEnabled());
    expect(putsTo(CONFIG_URL)).toHaveLength(0);
  });

  it('states the saved window in the send rules instead of the fixed 3 days', async () => {
    mockApi({ ...CONFIG, responseWindowDays: 5 });
    renderPage();
    await waitForPage();

    const rules = screen.getByRole('region', { name: 'Regras de envio' });
    expect(within(rules).getByText('O aluno tem uma janela de resposta de 5 dias.')).toBeInTheDocument();
    expect(within(rules).queryByText('O aluno tem uma janela de resposta de 3 dias.')).not.toBeInTheDocument();
    expect(within(rules).getAllByRole('listitem')).toHaveLength(4);
  });

  it('updates the rule as the trainer picks, before saving, with "1 dia" in the singular', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();
    expect(windowRule()).toBe('O aluno tem uma janela de resposta de 3 dias.');

    await user.selectOptions(windowSelect(), '7 dias');
    expect(windowRule()).toBe('O aluno tem uma janela de resposta de 7 dias.');

    await user.selectOptions(windowSelect(), '1 dia');
    expect(windowRule()).toBe('O aluno tem uma janela de resposta de 1 dia.');
    expect(api.put).not.toHaveBeenCalled();
  });

  it('asks before leaving through "Voltar" with the window changed, keeps it on cancel and leaves once confirmed', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();
    await user.selectOptions(windowSelect(), '5 dias');

    await user.click(screen.getByRole('button', BACK));
    expect(screen.getByRole('alertdialog')).toHaveAccessibleName(/mudanças não salvas/);
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Feedback automático' })).toBeInTheDocument();
    expect(windowSelect()).toHaveValue('5');

    await user.click(screen.getByRole('button', BACK));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Descartar' }));

    expect(await screen.findByText('Inbox Page')).toBeInTheDocument();
    expect(api.put).not.toHaveBeenCalled();
  });

  it('also asks when the trainer leaves through a menu link with the window changed', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();
    await user.selectOptions(windowSelect(), '2 dias');

    await user.click(screen.getByRole('link', { name: 'Menu Alunos' }));

    expect(screen.getByRole('alertdialog')).toHaveAccessibleName(/mudanças não salvas/);
    expect(screen.queryByText('Página de alunos')).not.toBeInTheDocument();
  });

  it('leaves at once through "Voltar" after the new window was saved', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();
    await user.selectOptions(windowSelect(), '5 dias');
    await user.click(screen.getByRole('button', SAVE));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Configuração salva.', 'success'));
    await waitFor(() => expect(screen.getByRole('button', SAVE)).toBeDisabled());

    await user.click(screen.getByRole('button', BACK));

    expect(await screen.findByText('Inbox Page')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
