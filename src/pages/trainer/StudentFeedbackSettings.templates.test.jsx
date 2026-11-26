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

const CONFIG = { autoSendEnabled: true, d7: true, d15: true, d21: true, d30: false, recurring: false };
const GENERAL = { id: 'tpl-general', name: 'Padrão TeuFit', isGeneral: true, version: 1, questionCount: 8, milestones: ['D7', 'D15', 'D21', 'RECURRING'], updatedAt: '2026-11-01T12:00:00.000Z' };
const MONTHLY = { id: 'tpl-2', name: 'Avaliação mensal', isGeneral: false, version: 2, questionCount: 5, milestones: ['D30'], updatedAt: '2026-11-10T12:00:00.000Z' };
const QUICK = { id: 'tpl-5', name: 'Check rápido', isGeneral: false, version: 1, questionCount: 1, milestones: [], updatedAt: '2026-11-12T12:00:00.000Z' };
const MILESTONE_TEMPLATES = { d7: null, d15: null, d21: null, d30: 'tpl-2', recurring: null };

const DS = { Input: 'input', Toggle: 'toggle' };

const SAVE = { name: 'Salvar' };
const DAY_30_SWITCH = { name: '30 dias' };
const DAY_7_TEMPLATE = { name: /^Modelo\b.*\b7 dias$/ };
const DAY_15_TEMPLATE = { name: /^Modelo\b.*\b15 dias$/ };
const DAY_21_TEMPLATE = { name: /^Modelo\b.*\b21 dias$/ };
const DAY_30_TEMPLATE = { name: /^Modelo\b(?!.*A cada).*\b30 dias$/ };
const RECURRING_TEMPLATE = { name: /^Modelo\b.*A cada 30 dias$/ };
const ANY_TEMPLATE = { name: /^Modelo\b/ };

let milestoneTemplates = {};

