import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
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
const NAME_FIELD = { name: 'Nome do modelo' };
const TEXT_FIELD = { name: 'Pergunta' };
const SAVE = { name: 'Salvar' };
const ADD = { name: 'Adicionar pergunta' };
const REMOVE = { name: 'Remover pergunta' };
const CONDITION_GROUP = { name: 'Quando mostrar' };
const ALWAYS = { name: 'Sempre' };
const MEAL_PLAN_ONLY = { name: 'Só se o aluno tem plano alimentar' };
const NO_UNCONDITIONAL_QUESTION = /pelo menos uma pergunta.*sempre/i;
const MOVE_BUTTON = { name: /^Mover pergunta \d+ para (cima|baixo)$/ };

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
const DIET = buildQuestion({ id: 'q-2', order: 2, text: 'Como você avalia sua alimentação?', helpText: null, type: 'stars', typeLabel: 'Estrelas', pillar: 'diet_adherence', pillarLabel: 'Adesão (plano alimentar)', minLabel: null, maxLabel: null });
const REPORT = buildQuestion({ id: 'q-3', order: 3, text: 'Quer contar mais alguma coisa?', helpText: null, type: 'open', typeLabel: 'Aberta', pillar: 'report', pillarLabel: 'Relato', required: false, minLabel: null, maxLabel: null });

const OWN = { id: 'tpl-2', name: 'Avaliação mensal', isGeneral: false, version: 2, hasRequests: true, milestones: ['D30'], questions: [TRAINING, DIET, REPORT] };
const SINGLE = { id: 'tpl-single', name: 'Check rápido', isGeneral: false, version: 1, hasRequests: false, milestones: [], questions: [TRAINING] };
const PAIR = { id: 'tpl-pair', name: 'Dupla', isGeneral: false, version: 1, hasRequests: false, milestones: [], questions: [TRAINING, DIET] };
const MEAL_ONLY = {
  id: 'tpl-meal',
  name: 'Só nutrição',
  isGeneral: false,
  version: 1,
  hasRequests: false,
  milestones: [],
  questions: [{ ...DIET, condition: 'has_meal_plan' }, { ...REPORT, condition: 'has_meal_plan' }],
};
const GENERAL = { id: 'tpl-general', name: 'Padrão TeuFit', isGeneral: true, version: 1, hasRequests: true, milestones: ['D7'], questions: [TRAINING, DIET, REPORT] };
const COPY = { ...GENERAL, id: 'tpl-new', name: 'Padrão TeuFit (cópia)', isGeneral: false, hasRequests: false, milestones: [] };

let templatesById = {};

// Template the service answers after a save: the base with the sent name and questions
const savedTemplate = (base, body) => ({
  ...base,
  name: body.name,
  questions: body.questions.map((question, index) => ({ ...question, id: `saved-${index + 1}`, order: index + 1 })),
});

// Routes the requests of the page by URL; a save answers the same template with the sent name and questions
const mockApi = () => {
  templatesById = Object.fromEntries([OWN, SINGLE, PAIR, MEAL_ONLY, GENERAL, COPY].map((template) => [template.id, template]));
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

// Makes the next save stay in flight until the returned deferred is settled
const mockPendingSave = () => {
  const request = deferred();
  api.put.mockImplementation(() => request.promise);
  return request;
};

// Shows the current path so a test can tell where the page navigated to
const CurrentPath = () => <p>{`rota: ${useLocation().pathname}`}</p>;

// Stand-ins for the Back and Forward buttons of the browser, moving the router history
const HistoryButtons = () => {
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => navigate(-1)}>Histórico: voltar</button>
      <button type="button" onClick={() => navigate(1)}>Histórico: avançar</button>
    </>
  );
};

// Renders the builder of the given template with the current path and the history buttons
const renderPage = (id = 'tpl-2') =>
  render(
    <MemoryRouter initialEntries={[`${TEMPLATES_URL}/${id}`]}>
      <CurrentPath />
      <HistoryButtons />
      <Routes>
        <Route path="/trainer/student-feedbacks/templates/:id" element={<StudentFeedbackTemplateBuilder />} />
        <Route path="/trainer/student-feedbacks/templates" element={<div>Templates Page</div>} />
      </Routes>
    </MemoryRouter>,
  );

