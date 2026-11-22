import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { render, screen, within } from '../../test/test-utils';

vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const showToast = vi.fn();
vi.mock('../../contexts/ToastContext', () => ({
  ToastProvider: ({ children }) => children,
  useToast: () => ({ showToast }),
}));

import api from '../../api/axios';
import StudentFeedbackTemplateBuilder from './StudentFeedbackTemplateBuilder';

const TEMPLATES_URL = '/trainer/student-feedbacks/templates';
const SETTINGS_PATH = '/trainer/student-feedbacks/settings';

const NAME_FIELD = { name: 'Nome do modelo' };
const USE_IN_SENDS = { name: 'Usar este modelo nos envios' };

const QUESTION = {
  id: 'q-1',
  order: 1,
  text: 'Como foi sua adesão ao treino?',
  helpText: null,
  type: 'score',
  typeLabel: 'Nota',
  pillar: 'training_adherence',
  pillarLabel: 'Adesão (treino)',
  required: true,
  condition: null,
  invertScore: false,
  minLabel: 'Não treinei',
  maxLabel: 'Treinei tudo',
};

const UNUSED = { id: 'tpl-5', name: 'Check rápido', isGeneral: false, version: 1, hasRequests: false, milestones: [], questions: [QUESTION] };
const USED = { id: 'tpl-2', name: 'Avaliação mensal', isGeneral: false, version: 2, hasRequests: true, milestones: ['D30'], questions: [QUESTION] };
const GENERAL = { id: 'tpl-general', name: 'Padrão TeuFit', isGeneral: true, version: 1, hasRequests: true, milestones: ['D7'], questions: [QUESTION] };
const GENERAL_UNUSED = { ...GENERAL, id: 'tpl-general-unused', milestones: [] };
const THIRD_VERSION = { ...USED, id: 'tpl-3', version: 3, hasRequests: false };
const TEMPLATES = [UNUSED, USED, GENERAL, GENERAL_UNUSED, THIRD_VERSION];
const NOT_IN_USE = 'Nenhum envio usa este modelo.';
const VERSION_TAG = /^v\d+$/i;
const VERSION_WORD = /vers[aã]o/i;