// Routes the requests of the page by URL; each save answers the full resource with the changes applied
const mockApi = () => {
  milestoneTemplates = { ...MILESTONE_TEMPLATES };
  api.get.mockImplementation((url) => {
    if (url === CONFIG_URL) return Promise.resolve({ data: CONFIG });
    if (url === TEMPLATES_URL) return Promise.resolve({ data: { templates: [GENERAL, MONTHLY, QUICK] } });
    if (url === MILESTONE_TEMPLATES_URL) return Promise.resolve({ data: { milestoneTemplates } });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
  api.put.mockImplementation((url, body) => {
    if (url === CONFIG_URL) return Promise.resolve({ data: { ...CONFIG, ...body } });
    if (url === MILESTONE_TEMPLATES_URL) {
      milestoneTemplates = { ...milestoneTemplates, ...body };
      return Promise.resolve({ data: { milestoneTemplates } });
    }
    return Promise.reject(new Error(`unexpected PUT ${url}`));
  });
};

// Makes the config load while the given GETs fail
const mockFailingGets = (failingUrls) => {
  api.get.mockImplementation((url) => {
    if (failingUrls.includes(url)) return Promise.reject({ userMessage: 'Não foi possível carregar os modelos.' });
    if (url === CONFIG_URL) return Promise.resolve({ data: CONFIG });
    if (url === TEMPLATES_URL) return Promise.resolve({ data: { templates: [GENERAL, MONTHLY, QUICK] } });
    if (url === MILESTONE_TEMPLATES_URL) return Promise.resolve({ data: { milestoneTemplates } });
    return Promise.reject(new Error(`unexpected GET ${url}`));
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

// The option currently chosen in a select
const chosenOption = (select) => within(select).getByRole('option', { selected: true });

// The PUT requests sent to the given URL
const putsTo = (target) => api.put.mock.calls.filter(([url]) => url === target);

describe('StudentFeedbackSettings — template per milestone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi();
  });

  it('loads the templates and the template of each milestone besides the config', async () => {
    renderPage();
    await waitForPage();

    expect(api.get).toHaveBeenCalledWith(CONFIG_URL);
    expect(api.get).toHaveBeenCalledWith(TEMPLATES_URL);
    expect(api.get).toHaveBeenCalledWith(MILESTONE_TEMPLATES_URL);
  });

  it('shows one "Modelo" select per milestone, next to the six switches', async () => {
    renderPage();
    await waitForPage();

    const selects = [DAY_7_TEMPLATE, DAY_15_TEMPLATE, DAY_21_TEMPLATE, DAY_30_TEMPLATE, RECURRING_TEMPLATE].map((query) => screen.getByRole('combobox', query));
    selects.forEach((select) => expect(select).toHaveClass(DS.Input));
    expect(screen.getAllByRole('combobox', ANY_TEMPLATE)).toHaveLength(5);
    expect(screen.getAllByRole('switch')).toHaveLength(6);
    screen.getAllByRole('switch').forEach((control) => expect(control).toHaveClass(DS.Toggle));
  });

  it('offers the general template and the own templates in each select', async () => {
    renderPage();
    const select = await waitForPage();

    const options = within(select).getAllByRole('option').map((option) => option.textContent);
    expect(options).toEqual(['Padrão TeuFit', 'Avaliação mensal', 'Check rápido']);
  });

  it('shows the saved template of each milestone, the general one where none was chosen', async () => {
    renderPage();
    await waitForPage();

    expect(chosenOption(screen.getByRole('combobox', DAY_7_TEMPLATE))).toHaveTextContent('Padrão TeuFit');
    expect(chosenOption(screen.getByRole('combobox', DAY_15_TEMPLATE))).toHaveTextContent('Padrão TeuFit');
    expect(chosenOption(screen.getByRole('combobox', DAY_21_TEMPLATE))).toHaveTextContent('Padrão TeuFit');
    expect(chosenOption(screen.getByRole('combobox', DAY_30_TEMPLATE))).toHaveTextContent('Avaliação mensal');
    expect(chosenOption(screen.getByRole('combobox', RECURRING_TEMPLATE))).toHaveTextContent('Padrão TeuFit');
    expect(screen.getByRole('button', SAVE)).toBeDisabled();
  });

  it('enables "Salvar" when a template is picked and disables it again when the pick is undone', async () => {
    const user = userEvent.setup();
    renderPage();
    const daySeven = await waitForPage();
    expect(screen.getByRole('button', SAVE)).toBeDisabled();

    await user.selectOptions(daySeven, 'Avaliação mensal');
    expect(chosenOption(screen.getByRole('combobox', DAY_7_TEMPLATE))).toHaveTextContent('Avaliação mensal');
    expect(screen.getByRole('button', SAVE)).toBeEnabled();

    await user.selectOptions(screen.getByRole('combobox', DAY_7_TEMPLATE), 'Padrão TeuFit');
    expect(screen.getByRole('button', SAVE)).toBeDisabled();
    expect(api.put).not.toHaveBeenCalled();
  });

  it('sends only the changed milestone to the milestone-templates endpoint and no config PUT', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    await user.selectOptions(screen.getByRole('combobox', DAY_30_TEMPLATE), 'Check rápido');
    await user.click(screen.getByRole('button', SAVE));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith(MILESTONE_TEMPLATES_URL, { d30: 'tpl-5' }));
    expect(api.put).toHaveBeenCalledTimes(1);
    expect(putsTo(CONFIG_URL)).toEqual([]);
  });

  it('sends every changed milestone in one PUT, leaving out one picked and put back', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    await user.selectOptions(screen.getByRole('combobox', DAY_7_TEMPLATE), 'Avaliação mensal');
    await user.selectOptions(screen.getByRole('combobox', RECURRING_TEMPLATE), 'Check rápido');
    await user.selectOptions(screen.getByRole('combobox', DAY_15_TEMPLATE), 'Check rápido');
    await user.selectOptions(screen.getByRole('combobox', DAY_15_TEMPLATE), 'Padrão TeuFit');
    await user.click(screen.getByRole('button', SAVE));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith(MILESTONE_TEMPLATES_URL, { d7: 'tpl-2', recurring: 'tpl-5' }));
    expect(api.put).toHaveBeenCalledTimes(1);
  });

  it('sends null for a milestone put back on the general template', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    await user.selectOptions(screen.getByRole('combobox', DAY_30_TEMPLATE), 'Padrão TeuFit');
    await user.click(screen.getByRole('button', SAVE));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith(MILESTONE_TEMPLATES_URL, { d30: null }));
    expect(api.put).toHaveBeenCalledTimes(1);
  });

  it('sends only the config PUT when only a switch changed', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    await user.click(screen.getByRole('switch', DAY_30_SWITCH));
    await user.click(screen.getByRole('button', SAVE));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith(CONFIG_URL, { d30: true }));
    expect(api.put).toHaveBeenCalledTimes(1);
    expect(putsTo(MILESTONE_TEMPLATES_URL)).toEqual([]);
  });

  it('sends one PUT to each endpoint, each with its own changes, when a switch and a template changed', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    await user.click(screen.getByRole('switch', DAY_30_SWITCH));
    await user.selectOptions(screen.getByRole('combobox', DAY_7_TEMPLATE), 'Avaliação mensal');
    await user.click(screen.getByRole('button', SAVE));

    await waitFor(() => expect(api.put).toHaveBeenCalledTimes(2));
    expect(putsTo(CONFIG_URL)).toEqual([[CONFIG_URL, { d30: true }]]);
    expect(putsTo(MILESTONE_TEMPLATES_URL)).toEqual([[MILESTONE_TEMPLATES_URL, { d7: 'tpl-2' }]]);
  });

  it('confirms the save with a toast and takes the saved templates as the new baseline', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    await user.selectOptions(screen.getByRole('combobox', DAY_7_TEMPLATE), 'Avaliação mensal');
    await user.click(screen.getByRole('button', SAVE));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Configuração salva.', 'success'));
    await waitFor(() => expect(screen.getByRole('button', SAVE)).toBeDisabled());
    expect(chosenOption(screen.getByRole('combobox', DAY_7_TEMPLATE))).toHaveTextContent('Avaliação mensal');

    await user.selectOptions(screen.getByRole('combobox', DAY_21_TEMPLATE), 'Check rápido');
    await user.click(screen.getByRole('button', SAVE));

    await waitFor(() => expect(api.put).toHaveBeenLastCalledWith(MILESTONE_TEMPLATES_URL, { d21: 'tpl-5' }));
    expect(api.put).toHaveBeenCalledTimes(2);
  });

  it('shows the API message as a toast and keeps the pick when saving the templates fails', async () => {
    api.put.mockRejectedValue({ userMessage: 'Modelo de feedback não encontrado.' });
    const user = userEvent.setup();
    renderPage();
    await waitForPage();

    await user.selectOptions(screen.getByRole('combobox', DAY_7_TEMPLATE), 'Avaliação mensal');
    await user.click(screen.getByRole('button', SAVE));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Modelo de feedback não encontrado.', 'error'));
    expect(showToast).not.toHaveBeenCalledWith('Configuração salva.', 'success');
    expect(chosenOption(screen.getByRole('combobox', DAY_7_TEMPLATE))).toHaveTextContent('Avaliação mensal');
    await waitFor(() => expect(screen.getByRole('button', SAVE)).toBeEnabled());
  });

  it('asks before leaving with a template pick that was not saved', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();
    await user.selectOptions(screen.getByRole('combobox', DAY_7_TEMPLATE), 'Avaliação mensal');

    await user.click(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByRole('alertdialog')).toHaveAccessibleName(/mudanças não salvas/);
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));
    expect(chosenOption(screen.getByRole('combobox', DAY_7_TEMPLATE))).toHaveTextContent('Avaliação mensal');

    await user.click(screen.getByRole('link', { name: 'Menu Alunos' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Descartar' }));

    expect(await screen.findByText('Página de alunos')).toBeInTheDocument();
    expect(api.put).not.toHaveBeenCalled();
  });

  it('shows the switches without waiting for the templates', async () => {
    api.get.mockImplementation((url) => (url === CONFIG_URL ? Promise.resolve({ data: CONFIG }) : new Promise(() => {})));
    renderPage();

    expect(await screen.findByRole('switch', { name: 'Envio automático' })).toBeInTheDocument();
    expect(screen.getAllByRole('switch')).toHaveLength(6);
    expect(screen.getByRole('button', SAVE)).toBeDisabled();
    expect(api.get).toHaveBeenCalledWith(TEMPLATES_URL);
    expect(api.get).toHaveBeenCalledWith(MILESTONE_TEMPLATES_URL);
  });

  it('renders the page with "Salvar" disabled when the templates and the milestone templates fail to load', async () => {
    mockFailingGets([TEMPLATES_URL, MILESTONE_TEMPLATES_URL]);
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByRole('switch', { name: 'Envio automático' })).toBeInTheDocument();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith(TEMPLATES_URL));
    await waitFor(() => expect(api.get).toHaveBeenCalledWith(MILESTONE_TEMPLATES_URL));
    expect(screen.getByRole('heading', { level: 1, name: 'Feedback automático' })).toBeInTheDocument();
    expect(screen.getAllByRole('switch')).toHaveLength(6);
    expect(screen.getByRole('button', SAVE)).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Voltar' }));

    expect(await screen.findByText('Inbox Page')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(api.put).not.toHaveBeenCalled();
  });

  it.each([[TEMPLATES_URL], [MILESTONE_TEMPLATES_URL]])('still saves a switch with only the config PUT when %s fails to load', async (failingUrl) => {
    mockFailingGets([failingUrl]);
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('switch', { name: 'Envio automático' });
    await waitFor(() => expect(api.get).toHaveBeenCalledWith(failingUrl));
    expect(screen.getByRole('button', SAVE)).toBeDisabled();

    await user.click(screen.getByRole('switch', DAY_30_SWITCH));
    await user.click(screen.getByRole('button', SAVE));

    await waitFor(() => expect(api.put).toHaveBeenCalledWith(CONFIG_URL, { d30: true }));
    expect(api.put).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Configuração salva.', 'success'));
  });
});
