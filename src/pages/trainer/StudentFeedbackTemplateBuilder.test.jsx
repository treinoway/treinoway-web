import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
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
import StudentFeedbackTemplateBuilder from './StudentFeedbackTemplateBuilder';

const TEMPLATES_URL = '/trainer/student-feedbacks/templates';
const SAVE_FIELDS = ['text', 'helpText', 'type', 'pillar', 'required', 'condition', 'invertScore', 'minLabel', 'maxLabel'];
const TYPE_LABELS = { score: 'Nota', stars: 'Estrelas', open: 'Aberta' };
const PILLAR_LABELS = {
  training_adherence: 'Adesão (treino)',
  diet_adherence: 'Adesão (plano alimentar)',
  evolution: 'Evolução',
  routine: 'Rotina',
  sleep: 'Sono',
  hydration: 'Hidratação',
  report: 'Relato',
  other: 'Outro',
};

const DS = {
  PageHeader: '.ds-page-header',
  PrimaryButton: 'btn--primary',
  Input: 'input',
  Chip: 'chip',
  Toggle: 'toggle',
  Badge: 'badge',
  Banner: 'ds-banner',
  ConfirmDialog: 'ds-dialog',
  ScoreScale: '.score-scale',
  StarRating: '.star-rating',
  PhoneFrame: '.phone-frame',
};

const NAME_FIELD = { name: 'Nome do modelo' };
const TEXT_FIELD = { name: 'Pergunta' };
const HELP_FIELD = { name: 'Texto de apoio (opcional)' };
const MIN_FIELD = { name: 'O que significa 0' };
const MAX_FIELD = { name: 'O que significa 10' };
const PILLAR_FIELD = { name: 'Pilar' };
const REQUIRED = { name: 'Obrigatória' };
const INVERT = { name: 'Nota alta é ruim' };
const SAVE = { name: 'Salvar' };
const ADD = { name: 'Adicionar pergunta' };
const ALWAYS = { name: 'Sempre' };
const MEAL_PLAN_ONLY = { name: 'Só se o aluno tem plano alimentar' };

// Question with the fields of the template API; overrides replace any of them
const buildQuestion = (overrides = {}) => ({
  id: 'q-1',
  order: 1,
  text: 'Como foi sua adesão ao treino?',
  helpText: 'Considere os últimos 7 dias.',
  type: 'score',
  typeLabel: 'Nota',
  pillar: 'training_adherence',
  pillarLabel: 'Adesão (treino)',
  required: true,
  condition: null,
  invertScore: false,
  minLabel: 'Não treinei',
  maxLabel: 'Treinei tudo',
  ...overrides,
});

const TRAINING = buildQuestion();
const DIET = buildQuestion({
  id: 'q-2',
  order: 2,
  text: 'Como você avalia sua alimentação?',
  helpText: null,
  type: 'stars',
  typeLabel: 'Estrelas',
  pillar: 'diet_adherence',
  pillarLabel: 'Adesão (plano alimentar)',
  condition: 'has_meal_plan',
  minLabel: null,
  maxLabel: null,
});
const REPORT = buildQuestion({
  id: 'q-3',
  order: 3,
  text: 'Quer contar mais alguma coisa?',
  helpText: null,
  type: 'open',
  typeLabel: 'Aberta',
  pillar: 'report',
  pillarLabel: 'Relato',
  required: false,
  minLabel: null,
  maxLabel: null,
});

const OWN = { id: 'tpl-2', name: 'Avaliação mensal', isGeneral: false, version: 2, hasRequests: true, milestones: ['D30'], questions: [TRAINING, DIET, REPORT] };
const GENERAL = { id: 'tpl-general', name: 'Padrão TeuFit', isGeneral: true, version: 1, hasRequests: true, milestones: ['D7'], questions: [TRAINING, DIET, REPORT] };
const COPY = { ...GENERAL, id: 'tpl-new', name: 'Padrão TeuFit (cópia)', isGeneral: false, hasRequests: false, milestones: [] };

let templatesById = {};

// Template the service answers after a save: the base with the sent name and questions
const savedTemplate = (base, body) => ({
  ...base,
  name: body.name,
  questions: body.questions.map((question, index) => ({
    ...question,
    id: `saved-${index + 1}`,
    order: index + 1,
    typeLabel: TYPE_LABELS[question.type],
    pillarLabel: PILLAR_LABELS[question.pillar],
  })),
});