// Waits for an editable template to finish loading
const waitForPage = () => screen.findByRole('textbox', NAME_FIELD);

// The question list of the page
const questionList = () => screen.getByRole('list', { name: 'Perguntas' });

// The button that selects the question with the given text
const selectButtonOf = (text) => within(questionList()).getByRole('button', { name: (accessibleName) => accessibleName.includes(text) });

// The texts of the question rows that are marked as the current one
const currentQuestions = () =>
  within(questionList())
    .getAllByRole('button', { current: true })
    .map((button) => button.textContent);

// Removes the selected question and confirms the dialog
const removeSelected = async (user) => {
  await user.click(screen.getByRole('button', REMOVE));
  await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Remover' }));
  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
};

// Replaces the value of a text field
const retype = async (user, field, value) => {
  await user.clear(field);
  await user.type(field, value);
};

// The chip of "Quando mostrar" with the given name, for the selected question
const conditionChip = (query) => within(screen.getByRole('group', CONDITION_GROUP)).getByRole('button', query);

// The name field and every control of the question editor, the removal included
const editingControls = () => [
  screen.getByRole('textbox', NAME_FIELD),
  screen.getByRole('textbox', TEXT_FIELD),
  screen.getByRole('textbox', { name: 'Texto de apoio (opcional)' }),
  screen.getByRole('textbox', { name: 'O que significa 0' }),
  screen.getByRole('textbox', { name: 'O que significa 10' }),
  screen.getByRole('combobox', { name: 'Pilar' }),
  ...within(screen.getByRole('group', { name: 'Tipo de resposta' })).getAllByRole('button'),
  ...within(screen.getByRole('group', CONDITION_GROUP)).getAllByRole('button'),
  screen.getByRole('switch', { name: 'Obrigatória' }),
  screen.getByRole('switch', { name: 'Nota alta é ruim' }),
  screen.getByRole('button', REMOVE),
];

// The move button of the question at the given position, up or down
const moveButton = (position, direction) => screen.getByRole('button', { name: `Mover pergunta ${position} para ${direction}` });

// Renames the template and clicks "Salvar", then waits for the PUT to be sent
const startSave = async (user) => {
  await retype(user, screen.getByRole('textbox', NAME_FIELD), 'Avaliação trimestral');
  await user.click(screen.getByRole('button', SAVE));
  await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1));
};

