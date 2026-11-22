import { describe, it, expect, vi, beforeEach } from 'vitest';
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
import StudentFeedbackSettings from './StudentFeedbackSettings';

const CONFIG_URL = '/trainer/student-feedbacks/config';
const TEMPLATES_URL = '/trainer/student-feedbacks/templates';
const MILESTONE_TEMPLATES_URL = '/trainer/student-feedbacks/milestone-templates';

const CONFIG = { autoSendEnabled: true, d7: true, d15: true, d21: true, d30: false, recurring: false };
const GENERAL = { id: 'tpl-general', name: 'Padrão TeuFit', isGeneral: true, version: 1, questionCount: 8, milestones: ['D7', 'D15', 'D21', 'RECURRING'], updatedAt: '2026-11-01T12:00:00.000Z' };
const MONTHLY = { id: 'tpl-2', name: 'Avaliação mensal', isGeneral: false, version: 2, questionCount: 5, milestones: ['D30'], updatedAt: '2026-11-10T12:00:00.000Z' };
const QUICK = { id: 'tpl-5', name: 'Check rápido', isGeneral: false, version: 1, questionCount: 1, milestones: [], updatedAt: '2026-11-12T12:00:00.000Z' };
const MILESTONE_TEMPLATES = { d7: null, d15: null, d21: null, d30: 'tpl-2', recurring: null };

const SAVE = { name: 'Salvar' };
const DAY_15_SWITCH = { name: '15 dias' };
const DAY_30_SWITCH = { name: '30 dias' };
const DAY_7_TEMPLATE = { name: /^Modelo\b.*\b7 dias$/ };
const DAY_21_TEMPLATE = { name: /^Modelo\b.*\b21 dias$/ };

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