// Routes the requests of the page by URL; a save answers the same template with the sent name and questions
const mockApi = (templates = [OWN, GENERAL, COPY]) => {
  templatesById = Object.fromEntries(templates.map((template) => [template.id, template]));
  api.get.mockImplementation((url) => {
    const template = templatesById[url.replace(`${TEMPLATES_URL}/`, '')];
    if (url.startsWith(`${TEMPLATES_URL}/`) && template) return Promise.resolve({ data: { template } });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
  api.put.mockImplementation((url, body) => {
    const saved = savedTemplate(templatesById[url.replace(`${TEMPLATES_URL}/`, '')], body);
    templatesById[saved.id] = saved;
    return Promise.resolve({ data: { template: saved } });
  });
  api.post.mockImplementation(() => Promise.resolve({ status: 201, data: { template: COPY } }));
};

// Makes the next save answer a new version of the template under a new id
const mockSaveCreatesVersion = () => {
  api.put.mockImplementation((url, body) => {
    const saved = { ...savedTemplate(OWN, body), id: 'tpl-3', version: 3, hasRequests: false };
    templatesById[saved.id] = saved;
    return Promise.resolve({ data: { template: saved } });
  });
};

// Shows the current path so a test can tell where the page navigated to
const CurrentPath = () => <p>{`rota: ${useLocation().pathname}`}</p>;

// Renders the builder of the given template with a menu link and markers for the list and the students page
const renderPage = (id = 'tpl-2') =>
  render(
    <MemoryRouter initialEntries={[`${TEMPLATES_URL}/${id}`]}>
      <Link to="/trainer/students">Menu Alunos</Link>
      <CurrentPath />
      <Routes>
        <Route path="/trainer/student-feedbacks/templates/:id" element={<StudentFeedbackTemplateBuilder />} />
        <Route path="/trainer/student-feedbacks/templates" element={<div>Templates Page</div>} />
        <Route path="/trainer/students" element={<div>Página de alunos</div>} />
      </Routes>
    </MemoryRouter>,
  );

// Waits for an editable template to finish loading
const waitForPage = () => screen.findByRole('textbox', NAME_FIELD);

// Rows of the question list, in the order shown
const questionRows = () => within(screen.getByRole('list', { name: 'Perguntas' })).getAllByRole('listitem');

// Selects the question with the given text from the list
const selectQuestion = (user, text) =>
  user.click(within(screen.getByRole('list', { name: 'Perguntas' })).getByRole('button', { name: (accessibleName) => accessibleName.includes(text) }));

// The preview of the selected question as the student sees it
const preview = () => screen.getAllByRole('region', { name: 'Como o aluno vê' })[0];

// Replaces the value of a text field
const retype = async (user, field, value) => {
  await user.clear(field);
  await user.type(field, value);
};

// Whether the button with the given name cannot be used: absent or disabled
const isUnavailable = (name) => screen.queryByRole('button', { name })?.disabled ?? true;

// The fields of a question that a save sends, without the empty ones, so `null`, `''` and a missing key compare equal
const sentFields = (question) => Object.fromEntries(Object.entries(question).filter(([, value]) => value !== null && value !== undefined && value !== ''));

// What a save must send for a question of the API: its editable fields only, without the empty ones
const expectedFields = (question) => sentFields(Object.fromEntries(SAVE_FIELDS.map((field) => [field, question[field]])));

// The one save the page made: its URL and body
const onlySave = () => {
  expect(api.put).toHaveBeenCalledTimes(1);
  const [url, body] = api.put.mock.calls[0];
  return { url, body };
};

describe('StudentFeedbackTemplateBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi();
  });

  describe('loading', () => {
    it('shows "Carregando..." and no question while the template loads', () => {
      api.get.mockImplementation(() => new Promise(() => {}));
      renderPage();

      expect(screen.getByText('Carregando...')).toBeInTheDocument();
      expect(screen.queryByRole('list', { name: 'Perguntas' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', SAVE)).not.toBeInTheDocument();
    });

    it('loads the template of the route and shows its name in the page header with the primary save', async () => {
      const { container } = renderPage();
      const name = await waitForPage();

      expect(api.get).toHaveBeenCalledWith(`${TEMPLATES_URL}/tpl-2`);
      expect(name).toHaveValue('Avaliação mensal');
      expect(name).toHaveClass(DS.Input);
      const header = container.querySelector(DS.PageHeader);
      expect(header).not.toBeNull();
      expect(within(header).getByRole('button', SAVE)).toHaveClass('btn', DS.PrimaryButton);
    });

    it('shows the API error with retry, and the template once the retry works', async () => {
      let failing = true;
      api.get.mockImplementation(() => (failing ? Promise.reject({ userMessage: 'Modelo de feedback não encontrado.' }) : Promise.resolve({ data: { template: OWN } })));
      const user = userEvent.setup();
      renderPage();

      expect(await screen.findByText('Modelo de feedback não encontrado.')).toBeInTheDocument();
      expect(screen.queryByRole('list', { name: 'Perguntas' })).not.toBeInTheDocument();
      failing = false;
      await user.click(screen.getByRole('button', { name: /^Tentar (de novo|novamente)$/ }));

      expect(await waitForPage()).toHaveValue('Avaliação mensal');
      expect(screen.queryByText('Modelo de feedback não encontrado.')).not.toBeInTheDocument();
    });
  });

  describe('question list', () => {
    it('lists the questions in order with their text', async () => {
      renderPage();
      await waitForPage();

      const rows = questionRows();
      expect(rows).toHaveLength(3);
      expect(within(rows[0]).getByText(TRAINING.text)).toBeInTheDocument();
      expect(within(rows[1]).getByText(DIET.text)).toBeInTheDocument();
      expect(within(rows[2]).getByText(REPORT.text)).toBeInTheDocument();
      expect(within(rows[0]).getByRole('button', { name: 'Mover pergunta 1 para baixo' })).toBeInTheDocument();
      expect(within(rows[1]).getByRole('button', { name: 'Mover pergunta 2 para cima' })).toBeInTheDocument();
      expect(within(rows[2]).getByRole('button', { name: 'Mover pergunta 3 para cima' })).toBeInTheDocument();
    });

    it('shows the answer type and the pillar of each question as badges', async () => {
      renderPage();
      await waitForPage();

      const rows = questionRows();
      expect(within(rows[0]).getByText('Nota')).toHaveClass(DS.Badge);
      expect(within(rows[0]).getByText('Adesão (treino)')).toHaveClass(DS.Badge);
      expect(within(rows[1]).getByText('Estrelas')).toHaveClass(DS.Badge);
      expect(within(rows[1]).getByText('Adesão (plano alimentar)')).toHaveClass(DS.Badge);
      expect(within(rows[2]).getByText('Aberta')).toHaveClass(DS.Badge);
      expect(within(rows[2]).getByText('Relato')).toHaveClass(DS.Badge);
    });

    it('flags an optional question and one shown only with a meal plan, and nothing else', async () => {
      renderPage();
      await waitForPage();

      const rows = questionRows();
      expect(within(rows[0]).queryByText('Opcional')).not.toBeInTheDocument();
      expect(within(rows[0]).queryByText('Só com plano alimentar')).not.toBeInTheDocument();
      expect(within(rows[1]).getByText('Só com plano alimentar')).toHaveClass(DS.Badge);
      expect(within(rows[1]).queryByText('Opcional')).not.toBeInTheDocument();
      expect(within(rows[2]).getByText('Opcional')).toHaveClass(DS.Badge);
      expect(within(rows[2]).queryByText('Só com plano alimentar')).not.toBeInTheDocument();
    });

    it('counts the questions against the limit of 15', async () => {
      renderPage();
      await waitForPage();

      expect(screen.getByText('3 de 15')).toBeInTheDocument();
      expect(screen.getByRole('button', ADD)).toBeEnabled();
    });
  });

  describe('question editor', () => {
    it('shows the fields of the selected score question with its values', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitForPage();

      await selectQuestion(user, TRAINING.text);

      expect(screen.getByRole('textbox', TEXT_FIELD)).toHaveValue(TRAINING.text);
      expect(screen.getByRole('textbox', TEXT_FIELD)).toHaveClass(DS.Input);
      expect(screen.getByRole('textbox', HELP_FIELD)).toHaveValue('Considere os últimos 7 dias.');
      expect(screen.getByRole('textbox', HELP_FIELD)).toHaveClass(DS.Input);
      expect(screen.getByRole('textbox', MIN_FIELD)).toHaveValue('Não treinei');
      expect(screen.getByRole('textbox', MIN_FIELD)).toHaveClass(DS.Input);
      expect(screen.getByRole('textbox', MAX_FIELD)).toHaveValue('Treinei tudo');
      expect(screen.getByRole('textbox', MAX_FIELD)).toHaveClass(DS.Input);
      expect(screen.getByRole('combobox', PILLAR_FIELD)).toHaveValue('training_adherence');
      expect(screen.getByRole('combobox', PILLAR_FIELD)).toHaveClass(DS.Input);
      expect(screen.getByRole('switch', REQUIRED)).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByRole('switch', REQUIRED)).toHaveClass(DS.Toggle);
      expect(screen.getByRole('switch', INVERT)).toHaveAttribute('aria-checked', 'false');
      expect(screen.getByRole('switch', INVERT)).toHaveClass(DS.Toggle);
    });

    it('offers the three answer types as chips with the current one pressed', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitForPage();

      await selectQuestion(user, TRAINING.text);

      expect(screen.getByRole('button', { name: 'Nota' })).toHaveClass(DS.Chip);
      expect(screen.getByRole('button', { name: 'Nota' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'Estrelas' })).toHaveClass(DS.Chip);
      expect(screen.getByRole('button', { name: 'Estrelas' })).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByRole('button', { name: 'Aberta' })).toHaveClass(DS.Chip);
      expect(screen.getByRole('button', { name: 'Aberta' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('offers "Sempre" and "Só se o aluno tem plano alimentar" as chips under "Quando mostrar"', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitForPage();

      await selectQuestion(user, TRAINING.text);
      const picker = within(screen.getByRole('group', { name: 'Quando mostrar' }));
      expect(picker.getByRole('button', ALWAYS)).toHaveClass(DS.Chip);
      expect(picker.getByRole('button', ALWAYS)).toHaveAttribute('aria-pressed', 'true');
      expect(picker.getByRole('button', MEAL_PLAN_ONLY)).toHaveClass(DS.Chip);
      expect(picker.getByRole('button', MEAL_PLAN_ONLY)).toHaveAttribute('aria-pressed', 'false');

      await selectQuestion(user, DIET.text);
      const dietPicker = within(screen.getByRole('group', { name: 'Quando mostrar' }));
      expect(dietPicker.getByRole('button', ALWAYS)).toHaveAttribute('aria-pressed', 'false');
      expect(dietPicker.getByRole('button', MEAL_PLAN_ONLY)).toHaveAttribute('aria-pressed', 'true');
    });

    it('shows no end labels for a stars question but keeps "Nota alta é ruim"', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitForPage();

      await selectQuestion(user, DIET.text);

      expect(screen.getByRole('textbox', TEXT_FIELD)).toHaveValue(DIET.text);
      expect(screen.getByRole('button', { name: 'Estrelas' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.queryByRole('textbox', MIN_FIELD)).not.toBeInTheDocument();
      expect(screen.queryByRole('textbox', MAX_FIELD)).not.toBeInTheDocument();
      expect(screen.getByRole('switch', INVERT)).toBeInTheDocument();
      expect(screen.getByRole('switch', REQUIRED)).toHaveAttribute('aria-checked', 'true');
    });

    it('shows neither end labels nor "Nota alta é ruim" for an open question', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitForPage();

      await selectQuestion(user, REPORT.text);

      expect(screen.getByRole('textbox', TEXT_FIELD)).toHaveValue(REPORT.text);
      expect(screen.getByRole('button', { name: 'Aberta' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.queryByRole('textbox', MIN_FIELD)).not.toBeInTheDocument();
      expect(screen.queryByRole('textbox', MAX_FIELD)).not.toBeInTheDocument();
      expect(screen.queryByRole('switch', INVERT)).not.toBeInTheDocument();
      expect(screen.getByRole('switch', REQUIRED)).toHaveAttribute('aria-checked', 'false');
      expect(screen.getByRole('combobox', PILLAR_FIELD)).toHaveValue('report');
    });

    it('updates the row and the preview while the question text is edited', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitForPage();
      await selectQuestion(user, TRAINING.text);

      await retype(user, screen.getByRole('textbox', TEXT_FIELD), 'Treinou bem?');

      expect(within(questionRows()[0]).getByText('Treinou bem?')).toBeInTheDocument();
      expect(within(preview()).getByText('Treinou bem?')).toBeInTheDocument();
      expect(screen.queryByText(TRAINING.text)).not.toBeInTheDocument();
      expect(within(questionRows()[1]).getByText(DIET.text)).toBeInTheDocument();
    });

    it('hides the end labels and "Nota alta é ruim" when the type changes to "Aberta", and shows them again for "Nota"', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitForPage();
      await selectQuestion(user, TRAINING.text);

      await user.click(screen.getByRole('button', { name: 'Aberta' }));

      expect(screen.getByRole('button', { name: 'Aberta' })).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'Nota' })).toHaveAttribute('aria-pressed', 'false');
      expect(screen.queryByRole('textbox', MIN_FIELD)).not.toBeInTheDocument();
      expect(screen.queryByRole('textbox', MAX_FIELD)).not.toBeInTheDocument();
      expect(screen.queryByRole('switch', INVERT)).not.toBeInTheDocument();
      expect(within(questionRows()[0]).getByText('Aberta')).toHaveClass(DS.Badge);
      expect(within(questionRows()[0]).queryByText('Nota')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Nota' }));

      expect(screen.getByRole('textbox', MIN_FIELD)).toBeInTheDocument();
      expect(screen.getByRole('textbox', MAX_FIELD)).toBeInTheDocument();
      expect(screen.getByRole('switch', INVERT)).toBeInTheDocument();
      expect(within(questionRows()[0]).getByText('Nota')).toHaveClass(DS.Badge);
    });

    it('shows the new pillar on the row when the pillar changes', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitForPage();
      await selectQuestion(user, TRAINING.text);

      await user.selectOptions(screen.getByRole('combobox', PILLAR_FIELD), 'sleep');

      expect(screen.getByRole('combobox', PILLAR_FIELD)).toHaveValue('sleep');
      expect(within(questionRows()[0]).getByText('Sono')).toHaveClass(DS.Badge);
      expect(within(questionRows()[0]).queryByText('Adesão (treino)')).not.toBeInTheDocument();
    });

    it('flags the row as "Opcional" when "Obrigatória" is turned off', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitForPage();
      await selectQuestion(user, TRAINING.text);

      await user.click(screen.getByRole('switch', REQUIRED));

      expect(screen.getByRole('switch', REQUIRED)).toHaveAttribute('aria-checked', 'false');
      expect(within(questionRows()[0]).getByText('Opcional')).toHaveClass(DS.Badge);
    });

    it('flags the row as "Só com plano alimentar" when that condition is chosen, and clears it with "Sempre"', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitForPage();
      await selectQuestion(user, TRAINING.text);

      await user.click(screen.getByRole('button', MEAL_PLAN_ONLY));
      expect(screen.getByRole('button', MEAL_PLAN_ONLY)).toHaveAttribute('aria-pressed', 'true');
      expect(within(questionRows()[0]).getByText('Só com plano alimentar')).toHaveClass(DS.Badge);

      await user.click(screen.getByRole('button', ALWAYS));
      expect(within(questionRows()[0]).queryByText('Só com plano alimentar')).not.toBeInTheDocument();
    });
  });

  describe('preview', () => {
    it('shows the selected question inside the phone frame with its help text', async () => {
      const user = userEvent.setup();
      const { container } = renderPage();
      await waitForPage();

      await selectQuestion(user, TRAINING.text);

      const frame = container.querySelector(DS.PhoneFrame);
      expect(frame).not.toBeNull();
      expect(within(frame).getByText(TRAINING.text)).toBeInTheDocument();
      expect(within(preview()).getByText(TRAINING.text)).toBeInTheDocument();
      expect(within(preview()).getByText('Considere os últimos 7 dias.')).toBeInTheDocument();
      expect(within(preview()).queryByText(DIET.text)).not.toBeInTheDocument();
    });

    it('shows a score question as the 0 to 10 scale with the end labels, which follow the editor', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitForPage();
      await selectQuestion(user, TRAINING.text);

      const scale = preview().querySelector(DS.ScoreScale);
      expect(scale).not.toBeNull();
      expect(within(scale).getByText('0')).toBeInTheDocument();
      expect(within(scale).getByText('10')).toBeInTheDocument();
      expect(within(scale).getByText('Não treinei')).toBeInTheDocument();
      expect(within(scale).getByText('Treinei tudo')).toBeInTheDocument();
      expect(preview().querySelector(DS.StarRating)).toBeNull();

      await retype(user, screen.getByRole('textbox', MAX_FIELD), 'Fiz tudo');

      expect(within(preview().querySelector(DS.ScoreScale)).getByText('Fiz tudo')).toBeInTheDocument();
      expect(within(preview()).queryByText('Treinei tudo')).not.toBeInTheDocument();
    });

    it('shows a stars question as the star rating', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitForPage();

      await selectQuestion(user, DIET.text);

      expect(within(preview()).getByText(DIET.text)).toBeInTheDocument();
      expect(preview().querySelector(DS.StarRating)).not.toBeNull();
      expect(preview().querySelector(DS.ScoreScale)).toBeNull();
      expect(within(preview()).queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('shows an open question as a text area', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitForPage();

      await selectQuestion(user, REPORT.text);

      expect(within(preview()).getByText(REPORT.text)).toBeInTheDocument();
      expect(within(preview()).getByRole('textbox')).toBeInTheDocument();
      expect(preview().querySelector(DS.ScoreScale)).toBeNull();
      expect(preview().querySelector(DS.StarRating)).toBeNull();
    });

    it('follows the answer type and the help text as they are edited', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitForPage();
      await selectQuestion(user, TRAINING.text);

      await user.click(screen.getByRole('button', { name: 'Estrelas' }));
      expect(preview().querySelector(DS.StarRating)).not.toBeNull();
      expect(preview().querySelector(DS.ScoreScale)).toBeNull();

      await user.click(screen.getByRole('button', { name: 'Aberta' }));
      expect(within(preview()).getByRole('textbox')).toBeInTheDocument();
      expect(preview().querySelector(DS.StarRating)).toBeNull();

      await retype(user, screen.getByRole('textbox', HELP_FIELD), 'Pense na semana.');
      expect(within(preview()).getByText('Pense na semana.')).toBeInTheDocument();
      expect(within(preview()).queryByText('Considere os últimos 7 dias.')).not.toBeInTheDocument();
    });
  });

  describe('adding, moving and removing', () => {
    it('appends a question and selects it for editing', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitForPage();
      await selectQuestion(user, TRAINING.text);

      await user.click(screen.getByRole('button', ADD));

      expect(questionRows()).toHaveLength(4);
      expect(screen.getByText('4 de 15')).toBeInTheDocument();
      expect(within(questionRows()[0]).getByText(TRAINING.text)).toBeInTheDocument();
      expect(within(questionRows()[2]).getByText(REPORT.text)).toBeInTheDocument();
      expect(screen.getByRole('textbox', TEXT_FIELD)).not.toHaveValue(TRAINING.text);

      await retype(user, screen.getByRole('textbox', TEXT_FIELD), 'Algo mais?');

      expect(within(questionRows()[3]).getByText('Algo mais?')).toBeInTheDocument();
      expect(within(preview()).getByText('Algo mais?')).toBeInTheDocument();
      expect(within(questionRows()[0]).getByText(TRAINING.text)).toBeInTheDocument();
    });

    it('disables "Adicionar pergunta" at 15 questions', async () => {
      const questions = Array.from({ length: 15 }, (_, index) => buildQuestion({ id: `q-${index + 1}`, order: index + 1, text: `Pergunta número ${index + 1}` }));
      mockApi([{ ...OWN, questions }]);
      renderPage();
      await waitForPage();

      expect(questionRows()).toHaveLength(15);
      expect(screen.getByText('15 de 15')).toBeInTheDocument();
      expect(screen.getByRole('button', ADD)).toBeDisabled();
    });

    it('disables "Adicionar pergunta" once the fifteenth question is added', async () => {
      const questions = Array.from({ length: 14 }, (_, index) => buildQuestion({ id: `q-${index + 1}`, order: index + 1, text: `Pergunta número ${index + 1}` }));
      mockApi([{ ...OWN, questions }]);
      const user = userEvent.setup();
      renderPage();
      await waitForPage();
      expect(screen.getByText('14 de 15')).toBeInTheDocument();

      await user.click(screen.getByRole('button', ADD));

      expect(screen.getByText('15 de 15')).toBeInTheDocument();
      expect(screen.getByRole('button', ADD)).toBeDisabled();
    });

    it('cannot move the first question up nor the last one down', async () => {
      renderPage();
      await waitForPage();

      expect(isUnavailable('Mover pergunta 1 para cima')).toBe(true);
      expect(isUnavailable('Mover pergunta 3 para baixo')).toBe(true);
      expect(screen.getByRole('button', { name: 'Mover pergunta 1 para baixo' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Mover pergunta 2 para cima' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Mover pergunta 2 para baixo' })).toBeEnabled();
      expect(screen.getByRole('button', { name: 'Mover pergunta 3 para cima' })).toBeEnabled();
    });

    it('moves a question down and back up with the row buttons', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitForPage();

      await user.click(screen.getByRole('button', { name: 'Mover pergunta 1 para baixo' }));

      expect(within(questionRows()[0]).getByText(DIET.text)).toBeInTheDocument();
      expect(within(questionRows()[1]).getByText(TRAINING.text)).toBeInTheDocument();
      expect(within(questionRows()[2]).getByText(REPORT.text)).toBeInTheDocument();
      expect(within(questionRows()[1]).getByRole('button', { name: 'Mover pergunta 2 para cima' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Mover pergunta 3 para cima' }));

      expect(within(questionRows()[0]).getByText(DIET.text)).toBeInTheDocument();
      expect(within(questionRows()[1]).getByText(REPORT.text)).toBeInTheDocument();
      expect(within(questionRows()[2]).getByText(TRAINING.text)).toBeInTheDocument();
      expect(screen.getByText('3 de 15')).toBeInTheDocument();
    });

    it('asks before removing a question and keeps it when cancelled', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitForPage();
      await selectQuestion(user, DIET.text);

      await user.click(screen.getByRole('button', { name: 'Remover pergunta' }));
      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toHaveClass(DS.ConfirmDialog);
      expect(dialog).toHaveAccessibleName(/pergunta/i);
      await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(questionRows()).toHaveLength(3);
      expect(within(questionRows()[1]).getByText(DIET.text)).toBeInTheDocument();
      expect(screen.getByRole('button', SAVE)).toBeDisabled();
    });

    it('removes the question once confirmed', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitForPage();
      await selectQuestion(user, DIET.text);

      await user.click(screen.getByRole('button', { name: 'Remover pergunta' }));
      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /^(Remover|Excluir)$/ }));

      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
      expect(questionRows()).toHaveLength(2);
      expect(within(questionRows()[0]).getByText(TRAINING.text)).toBeInTheDocument();
      expect(within(questionRows()[1]).getByText(REPORT.text)).toBeInTheDocument();
      expect(screen.queryByText(DIET.text)).not.toBeInTheDocument();
      expect(screen.getByText('2 de 15')).toBeInTheDocument();
      expect(screen.getByRole('button', SAVE)).toBeEnabled();
      expect(api.put).not.toHaveBeenCalled();
      expect(api.delete).not.toHaveBeenCalled();
    });
  });

  describe('saving', () => {
    it('keeps "Salvar" disabled until something changes', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitForPage();
      expect(screen.getByRole('button', SAVE)).toBeDisabled();

      await selectQuestion(user, DIET.text);
      expect(screen.getByRole('button', SAVE)).toBeDisabled();

      await user.click(screen.getByRole('switch', REQUIRED));
      expect(screen.getByRole('button', SAVE)).toBeEnabled();
      expect(api.put).not.toHaveBeenCalled();
    });

    it('enables "Salvar" after a reorder and sends one PUT with the name and every question in the new order', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitForPage();

      await user.click(screen.getByRole('button', { name: 'Mover pergunta 1 para baixo' }));
      await user.click(screen.getByRole('button', SAVE));

      await waitFor(() => expect(api.put).toHaveBeenCalled());
      const { url, body } = onlySave();
      expect(url).toBe(`${TEMPLATES_URL}/tpl-2`);
      expect(Object.keys(body).sort()).toEqual(['name', 'questions']);
      expect(body.name).toBe('Avaliação mensal');
      expect(body.questions.map(sentFields)).toEqual([expectedFields(DIET), expectedFields(TRAINING), expectedFields(REPORT)]);
    });

    it('sends the edited name and the edited fields of a question', async () => {
      const user = userEvent.setup();
      renderPage();
      await retype(user, await waitForPage(), 'Mensal 2');
      await selectQuestion(user, TRAINING.text);

      await retype(user, screen.getByRole('textbox', TEXT_FIELD), 'Treinou bem?');
      await retype(user, screen.getByRole('textbox', HELP_FIELD), 'Pense na semana.');
      await retype(user, screen.getByRole('textbox', MIN_FIELD), 'Nada');
      await retype(user, screen.getByRole('textbox', MAX_FIELD), 'Tudo');
      await user.selectOptions(screen.getByRole('combobox', PILLAR_FIELD), 'routine');
      await user.click(screen.getByRole('switch', REQUIRED));
      await user.click(screen.getByRole('switch', INVERT));
      await user.click(screen.getByRole('button', MEAL_PLAN_ONLY));
      await user.click(screen.getByRole('button', SAVE));

      await waitFor(() => expect(api.put).toHaveBeenCalled());
      const { body } = onlySave();
      expect(body.name).toBe('Mensal 2');
      expect(body.questions.map(sentFields)).toEqual([
        { text: 'Treinou bem?', helpText: 'Pense na semana.', type: 'score', pillar: 'routine', required: false, condition: 'has_meal_plan', invertScore: true, minLabel: 'Nada', maxLabel: 'Tudo' },
        expectedFields(DIET),
        expectedFields(REPORT),
      ]);
    });

    it('never sends "Nota alta é ruim" on a question changed to "Aberta"', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitForPage();
      await selectQuestion(user, TRAINING.text);

      await user.click(screen.getByRole('switch', INVERT));
      await user.click(screen.getByRole('button', { name: 'Aberta' }));
      await user.click(screen.getByRole('button', SAVE));

      await waitFor(() => expect(api.put).toHaveBeenCalled());
      const { body } = onlySave();
      expect(body.questions[0]).toEqual(expect.objectContaining({ text: TRAINING.text, type: 'open', invertScore: false }));
      expect(body.questions).toHaveLength(3);
    });

    it('sends an added question last, with only the fields a save accepts', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitForPage();

      await user.click(screen.getByRole('button', ADD));
      await retype(user, screen.getByRole('textbox', TEXT_FIELD), 'Algo mais?');
      await user.click(screen.getByRole('button', { name: 'Aberta' }));
      await user.selectOptions(screen.getByRole('combobox', PILLAR_FIELD), 'other');
      await user.click(screen.getByRole('button', SAVE));

      await waitFor(() => expect(api.put).toHaveBeenCalled());
      const { body } = onlySave();
      expect(body.questions).toHaveLength(4);
      expect(body.questions.slice(0, 3).map(sentFields)).toEqual([expectedFields(TRAINING), expectedFields(DIET), expectedFields(REPORT)]);
      const added = body.questions[3];
      expect(added).toEqual(expect.objectContaining({ text: 'Algo mais?', type: 'open', pillar: 'other', invertScore: false }));
      expect(typeof added.required).toBe('boolean');
      expect(Object.keys(added).filter((field) => !SAVE_FIELDS.includes(field))).toEqual([]);
    });

    it('leaves a removed question out of the save', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitForPage();
      await selectQuestion(user, DIET.text);

      await user.click(screen.getByRole('button', { name: 'Remover pergunta' }));
      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /^(Remover|Excluir)$/ }));
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
      await user.click(screen.getByRole('button', SAVE));

      await waitFor(() => expect(api.put).toHaveBeenCalled());
      const { body } = onlySave();
      expect(body.questions.map(sentFields)).toEqual([expectedFields(TRAINING), expectedFields(REPORT)]);
    });

    it('confirms the save with a toast, stays on the template and takes the saved state as the new baseline', async () => {
      const user = userEvent.setup();
      renderPage();
      await retype(user, await waitForPage(), 'Mensal 2');

      await user.click(screen.getByRole('button', SAVE));

      await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.any(String), 'success'));
      await waitFor(() => expect(screen.getByRole('button', SAVE)).toBeDisabled());
      expect(screen.getByRole('textbox', NAME_FIELD)).toHaveValue('Mensal 2');
      expect(questionRows()).toHaveLength(3);
      expect(screen.getByText(`rota: ${TEMPLATES_URL}/tpl-2`)).toBeInTheDocument();
      expect(api.put).toHaveBeenCalledTimes(1);
    });

    it('follows the returned id to the route of the new version without asking about unsaved changes', async () => {
      mockSaveCreatesVersion();
      const user = userEvent.setup();
      renderPage();
      await retype(user, await waitForPage(), 'Mensal 2');

      await user.click(screen.getByRole('button', SAVE));

      expect(await screen.findByText(`rota: ${TEMPLATES_URL}/tpl-3`)).toBeInTheDocument();
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(await screen.findByRole('textbox', NAME_FIELD)).toHaveValue('Mensal 2');
      await waitFor(() => expect(screen.getByRole('button', SAVE)).toBeDisabled());
      expect(api.put).toHaveBeenCalledTimes(1);
      expect(api.put.mock.calls[0][0]).toBe(`${TEMPLATES_URL}/tpl-2`);
    });

    it('shows the API message as a toast and keeps the changes when saving fails', async () => {
      api.put.mockRejectedValue({ userMessage: 'O modelo precisa ter entre 1 e 15 perguntas.' });
      const user = userEvent.setup();
      renderPage();
      await retype(user, await waitForPage(), 'Mensal 2');

      await user.click(screen.getByRole('button', SAVE));

      await waitFor(() => expect(showToast).toHaveBeenCalledWith('O modelo precisa ter entre 1 e 15 perguntas.', 'error'));
      expect(showToast).not.toHaveBeenCalledWith(expect.any(String), 'success');
      expect(screen.getByRole('textbox', NAME_FIELD)).toHaveValue('Mensal 2');
      await waitFor(() => expect(screen.getByRole('button', SAVE)).toBeEnabled());
      expect(screen.getByText(`rota: ${TEMPLATES_URL}/tpl-2`)).toBeInTheDocument();
    });
  });

  describe('version notice', () => {
    it('says that saving creates the next version when the template already has requests', async () => {
      renderPage();
      await waitForPage();

      const notice = screen.getAllByRole('note').find((note) => /As mudanças valem para os próximos envios/.test(note.textContent));
      expect(notice).toBeDefined();
      expect(notice).toHaveClass(DS.Banner);
    });

    it('shows the fixed notice text, which names no version number', async () => {
      renderPage();
      await waitForPage();

      const text = screen.getByText('Este modelo já foi enviado a alunos. As mudanças valem para os próximos envios; os feedbacks já enviados continuam com as perguntas de antes.');
      const notice = text.closest('[role="note"]');
      expect(notice).toHaveClass(DS.Banner);
      expect(notice).not.toHaveTextContent(/\d/);
      expect(notice).not.toHaveTextContent(/vers[aã]o/i);
    });

    it('says nothing about a new version when the template has no request yet', async () => {
      mockApi([{ ...OWN, hasRequests: false }]);
      renderPage();
      await waitForPage();

      expect(screen.getByRole('button', SAVE)).toBeInTheDocument();
      expect(screen.queryByText(/As mudanças valem para os próximos envios/)).not.toBeInTheDocument();
    });
  });

  describe('general template', () => {
    it('is read-only: a notice, "Duplicar" as the primary action and no "Salvar"', async () => {
      renderPage('tpl-general');
      const duplicate = await screen.findByRole('button', { name: 'Duplicar' });

      expect(api.get).toHaveBeenCalledWith(`${TEMPLATES_URL}/tpl-general`);
      expect(duplicate).toHaveClass('btn', DS.PrimaryButton);
      expect(screen.queryByRole('button', SAVE)).not.toBeInTheDocument();
      expect(screen.getAllByRole('note').some((note) => note.classList.contains(DS.Banner))).toBe(true);
      expect(screen.queryByText(/As mudanças valem para os próximos envios/)).not.toBeInTheDocument();
      expect(screen.queryAllByText('Padrão TeuFit').length + screen.queryAllByDisplayValue('Padrão TeuFit').length).toBeGreaterThan(0);
    });

    it('still lists its questions and previews the selected one', async () => {
      const user = userEvent.setup();
      renderPage('tpl-general');
      await screen.findByRole('button', { name: 'Duplicar' });

      expect(questionRows()).toHaveLength(3);
      await selectQuestion(user, DIET.text);

      expect(within(preview()).getByText(DIET.text)).toBeInTheDocument();
      expect(preview().querySelector(DS.StarRating)).not.toBeNull();
    });

    it('cannot be changed: no add, remove or move is available', async () => {
      const user = userEvent.setup();
      renderPage('tpl-general');
      await screen.findByRole('button', { name: 'Duplicar' });
      await selectQuestion(user, DIET.text);

      expect(isUnavailable('Adicionar pergunta')).toBe(true);
      expect(isUnavailable('Remover pergunta')).toBe(true);
      expect(isUnavailable('Mover pergunta 1 para baixo')).toBe(true);
      expect(isUnavailable('Mover pergunta 2 para cima')).toBe(true);
    });

    it('duplicates it and opens the copy in the builder', async () => {
      const user = userEvent.setup();
      renderPage('tpl-general');

      await user.click(await screen.findByRole('button', { name: 'Duplicar' }));

      await waitFor(() => expect(api.post.mock.calls).toEqual([[`${TEMPLATES_URL}/tpl-general/duplicate`]]));
      expect(await screen.findByText(`rota: ${TEMPLATES_URL}/tpl-new`)).toBeInTheDocument();
      expect(await screen.findByRole('textbox', NAME_FIELD)).toHaveValue('Padrão TeuFit (cópia)');
      expect(screen.getByRole('button', SAVE)).toBeDisabled();
    });

    it('shows the API message and stays on the general template when duplicating fails', async () => {
      api.post.mockRejectedValue({ userMessage: 'Não foi possível duplicar o modelo.' });
      const user = userEvent.setup();
      renderPage('tpl-general');

      await user.click(await screen.findByRole('button', { name: 'Duplicar' }));

      await waitFor(() => expect(showToast).toHaveBeenCalledWith('Não foi possível duplicar o modelo.', 'error'));
      expect(screen.getByText(`rota: ${TEMPLATES_URL}/tpl-general`)).toBeInTheDocument();
    });
  });

  describe('leaving', () => {
    it('asks before leaving through "Voltar" with unsaved changes and leaves once confirmed', async () => {
      const user = userEvent.setup();
      renderPage();
      await retype(user, await waitForPage(), 'Mensal 2');

      await user.click(screen.getByRole('button', { name: 'Voltar' }));
      expect(screen.getByRole('alertdialog')).toHaveClass(DS.ConfirmDialog);
      expect(screen.getByRole('alertdialog')).toHaveAccessibleName(/mudanças não salvas/);
      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));
      expect(screen.getByRole('textbox', NAME_FIELD)).toHaveValue('Mensal 2');

      await user.click(screen.getByRole('button', { name: 'Voltar' }));
      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Descartar' }));

      expect(await screen.findByText('Templates Page')).toBeInTheDocument();
      expect(api.put).not.toHaveBeenCalled();
    });

    it('also asks when the trainer leaves through a menu link, and navigates once confirmed', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitForPage();
      await user.click(screen.getByRole('button', { name: 'Mover pergunta 1 para baixo' }));

      await user.click(screen.getByRole('link', { name: 'Menu Alunos' }));
      expect(screen.getByRole('alertdialog')).toHaveAccessibleName(/mudanças não salvas/);
      expect(screen.queryByText('Página de alunos')).not.toBeInTheDocument();
      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));
      expect(within(questionRows()[0]).getByText(DIET.text)).toBeInTheDocument();

      await user.click(screen.getByRole('link', { name: 'Menu Alunos' }));
      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Descartar' }));

      expect(await screen.findByText('Página de alunos')).toBeInTheDocument();
    });

    it('also asks when the trainer presses the browser Back button with unsaved changes', async () => {
      const user = userEvent.setup();
      renderPage();
      await retype(user, await waitForPage(), 'Mensal 2');

      window.dispatchEvent(new PopStateEvent('popstate'));

      expect(await screen.findByRole('alertdialog')).toHaveAccessibleName(/mudanças não salvas/);
      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));
      expect(screen.getByRole('textbox', NAME_FIELD)).toHaveValue('Mensal 2');
    });

    it('never asks when the trainer selects another question, and keeps the changes of the previous one', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitForPage();
      await selectQuestion(user, TRAINING.text);
      await retype(user, screen.getByRole('textbox', TEXT_FIELD), 'Treinou bem?');

      await selectQuestion(user, REPORT.text);

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(screen.getByRole('textbox', TEXT_FIELD)).toHaveValue(REPORT.text);
      expect(within(questionRows()[0]).getByText('Treinou bem?')).toBeInTheDocument();
      expect(screen.getByRole('button', SAVE)).toBeEnabled();

      await selectQuestion(user, 'Treinou bem?');

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(screen.getByRole('textbox', TEXT_FIELD)).toHaveValue('Treinou bem?');
    });

    it('leaves at once through "Voltar" when nothing changed', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitForPage();

      await user.click(screen.getByRole('button', { name: 'Voltar' }));

      expect(await screen.findByText('Templates Page')).toBeInTheDocument();
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('lets a menu link navigate at once after the changes were saved', async () => {
      const user = userEvent.setup();
      renderPage();
      await retype(user, await waitForPage(), 'Mensal 2');
      await user.click(screen.getByRole('button', SAVE));
      await waitFor(() => expect(screen.getByRole('button', SAVE)).toBeDisabled());

      await user.click(screen.getByRole('link', { name: 'Menu Alunos' }));

      expect(await screen.findByText('Página de alunos')).toBeInTheDocument();
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });
});
