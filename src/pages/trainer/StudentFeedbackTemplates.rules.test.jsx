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
import StudentFeedbackTemplates from './StudentFeedbackTemplates';

const TEMPLATES_URL = '/trainer/student-feedbacks/templates';

const GENERAL = { id: 'tpl-general', name: 'Padrão TeuFit', isGeneral: true, version: 1, questionCount: 8, milestones: ['D7', 'D15'], updatedAt: '2026-11-01T12:00:00.000Z' };
const MONTHLY = { id: 'tpl-2', name: 'Avaliação mensal', isGeneral: false, version: 2, questionCount: 5, milestones: ['D30', 'RECURRING'], updatedAt: '2026-11-10T12:00:00.000Z' };
const QUICK = { id: 'tpl-5', name: 'Check rápido', isGeneral: false, version: 1, questionCount: 1, milestones: [], updatedAt: '2026-11-12T12:00:00.000Z' };

let templates = [];

// Routes the requests of the page by URL; deleting removes the template and hands its milestones to the general one, as the service does
const mockApi = () => {
  templates = [GENERAL, MONTHLY, QUICK];
  api.get.mockImplementation((url) => {
    if (url === TEMPLATES_URL) return Promise.resolve({ data: { templates } });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
  api.delete.mockImplementation((url) => {
    const deleted = templates.find((template) => `${TEMPLATES_URL}/${template.id}` === url);
    templates = templates
      .filter((template) => template !== deleted)
      .map((template) => (template.isGeneral ? { ...template, milestones: [...template.milestones, ...deleted.milestones] } : template));
    return Promise.resolve({ status: 204, data: '' });
  });
};

// Renders the templates page
const renderPage = () =>
  render(
    <MemoryRouter initialEntries={[TEMPLATES_URL]}>
      <Routes>
        <Route path="/trainer/student-feedbacks/templates" element={<StudentFeedbackTemplates />} />
      </Routes>
    </MemoryRouter>,
  );

// The list item of the template with the given name
const itemOf = (name) => screen.getByRole('button', { name: `Abrir ${name}` }).closest('[role="listitem"]');

// Opens the menu of the template, asks to delete it and returns the confirmation dialog
const askToDelete = async (user, name) => {
  await screen.findByRole('button', { name: `Abrir ${name}` });
  await user.click(screen.getByRole('button', { name: `Opções de ${name}` }));
  await user.click(within(itemOf(name)).getByRole('button', { name: 'Excluir' }));
  return screen.getByRole('alertdialog');
};

describe('StudentFeedbackTemplates: rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi();
  });

  it('confirms a deletion with the "Modelo excluído." toast, once', async () => {
    const user = userEvent.setup();
    renderPage();
    const dialog = await askToDelete(user, 'Avaliação mensal');

    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Modelo excluído.', 'success'));
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Abrir Avaliação mensal' })).not.toBeInTheDocument();
  });

  it('warns in the confirmation that the milestones go back to the general template', async () => {
    const user = userEvent.setup();
    renderPage();

    const dialog = await askToDelete(user, 'Avaliação mensal');

    expect(dialog).toHaveAccessibleName('Excluir "Avaliação mensal"? Os envios que usam este modelo voltam para o Padrão TeuFit. Esta ação não pode ser desfeita.');
  });

  it('shows no toast when the deletion is cancelled', async () => {
    const user = userEvent.setup();
    renderPage();
    const dialog = await askToDelete(user, 'Avaliação mensal');

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(showToast).not.toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('shows only the error toast, never the success one, when the deletion fails', async () => {
    const user = userEvent.setup();
    api.delete.mockRejectedValue({ userMessage: 'Modelo de feedback não encontrado.' });
    renderPage();
    const dialog = await askToDelete(user, 'Avaliação mensal');

    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Modelo de feedback não encontrado.', 'error'));
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Abrir Avaliação mensal' })).toBeInTheDocument();
  });

  it('reloads the list after a deletion so the general template shows the milestones it took over', async () => {
    const user = userEvent.setup();
    renderPage();
    const dialog = await askToDelete(user, 'Avaliação mensal');
    expect(within(itemOf('Padrão TeuFit')).getByText(/em uso em 2 envios/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }));

    expect(await within(itemOf('Padrão TeuFit')).findByText(/em uso em 4 envios/)).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Carregando...')).not.toBeInTheDocument();
  });
});