// Routes the GETs of the page by URL and keeps every PUT in flight; answers the deferred of each endpoint
const mockApi = () => {
  const saves = { [CONFIG_URL]: deferred(), [MILESTONE_TEMPLATES_URL]: deferred() };
  api.get.mockImplementation((url) => {
    if (url === CONFIG_URL) return Promise.resolve({ data: CONFIG });
    if (url === TEMPLATES_URL) return Promise.resolve({ data: { templates: [GENERAL, MONTHLY, QUICK] } });
    if (url === MILESTONE_TEMPLATES_URL) return Promise.resolve({ data: { milestoneTemplates: MILESTONE_TEMPLATES } });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
  api.put.mockImplementation((url) => saves[url]?.promise ?? Promise.reject(new Error(`unexpected PUT ${url}`)));
  return { config: saves[CONFIG_URL], milestoneTemplates: saves[MILESTONE_TEMPLATES_URL] };
};

// Renders the settings page
const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/trainer/student-feedbacks/settings']}>
      <Routes>
        <Route path="/trainer/student-feedbacks/settings" element={<StudentFeedbackSettings />} />
      </Routes>
    </MemoryRouter>,
  );

// Waits for the page and the template selects to finish loading
const waitForPage = async () => {
  await screen.findByRole('heading', { level: 1, name: 'Feedback automático' });
  return screen.findByRole('combobox', DAY_7_TEMPLATE);
};

// The six switches followed by the five "Modelo" selects
const settingControls = () => {
  const switches = screen.getAllByRole('switch');
  const selects = screen.getAllByRole('combobox');
  expect(switches).toHaveLength(6);
  expect(selects).toHaveLength(5);
  return [...switches, ...selects];
};

// The option currently chosen in a select
const chosenOption = (select) => within(select).getByRole('option', { selected: true });

// The PUT requests sent to the given URL
const putsTo = (target) => api.put.mock.calls.filter(([url]) => url === target);

// Clicks "Salvar" and waits for the PUT to the given URL to be sent
const startSave = async (user, url) => {
  await user.click(screen.getByRole('button', SAVE));
  await waitFor(() => expect(putsTo(url)).toHaveLength(1));
};

describe('StudentFeedbackSettings: while the save is in flight', () => {
  let saves;

  beforeEach(() => {
    vi.clearAllMocks();
    saves = mockApi();
  });

  it('disables the six switches and the five selects while the config PUT is pending, and enables them once it succeeds', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();
    await user.click(screen.getByRole('switch', DAY_30_SWITCH));
    settingControls().forEach((control) => expect(control).toBeEnabled());

    await startSave(user, CONFIG_URL);
    settingControls().forEach((control) => expect(control).toBeDisabled());

    saves.config.resolve({ data: { ...CONFIG, d30: true } });
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Configuração salva.', 'success'));
    await waitFor(() => expect(screen.getByRole('switch', DAY_30_SWITCH)).toBeEnabled());
    settingControls().forEach((control) => expect(control).toBeEnabled());
    expect(screen.getByRole('switch', DAY_30_SWITCH)).toBeChecked();
  });

  it('disables the six switches and the five selects while the milestone-templates PUT is pending, and enables them once it succeeds', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.selectOptions(await waitForPage(), 'Avaliação mensal');
    settingControls().forEach((control) => expect(control).toBeEnabled());

    await startSave(user, MILESTONE_TEMPLATES_URL);
    settingControls().forEach((control) => expect(control).toBeDisabled());

    saves.milestoneTemplates.resolve({ data: { milestoneTemplates: { ...MILESTONE_TEMPLATES, d7: 'tpl-2' } } });
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Configuração salva.', 'success'));
    await waitFor(() => expect(screen.getByRole('combobox', DAY_7_TEMPLATE)).toBeEnabled());
    settingControls().forEach((control) => expect(control).toBeEnabled());
    expect(chosenOption(screen.getByRole('combobox', DAY_7_TEMPLATE))).toHaveTextContent('Avaliação mensal');
  });

  it('keeps them disabled through both PUTs when a switch and a template changed', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.selectOptions(await waitForPage(), 'Avaliação mensal');
    await user.click(screen.getByRole('switch', DAY_30_SWITCH));

    await startSave(user, CONFIG_URL);
    settingControls().forEach((control) => expect(control).toBeDisabled());

    saves.config.resolve({ data: { ...CONFIG, d30: true } });
    await waitFor(() => expect(putsTo(MILESTONE_TEMPLATES_URL)).toHaveLength(1));
    settingControls().forEach((control) => expect(control).toBeDisabled());
    expect(showToast).not.toHaveBeenCalled();

    saves.milestoneTemplates.resolve({ data: { milestoneTemplates: { ...MILESTONE_TEMPLATES, d7: 'tpl-2' } } });
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Configuração salva.', 'success'));
    await waitFor(() => expect(screen.getByRole('combobox', DAY_7_TEMPLATE)).toBeEnabled());
    settingControls().forEach((control) => expect(control).toBeEnabled());
  });

  it('enables them again, with the change kept, once the config PUT fails', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForPage();
    await user.click(screen.getByRole('switch', DAY_30_SWITCH));

    await startSave(user, CONFIG_URL);
    settingControls().forEach((control) => expect(control).toBeDisabled());

    saves.config.reject({ userMessage: 'Não foi possível salvar a configuração.' });
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Não foi possível salvar a configuração.', 'error'));
    await waitFor(() => expect(screen.getByRole('button', SAVE)).toBeEnabled());
    settingControls().forEach((control) => expect(control).toBeEnabled());
    expect(screen.getByRole('switch', DAY_30_SWITCH)).toBeChecked();
  });

  it('enables them again, with the pick kept, once the milestone-templates PUT fails', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.selectOptions(await waitForPage(), 'Avaliação mensal');

    await startSave(user, MILESTONE_TEMPLATES_URL);
    settingControls().forEach((control) => expect(control).toBeDisabled());

    saves.milestoneTemplates.reject({ userMessage: 'Modelo de feedback não encontrado.' });
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Modelo de feedback não encontrado.', 'error'));
    await waitFor(() => expect(screen.getByRole('button', SAVE)).toBeEnabled());
    settingControls().forEach((control) => expect(control).toBeEnabled());
    expect(chosenOption(screen.getByRole('combobox', DAY_7_TEMPLATE))).toHaveTextContent('Avaliação mensal');
  });

  it('takes no pick and no switch change made during the save, so nothing is left unsaved afterwards', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.selectOptions(await waitForPage(), 'Avaliação mensal');
    await startSave(user, MILESTONE_TEMPLATES_URL);

    await user.selectOptions(screen.getByRole('combobox', DAY_21_TEMPLATE), 'Check rápido');
    await user.click(screen.getByRole('switch', DAY_15_SWITCH));

    expect(chosenOption(screen.getByRole('combobox', DAY_21_TEMPLATE))).toHaveTextContent('Padrão TeuFit');
    expect(screen.getByRole('switch', DAY_15_SWITCH)).toBeChecked();

    saves.milestoneTemplates.resolve({ data: { milestoneTemplates: { ...MILESTONE_TEMPLATES, d7: 'tpl-2' } } });
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Configuração salva.', 'success'));
    await waitFor(() => expect(screen.getByRole('combobox', DAY_21_TEMPLATE)).toBeEnabled());
    expect(chosenOption(screen.getByRole('combobox', DAY_21_TEMPLATE))).toHaveTextContent('Padrão TeuFit');
    expect(screen.getByRole('button', SAVE)).toBeDisabled();
    expect(api.put).toHaveBeenCalledTimes(1);
    expect(api.put).toHaveBeenCalledWith(MILESTONE_TEMPLATES_URL, { d7: 'tpl-2' });
  });
});