describe('StudentFeedbackTemplateBuilder: rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi();
  });

  describe('the last remaining question', () => {
    it('cannot be removed from a template with a single question', async () => {
      const user = userEvent.setup();
      renderPage('tpl-single');
      await waitForPage();

      const remove = screen.getByRole('button', REMOVE);
      expect(remove).toBeDisabled();
      expect(remove).toHaveAttribute('title', 'O modelo precisa ter pelo menos uma pergunta.');
      await user.click(remove);

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(within(questionList()).getAllByRole('listitem')).toHaveLength(1);
    });

    it('cannot be removed once the other questions were removed', async () => {
      const user = userEvent.setup();
      renderPage('tpl-pair');
      await waitForPage();
      expect(screen.getByRole('button', REMOVE)).toBeEnabled();

      await removeSelected(user);

      expect(within(questionList()).getAllByRole('listitem')).toHaveLength(1);
      expect(screen.getByText('1 de 15')).toBeInTheDocument();
      expect(screen.getByRole('button', REMOVE)).toBeDisabled();
    });

    it('can be removed again after another question is added', async () => {
      const user = userEvent.setup();
      renderPage('tpl-single');
      await waitForPage();

      await user.click(screen.getByRole('button', ADD));

      expect(screen.getByRole('button', REMOVE)).toBeEnabled();
    });
  });

  describe('selection after a removal', () => {
    it('moves to the question that came after the removed one', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitForPage();
      await user.click(selectButtonOf(DIET.text));

      await removeSelected(user);

      expect(within(questionList()).queryByText(DIET.text)).not.toBeInTheDocument();
      expect(currentQuestions()).toHaveLength(1);
      expect(selectButtonOf(REPORT.text)).toHaveAttribute('aria-current', 'true');
      expect(screen.getByRole('heading', { level: 2, name: 'Pergunta 2' })).toBeInTheDocument();
      expect(screen.getByRole('textbox', TEXT_FIELD)).toHaveValue(REPORT.text);
      expect(within(screen.getByRole('group', { name: 'Tela do app do aluno' })).getByText(REPORT.text)).toBeInTheDocument();
    });

    it('moves to the question before it when the last question is removed', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitForPage();
      await user.click(selectButtonOf(REPORT.text));

      await removeSelected(user);

      expect(selectButtonOf(DIET.text)).toHaveAttribute('aria-current', 'true');
      expect(currentQuestions()).toHaveLength(1);
      expect(screen.getByRole('heading', { level: 2, name: 'Pergunta 2' })).toBeInTheDocument();
      expect(screen.getByRole('textbox', TEXT_FIELD)).toHaveValue(DIET.text);
    });

    it('moves to the new first question when the first question is removed', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitForPage();

      await removeSelected(user);

      expect(selectButtonOf(DIET.text)).toHaveAttribute('aria-current', 'true');
      expect(screen.getByRole('heading', { level: 2, name: 'Pergunta 1' })).toBeInTheDocument();
      expect(screen.getByRole('textbox', TEXT_FIELD)).toHaveValue(DIET.text);
    });

    it('keeps the selection where it was when the removal is cancelled', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitForPage();
      await user.click(selectButtonOf(DIET.text));

      await user.click(screen.getByRole('button', REMOVE));
      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));

      expect(selectButtonOf(DIET.text)).toHaveAttribute('aria-current', 'true');
      expect(within(questionList()).getAllByRole('listitem')).toHaveLength(3);
    });
  });

  describe('general template', () => {
    it('shows no question editor and no name field, only the list and the preview', async () => {
      renderPage('tpl-general');
      await screen.findByRole('heading', { level: 1, name: 'Padrão TeuFit' });

      expect(screen.queryByRole('textbox', NAME_FIELD)).not.toBeInTheDocument();
      expect(screen.queryByRole('textbox', TEXT_FIELD)).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { level: 2, name: /^Pergunta \d+$/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('combobox', { name: 'Pilar' })).not.toBeInTheDocument();
      expect(screen.queryByRole('group', { name: 'Tipo de resposta' })).not.toBeInTheDocument();
      expect(screen.queryByRole('switch')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', REMOVE)).not.toBeInTheDocument();
      expect(within(questionList()).getAllByRole('listitem')).toHaveLength(3);
      expect(screen.getByRole('region', { name: 'Como o aluno vê' })).toBeInTheDocument();
    });

    it('still shows no editor after another question is selected', async () => {
      const user = userEvent.setup();
      renderPage('tpl-general');
      await screen.findByRole('heading', { level: 1, name: 'Padrão TeuFit' });

      await user.click(selectButtonOf(REPORT.text));

      expect(selectButtonOf(REPORT.text)).toHaveAttribute('aria-current', 'true');
      expect(screen.queryByRole('textbox', TEXT_FIELD)).not.toBeInTheDocument();
      expect(within(screen.getByRole('group', { name: 'Tela do app do aluno' })).getByText(REPORT.text)).toBeInTheDocument();
    });
  });

  describe('save toast', () => {
    it('says "Modelo salvo." when the template is saved in place', async () => {
      const user = userEvent.setup();
      renderPage();
      await retype(user, await waitForPage(), 'Avaliação trimestral');

      await user.click(screen.getByRole('button', SAVE));

      await waitFor(() => expect(showToast).toHaveBeenCalledWith('Modelo salvo.', 'success'));
      expect(showToast).toHaveBeenCalledTimes(1);
      expect(screen.getByText(`rota: ${TEMPLATES_URL}/tpl-2`)).toBeInTheDocument();
    });

    it('says which version was created when the save answers a new version', async () => {
      const user = userEvent.setup();
      mockSaveCreatesVersion();
      renderPage();
      await retype(user, await waitForPage(), 'Avaliação trimestral');

      await user.click(screen.getByRole('button', SAVE));

      await waitFor(() => expect(showToast).toHaveBeenCalledWith('Modelo salvo. Vale para os próximos envios.', 'success'));
      expect(showToast).toHaveBeenCalledTimes(1);
      expect(showToast.mock.calls[0][0]).not.toMatch(/\d|vers[aã]o/i);
      expect(await screen.findByText(`rota: ${TEMPLATES_URL}/tpl-3`)).toBeInTheDocument();
      expect(screen.getByRole('textbox', NAME_FIELD)).toHaveValue('Avaliação trimestral');
      expect(api.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('what blocks "Salvar"', () => {
    it('is disabled while the name is empty and enabled once it has a name again', async () => {
      const user = userEvent.setup();
      renderPage();
      const name = await waitForPage();

      await user.clear(name);
      expect(screen.getByRole('button', SAVE)).toBeDisabled();

      await user.type(name, '   ');
      expect(screen.getByRole('button', SAVE)).toBeDisabled();

      await user.type(name, 'Novo nome');
      expect(screen.getByRole('button', SAVE)).toBeEnabled();
    });

    it('is disabled while an added question has no text and enabled once it gets one', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitForPage();

      await user.click(screen.getByRole('button', ADD));
      expect(screen.getByRole('button', SAVE)).toBeDisabled();

      await user.type(screen.getByRole('textbox', TEXT_FIELD), 'Como está a hidratação?');
      expect(screen.getByRole('button', SAVE)).toBeEnabled();
    });

    it('is disabled while the text of an existing question is erased, even with another question selected', async () => {
      const user = userEvent.setup();
      renderPage();
      await waitForPage();

      await user.clear(screen.getByRole('textbox', TEXT_FIELD));
      await user.click(selectButtonOf(REPORT.text));

      expect(screen.getByRole('button', SAVE)).toBeDisabled();
      expect(api.put).not.toHaveBeenCalled();
    });

    it('is disabled again once an edit is typed back to the saved value, and leaving then asks nothing', async () => {
      const user = userEvent.setup();
      renderPage();
      const name = await waitForPage();

      await user.type(name, '!');
      expect(screen.getByRole('button', SAVE)).toBeEnabled();
      await user.type(name, '{Backspace}');
      expect(screen.getByRole('button', SAVE)).toBeDisabled();

      await user.click(screen.getByRole('button', { name: 'Voltar' }));

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(await screen.findByText('Templates Page')).toBeInTheDocument();
    });
  });

  describe('a template with no question for a student without a meal plan', () => {
    it('blocks "Salvar" and says why once every question is meal-plan only, until one is back on "Sempre"', async () => {
      const user = userEvent.setup();
      renderPage('tpl-pair');
      await waitForPage();
      expect(screen.queryByText(NO_UNCONDITIONAL_QUESTION)).not.toBeInTheDocument();

      await user.click(conditionChip(MEAL_PLAN_ONLY));
      expect(screen.queryByText(NO_UNCONDITIONAL_QUESTION)).not.toBeInTheDocument();
      expect(screen.getByRole('button', SAVE)).toBeEnabled();

      await user.click(selectButtonOf(DIET.text));
      await user.click(conditionChip(MEAL_PLAN_ONLY));
      expect(screen.getByText(NO_UNCONDITIONAL_QUESTION)).toBeInTheDocument();
      expect(screen.getByRole('button', SAVE)).toBeDisabled();
      await user.click(screen.getByRole('button', SAVE));
      expect(api.put).not.toHaveBeenCalled();

      await user.click(conditionChip(ALWAYS));
      expect(screen.queryByText(NO_UNCONDITIONAL_QUESTION)).not.toBeInTheDocument();
      expect(screen.getByRole('button', SAVE)).toBeEnabled();
    });

    it('keeps the message while another question is selected', async () => {
      const user = userEvent.setup();
      renderPage('tpl-pair');
      await waitForPage();
      await user.click(conditionChip(MEAL_PLAN_ONLY));
      await user.click(selectButtonOf(DIET.text));
      await user.click(conditionChip(MEAL_PLAN_ONLY));

      await user.click(selectButtonOf(TRAINING.text));

      expect(screen.getByText(NO_UNCONDITIONAL_QUESTION)).toBeInTheDocument();
      expect(screen.getByRole('button', SAVE)).toBeDisabled();
    });

    it('shows the message for a template that loads that way and saves it once one question is on "Sempre"', async () => {
      const user = userEvent.setup();
      renderPage('tpl-meal');
      const name = await waitForPage();
      expect(screen.getByText(NO_UNCONDITIONAL_QUESTION)).toBeInTheDocument();

      await user.type(name, ' 2');
      expect(screen.getByRole('button', SAVE)).toBeDisabled();
      expect(screen.getByText(NO_UNCONDITIONAL_QUESTION)).toBeInTheDocument();

      await user.click(conditionChip(ALWAYS));
      expect(screen.queryByText(NO_UNCONDITIONAL_QUESTION)).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', SAVE));

      await waitFor(() => expect(api.put).toHaveBeenCalledTimes(1));
      const [, body] = api.put.mock.calls[0];
      expect(body.questions.map((question) => question.condition)).toEqual([null, 'has_meal_plan']);
    });

    it('drops the message when a question is added, since a new question is always shown', async () => {
      const user = userEvent.setup();
      renderPage('tpl-meal');
      await waitForPage();
      expect(screen.getByText(NO_UNCONDITIONAL_QUESTION)).toBeInTheDocument();

      await user.click(screen.getByRole('button', ADD));

      expect(screen.queryByText(NO_UNCONDITIONAL_QUESTION)).not.toBeInTheDocument();
      expect(screen.getByRole('button', SAVE)).toBeDisabled();
    });

    it('does not show the message when "Salvar" is blocked by an empty name or an empty question', async () => {
      const user = userEvent.setup();
      renderPage();
      const name = await waitForPage();

      await user.clear(name);
      expect(screen.getByRole('button', SAVE)).toBeDisabled();
      expect(screen.queryByText(NO_UNCONDITIONAL_QUESTION)).not.toBeInTheDocument();

      await user.type(name, 'Novo nome');
      await user.clear(screen.getByRole('textbox', TEXT_FIELD));
      expect(screen.getByRole('button', SAVE)).toBeDisabled();
      expect(screen.queryByText(NO_UNCONDITIONAL_QUESTION)).not.toBeInTheDocument();
    });
  });

  describe('while the save is in flight', () => {
    it('disables the name field and every control of the question editor, and enables them once the save succeeds', async () => {
      const user = userEvent.setup();
      const request = mockPendingSave();
      renderPage();
      await waitForPage();
      editingControls().forEach((control) => expect(control).toBeEnabled());

      await startSave(user);
      editingControls().forEach((control) => expect(control).toBeDisabled());

      request.resolve({ data: { template: savedTemplate(OWN, api.put.mock.calls[0][1]) } });
      await waitFor(() => expect(showToast).toHaveBeenCalledWith('Modelo salvo.', 'success'));
      await waitFor(() => expect(screen.getByRole('textbox', NAME_FIELD)).toBeEnabled());
      editingControls().forEach((control) => expect(control).toBeEnabled());
      expect(screen.getByRole('textbox', NAME_FIELD)).toHaveValue('Avaliação trimestral');
    });

    it('disables "Adicionar pergunta" and every move button, and enables them once the save succeeds', async () => {
      const user = userEvent.setup();
      const request = mockPendingSave();
      renderPage();
      await waitForPage();

      await startSave(user);
      expect(screen.getByRole('button', ADD)).toBeDisabled();
      expect(screen.getAllByRole('button', MOVE_BUTTON)).toHaveLength(6);
      screen.getAllByRole('button', MOVE_BUTTON).forEach((button) => expect(button).toBeDisabled());

      request.resolve({ data: { template: savedTemplate(OWN, api.put.mock.calls[0][1]) } });
      await waitFor(() => expect(screen.getByRole('button', ADD)).toBeEnabled());
      [moveButton(1, 'baixo'), moveButton(2, 'cima'), moveButton(2, 'baixo'), moveButton(3, 'cima')].forEach((button) => expect(button).toBeEnabled());
      expect(moveButton(1, 'cima')).toBeDisabled();
      expect(moveButton(3, 'baixo')).toBeDisabled();
    });

    it('leaves the draft untouched by typing and clicks made during the save', async () => {
      const user = userEvent.setup();
      const request = mockPendingSave();
      renderPage();
      await waitForPage();
      await startSave(user);

      await user.type(screen.getByRole('textbox', NAME_FIELD), ' extra');
      await user.type(screen.getByRole('textbox', TEXT_FIELD), ' extra');
      await user.click(screen.getByRole('button', ADD));
      await user.click(moveButton(1, 'baixo'));
      await user.click(screen.getByRole('button', REMOVE));

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(screen.getByRole('textbox', NAME_FIELD)).toHaveValue('Avaliação trimestral');
      expect(screen.getByRole('textbox', TEXT_FIELD)).toHaveValue(TRAINING.text);
      expect(within(questionList()).getAllByRole('listitem')).toHaveLength(3);
      expect(within(questionList()).getAllByRole('listitem')[0]).toHaveTextContent(TRAINING.text);

      request.resolve({ data: { template: savedTemplate(OWN, api.put.mock.calls[0][1]) } });
      await waitFor(() => expect(showToast).toHaveBeenCalledWith('Modelo salvo.', 'success'));
      await waitFor(() => expect(screen.getByRole('button', SAVE)).toBeDisabled());
      expect(api.put).toHaveBeenCalledTimes(1);
    });

    it('enables every control again, with the draft kept, once the save fails', async () => {
      const user = userEvent.setup();
      const request = mockPendingSave();
      renderPage();
      await waitForPage();

      await startSave(user);
      editingControls().forEach((control) => expect(control).toBeDisabled());
      expect(screen.getByRole('button', ADD)).toBeDisabled();
      screen.getAllByRole('button', MOVE_BUTTON).forEach((button) => expect(button).toBeDisabled());

      request.reject({ userMessage: 'Não foi possível salvar o modelo.' });
      await waitFor(() => expect(showToast).toHaveBeenCalledWith('Não foi possível salvar o modelo.', 'error'));
      await waitFor(() => expect(screen.getByRole('button', SAVE)).toBeEnabled());
      editingControls().forEach((control) => expect(control).toBeEnabled());
      expect(screen.getByRole('button', ADD)).toBeEnabled();
      [moveButton(1, 'baixo'), moveButton(2, 'cima'), moveButton(2, 'baixo'), moveButton(3, 'cima')].forEach((button) => expect(button).toBeEnabled());
      expect(screen.getByRole('textbox', NAME_FIELD)).toHaveValue('Avaliação trimestral');
    });
  });

  describe('coming back to a saved template through the browser history', () => {
    it('shows a duplicated and saved template again after Back to the general one and Forward', async () => {
      const user = userEvent.setup();
      renderPage('tpl-general');
      await screen.findByRole('heading', { level: 1, name: 'Padrão TeuFit' });
      await user.click(screen.getByRole('button', { name: 'Duplicar' }));
      await retype(user, await waitForPage(), 'Meu modelo');
      await user.click(screen.getByRole('button', SAVE));
      await waitFor(() => expect(showToast).toHaveBeenCalledWith('Modelo salvo.', 'success'));

      await user.click(screen.getByRole('button', { name: 'Histórico: voltar' }));
      await screen.findByRole('heading', { level: 1, name: 'Padrão TeuFit' });
      await user.click(screen.getByRole('button', { name: 'Histórico: avançar' }));

      expect(screen.getByText(`rota: ${TEMPLATES_URL}/tpl-new`)).toBeInTheDocument();
      expect(await waitForPage()).toHaveValue('Meu modelo');
    });
  });
});
