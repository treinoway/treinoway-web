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

const LEGACY_CONFIG = { autoSendEnabled: true, d7: true, d15: true, d21: true, d30: false, recurring: false };
const GENERAL = { id: 'tpl-general', name: 'Padrão TeuFit', isGeneral: true, version: 1, questionCount: 8, milestones: ['D7'], updatedAt: '2026-11-01T12:00:00.000Z' };
const MILESTONE_TEMPLATES = { d7: null, d15: null, d21: null, d30: null, recurring: null };

const SEND_TIME_RULE = 'O envio acontece às 09:00 (horário de Brasília) no dia previsto.';
const REMINDER_RULE = '1 lembrete é enviado 24h depois, se o aluno ainda não tiver respondido.';
const NO_REMINDER_RULE = 'Com prazo de 1 dia não há lembrete.';
const CHANNEL_RULE = 'O aviso chega por e-mail e aparece no início do app do aluno.';

// Routes the requests of the page by URL; saving the config answers the full config with the changes applied
const mockApi = (config) => {
  api.get.mockImplementation((url) => {
    if (url === CONFIG_URL) return Promise.resolve({ data: config });
    if (url === TEMPLATES_URL) return Promise.resolve({ data: { templates: [GENERAL] } });
    if (url === MILESTONE_TEMPLATES_URL) return Promise.resolve({ data: { milestoneTemplates: MILESTONE_TEMPLATES } });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
  api.put.mockImplementation((url, body) => {
    if (url === CONFIG_URL) return Promise.resolve({ data: { ...config, ...body } });
    return Promise.reject(new Error(`unexpected PUT ${url}`));
  });
};

// Renders the settings page saved with the given response window and waits for it to load
const renderPage = async (responseWindowDays) => {
  mockApi(responseWindowDays === undefined ? LEGACY_CONFIG : { ...LEGACY_CONFIG, responseWindowDays });
  render(
    <MemoryRouter initialEntries={['/trainer/student-feedbacks/settings']}>
      <Routes>
        <Route path="/trainer/student-feedbacks/settings" element={<StudentFeedbackSettings />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { level: 1, name: 'Feedback automático' });
  await screen.findByRole('combobox', { name: /^Modelo\b.*\b7 dias$/ });
};

// The response window select
const windowSelect = () => screen.getByRole('combobox', { name: 'Prazo para responder' });

// Texts of the send rules, in the order shown
const rules = () => within(screen.getByRole('region', { name: 'Regras de envio' })).getAllByRole('listitem').map((item) => item.textContent);

describe('StudentFeedbackSettings: reminder rule by response window', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('says there is no reminder when the saved window is 1 day, in place of the reminder rule', async () => {
    await renderPage(1);

    expect(rules()).toEqual([SEND_TIME_RULE, 'O aluno tem uma janela de resposta de 1 dia.', NO_REMINDER_RULE, CHANNEL_RULE]);
    expect(screen.queryByText(REMINDER_RULE)).not.toBeInTheDocument();
  });

  it.each([[2], [3], [7]])('keeps the reminder rule when the saved window is %i days', async (days) => {
    await renderPage(days);

    expect(rules()).toEqual([SEND_TIME_RULE, `O aluno tem uma janela de resposta de ${days} dias.`, REMINDER_RULE, CHANNEL_RULE]);
    expect(screen.queryByText(NO_REMINDER_RULE)).not.toBeInTheDocument();
  });

  it('keeps the reminder rule when the API answers without the window', async () => {
    await renderPage(undefined);

    expect(rules()).toEqual([SEND_TIME_RULE, 'O aluno tem uma janela de resposta de 3 dias.', REMINDER_RULE, CHANNEL_RULE]);
  });

  it('swaps the reminder rule for the no-reminder one as soon as 1 day is picked, before saving', async () => {
    const user = userEvent.setup();
    await renderPage(3);

    await user.selectOptions(windowSelect(), '1 dia');

    expect(screen.getByText(NO_REMINDER_RULE)).toBeInTheDocument();
    expect(screen.queryByText(REMINDER_RULE)).not.toBeInTheDocument();
    expect(api.put).not.toHaveBeenCalled();
  });

  it('brings the reminder rule back when a longer window is picked again', async () => {
    const user = userEvent.setup();
    await renderPage(1);

    await user.selectOptions(windowSelect(), '2 dias');

    expect(screen.getByText(REMINDER_RULE)).toBeInTheDocument();
    expect(screen.queryByText(NO_REMINDER_RULE)).not.toBeInTheDocument();
  });

  it('keeps the no-reminder rule after the 1-day window is saved', async () => {
    const user = userEvent.setup();
    await renderPage(3);

    await user.selectOptions(windowSelect(), '1 dia');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Configuração salva.', 'success'));
    expect(api.put).toHaveBeenCalledWith(CONFIG_URL, { responseWindowDays: 1 });
    expect(rules()).toEqual([SEND_TIME_RULE, 'O aluno tem uma janela de resposta de 1 dia.', NO_REMINDER_RULE, CHANNEL_RULE]);
  });

  it('keeps the no-reminder rule of the picked window when saving fails', async () => {
    const user = userEvent.setup();
    await renderPage(3);
    api.put.mockRejectedValue({ userMessage: 'Erro ao salvar a configuração.' });

    await user.selectOptions(windowSelect(), '1 dia');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Erro ao salvar a configuração.', 'error'));
    expect(screen.getByText(NO_REMINDER_RULE)).toBeInTheDocument();
    expect(screen.queryByText(REMINDER_RULE)).not.toBeInTheDocument();
  });
});