// Answers each template by its URL; any other GET fails, as in the builder tests
const mockApi = () => {
  api.get.mockImplementation((url) => {
    const template = TEMPLATES.find((item) => `${TEMPLATES_URL}/${item.id}` === url);
    if (template) return Promise.resolve({ data: { template } });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
};

// Shows the current path so a test can tell where the page navigated to
const CurrentPath = () => <p>{`rota: ${useLocation().pathname}`}</p>;

// Renders the builder of the given template with markers for the settings and the template list
const renderPage = (id) =>
  render(
    <MemoryRouter initialEntries={[`${TEMPLATES_URL}/${id}`]}>
      <CurrentPath />
      <Routes>
        <Route path="/trainer/student-feedbacks/templates/:id" element={<StudentFeedbackTemplateBuilder />} />
        <Route path="/trainer/student-feedbacks/templates" element={<div>Templates Page</div>} />
        <Route path="/trainer/student-feedbacks/settings" element={<div>Settings Page</div>} />
      </Routes>
    </MemoryRouter>,
  );

// Replaces the value of a text field
const retype = async (user, field, value) => {
  await user.clear(field);
  await user.type(field, value);
};

describe('StudentFeedbackTemplateBuilder: "Usar este modelo nos envios"', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi();
  });

  it('offers "Usar este modelo nos envios" on an own template no milestone uses', async () => {
    renderPage('tpl-5');
    await screen.findByRole('textbox', NAME_FIELD);

    expect(screen.getByRole('button', USE_IN_SENDS)).toBeEnabled();
    expect(screen.getByText(`rota: ${TEMPLATES_URL}/tpl-5`)).toBeInTheDocument();
  });

  it('opens the settings page at once when nothing changed', async () => {
    const user = userEvent.setup();
    renderPage('tpl-5');
    await screen.findByRole('textbox', NAME_FIELD);

    await user.click(screen.getByRole('button', USE_IN_SENDS));

    expect(await screen.findByText('Settings Page')).toBeInTheDocument();
    expect(screen.getByText(`rota: ${SETTINGS_PATH}`)).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(api.put).not.toHaveBeenCalled();
  });

  it('asks to discard unsaved changes first and stays on the builder when cancelled', async () => {
    const user = userEvent.setup();
    renderPage('tpl-5');
    await retype(user, await screen.findByRole('textbox', NAME_FIELD), 'Check semanal');

    await user.click(screen.getByRole('button', USE_IN_SENDS));
    expect(screen.getByRole('alertdialog')).toHaveAccessibleName('Há mudanças não salvas. Descartar e sair?');
    expect(screen.queryByText('Settings Page')).not.toBeInTheDocument();
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', NAME_FIELD)).toHaveValue('Check semanal');
    expect(screen.getByText(`rota: ${TEMPLATES_URL}/tpl-5`)).toBeInTheDocument();
    expect(screen.queryByText('Settings Page')).not.toBeInTheDocument();
  });

  it('opens the settings page once the trainer confirms discarding the unsaved changes, without saving', async () => {
    const user = userEvent.setup();
    renderPage('tpl-5');
    await retype(user, await screen.findByRole('textbox', NAME_FIELD), 'Check semanal');

    await user.click(screen.getByRole('button', USE_IN_SENDS));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Descartar' }));

    expect(await screen.findByText('Settings Page')).toBeInTheDocument();
    expect(screen.getByText(`rota: ${SETTINGS_PATH}`)).toBeInTheDocument();
    expect(api.put).not.toHaveBeenCalled();
  });

  it('does not offer it on an own template that a milestone already uses', async () => {
    renderPage('tpl-2');
    await screen.findByRole('textbox', NAME_FIELD);

    expect(screen.queryByRole('button', USE_IN_SENDS)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', USE_IN_SENDS)).not.toBeInTheDocument();
  });

  it.each([
    ['in use by a milestone', 'tpl-general'],
    ['that no milestone uses', 'tpl-general-unused'],
  ])('does not offer it on the general template %s', async (_case, id) => {
    renderPage(id);
    await screen.findByRole('button', { name: 'Duplicar' });

    expect(screen.queryByRole('button', USE_IN_SENDS)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', USE_IN_SENDS)).not.toBeInTheDocument();
  });
});

describe('StudentFeedbackTemplateBuilder: version tag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi();
  });

  it.each([
    ['tpl-2', 'v2'],
    ['tpl-3', 'v3'],
  ])('tags the template %s with "%s" next to the milestones that use it', async (id, tag) => {
    renderPage(id);
    await screen.findByRole('textbox', NAME_FIELD);

    expect(screen.getByText(tag)).toHaveClass('badge');
    expect(screen.getAllByText(VERSION_TAG)).toHaveLength(1);
    expect(screen.queryByText(VERSION_WORD)).not.toBeInTheDocument();
    expect(screen.getByText('Em uso em')).toBeInTheDocument();
    expect(screen.getByText('30 dias')).toHaveClass('badge');
  });

  it('shows no version tag on an own template still on version 1', async () => {
    renderPage('tpl-5');
    await screen.findByRole('textbox', NAME_FIELD);

    expect(screen.queryByText(VERSION_TAG)).not.toBeInTheDocument();
    expect(screen.queryByText(VERSION_WORD)).not.toBeInTheDocument();
  });

  it('shows no version tag on the general template on version 1', async () => {
    renderPage('tpl-general');
    await screen.findByRole('button', { name: 'Duplicar' });

    expect(screen.queryByText(VERSION_TAG)).not.toBeInTheDocument();
    expect(screen.queryByText(VERSION_WORD)).not.toBeInTheDocument();
    expect(screen.getByText('7 dias')).toHaveClass('badge');
  });

  it('keeps the version out of the page title, whatever the version', async () => {
    renderPage('tpl-2');
    await screen.findByRole('textbox', NAME_FIELD);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Modelo de feedback$/);
  });
});

describe('StudentFeedbackTemplateBuilder: template no milestone uses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi();
  });

  it('says "Nenhum envio usa este modelo." on an own template no milestone uses', async () => {
    renderPage('tpl-5');
    await screen.findByRole('textbox', NAME_FIELD);

    expect(screen.getByText(NOT_IN_USE)).toBeInTheDocument();
    expect(screen.queryByText('Em uso em')).not.toBeInTheDocument();
  });

  it('says it on the general template no milestone uses too', async () => {
    renderPage('tpl-general-unused');
    await screen.findByRole('button', { name: 'Duplicar' });

    expect(screen.getByText(NOT_IN_USE)).toBeInTheDocument();
  });

  it.each([
    ['an own template', 'tpl-2', NAME_FIELD, 'textbox'],
    ['the general template', 'tpl-general', { name: 'Duplicar' }, 'button'],
  ])('does not say it on %s that a milestone uses', async (_case, id, loaded, role) => {
    renderPage(id);
    await screen.findByRole(role, loaded);

    expect(screen.queryByText(NOT_IN_USE)).not.toBeInTheDocument();
    expect(screen.getByText('Em uso em')).toBeInTheDocument();
  });
});
