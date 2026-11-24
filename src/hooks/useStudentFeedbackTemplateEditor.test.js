import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '../test/test-utils';
import useStudentFeedbackTemplateEditor from './useStudentFeedbackTemplateEditor';
import api from '../api/axios';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const TEMPLATES_URL = '/trainer/student-feedbacks/templates';

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
const DIET = buildQuestion({ id: 'q-2', order: 2, text: 'Como você avalia sua alimentação?', helpText: null, type: 'stars', pillar: 'diet_adherence', condition: 'has_meal_plan', minLabel: null, maxLabel: null });
const REPORT = buildQuestion({ id: 'q-3', order: 3, text: 'Quer contar mais alguma coisa?', helpText: null, type: 'open', pillar: 'report', required: false, minLabel: null, maxLabel: null });

const OWN = { id: 'tpl-2', name: 'Avaliação mensal', isGeneral: false, version: 2, hasRequests: true, milestones: ['D30'], questions: [TRAINING, DIET, REPORT] };
const GENERAL = { id: 'tpl-general', name: 'Padrão TeuFit', isGeneral: true, version: 1, hasRequests: true, milestones: ['D7'], questions: [TRAINING, DIET, REPORT] };

let templatesById = {};

// Template the service answers after a save: the base with the sent name and questions under new question ids
const savedTemplate = (base, body) => ({
  ...base,
  name: body.name,
  questions: body.questions.map((question, index) => ({ ...question, id: `saved-${index + 1}`, order: index + 1 })),
});

// Routes the template requests by URL; a save answers the same template with the sent name and questions
const mockApi = () => {
  templatesById = { [OWN.id]: OWN, [GENERAL.id]: GENERAL };
  api.get.mockImplementation((url) => {
    const template = templatesById[url.replace(`${TEMPLATES_URL}/`, '')];
    if (url.startsWith(`${TEMPLATES_URL}/`) && template) return Promise.resolve({ data: { template } });
    return Promise.reject({ userMessage: 'Modelo de feedback não encontrado.' });
  });
  api.put.mockImplementation((url, body) => {
    const saved = savedTemplate(templatesById[url.replace(`${TEMPLATES_URL}/`, '')], body);
    templatesById[saved.id] = saved;
    return Promise.resolve({ data: { template: saved } });
  });
};

// Makes the next saves answer a new version of the template under the id `tpl-3`
const mockSaveCreatesVersion = () => {
  api.put.mockImplementation((url, body) => {
    const saved = { ...savedTemplate(OWN, body), id: 'tpl-3', version: 3, hasRequests: false };
    templatesById[saved.id] = saved;
    return Promise.resolve({ data: { template: saved } });
  });
};

// Renders the editor of a template without waiting for it
const renderEditorOf = (id = 'tpl-2') => renderHook((props) => useStudentFeedbackTemplateEditor(props.id), { initialProps: { id } });

// Renders the editor of a template and waits until it is loaded
const renderEditor = async (id = 'tpl-2') => {
  const view = renderEditorOf(id);
  await waitFor(() => expect(view.result.current.template).not.toBeNull());
  return view;
};

// The keys of the draft questions, in order
const draftKeys = (result) => result.current.draft.questions.map((question) => question.key);

// The texts of the draft questions, in order
const draftTexts = (result) => result.current.draft.questions.map((question) => question.text);

// Requests made for one template by id
const getsOf = (id) => api.get.mock.calls.filter(([url]) => url === `${TEMPLATES_URL}/${id}`);

beforeEach(() => {
  vi.clearAllMocks();
  mockApi();
});

describe('useStudentFeedbackTemplateEditor: loading', () => {
  it('is loading with no template, no error and nothing to save while the request runs', () => {
    api.get.mockImplementation(() => new Promise(() => {}));
    const { result } = renderEditorOf();

    expect(result.current.loading).toBe(true);
    expect(result.current.template).toBeNull();
    expect(result.current.error).toBe('');
    expect(result.current.selected).toBeNull();
    expect(result.current.isDirty).toBe(false);
    expect(result.current.canSave).toBe(false);
    expect(result.current.saving).toBe(false);
  });

  it('loads the template of the id with an editable draft, the first question selected and nothing to save', async () => {
    const { result } = await renderEditor();

    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith(`${TEMPLATES_URL}/tpl-2`);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('');
    expect(result.current.template).toEqual(OWN);
    expect(result.current.draft.name).toBe('Avaliação mensal');
    expect(draftKeys(result)).toEqual(['q-1', 'q-2', 'q-3']);
    expect(result.current.draft.questions[1]).toMatchObject({ helpText: '', minLabel: '', maxLabel: '', condition: 'has_meal_plan' });
    expect(result.current.selected.key).toBe('q-1');
    expect(result.current.isDirty).toBe(false);
    expect(result.current.canSave).toBe(false);
  });

  it('settles with the API message and no template when the template does not exist', async () => {
    const { result } = renderEditorOf('tpl-gone');

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Modelo de feedback não encontrado.');
    expect(result.current.template).toBeNull();
    expect(result.current.canSave).toBe(false);
  });

  it('settles with a translated message when the failure carries no user message', async () => {
    api.get.mockRejectedValue(new Error('Network Error'));
    const { result } = renderEditorOf();

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toEqual(expect.any(String));
    expect(result.current.error).not.toBe('');
    expect(result.current.template).toBeNull();
  });

  it('goes back to loading on retry and then shows the template', async () => {
    api.get.mockRejectedValueOnce({ userMessage: 'Erro ao carregar o modelo.' });
    const { result } = renderEditorOf();
    await waitFor(() => expect(result.current.error).toBe('Erro ao carregar o modelo.'));

    act(() => {
      result.current.retry();
    });

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe('');
    await waitFor(() => expect(result.current.template).toEqual(OWN));
    expect(result.current.error).toBe('');
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('keeps the error when the retry fails too', async () => {
    api.get.mockRejectedValue({ userMessage: 'Erro ao carregar o modelo.' });
    const { result } = renderEditorOf();
    await waitFor(() => expect(result.current.error).toBe('Erro ao carregar o modelo.'));

    act(() => {
      result.current.retry();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Erro ao carregar o modelo.');
    expect(result.current.template).toBeNull();
  });

  it('loads the other template when the id changes, never showing the previous one under the new id', async () => {
    const { result, rerender } = await renderEditor('tpl-2');

    rerender({ id: 'tpl-general' });

    expect(result.current.loading).toBe(true);
    expect(result.current.template).toBeNull();
    await waitFor(() => expect(result.current.template).toEqual(GENERAL));
    expect(result.current.draft.name).toBe('Padrão TeuFit');
    expect(api.get).toHaveBeenCalledWith(`${TEMPLATES_URL}/tpl-general`);
  });

  it('ignores the answer of a template the route already left', async () => {
    let answerOwn;
    api.get.mockImplementation((url) => {
      if (url === `${TEMPLATES_URL}/tpl-2`) return new Promise((resolve) => { answerOwn = resolve; });
      return Promise.resolve({ data: { template: GENERAL } });
    });
    const { result, rerender } = renderEditorOf('tpl-2');
    rerender({ id: 'tpl-general' });
    await waitFor(() => expect(result.current.template).toEqual(GENERAL));

    await act(async () => {
      answerOwn({ data: { template: OWN } });
    });

    expect(result.current.template).toEqual(GENERAL);
    expect(result.current.draft.name).toBe('Padrão TeuFit');
  });
});

describe('useStudentFeedbackTemplateEditor: unsaved changes', () => {
  it('is dirty after the name changes and clean again once the name is typed back', async () => {
    const { result } = await renderEditor();

    act(() => result.current.setName('Avaliação trimestral'));
    expect(result.current.isDirty).toBe(true);
    expect(result.current.canSave).toBe(true);

    act(() => result.current.setName('Avaliação mensal'));
    expect(result.current.isDirty).toBe(false);
    expect(result.current.canSave).toBe(false);
  });

  it('is clean again once an edited question gets its text back', async () => {
    const { result } = await renderEditor();

    act(() => result.current.changeQuestion('q-1', { text: 'Outro texto' }));
    expect(result.current.isDirty).toBe(true);

    act(() => result.current.changeQuestion('q-1', { text: TRAINING.text }));
    expect(result.current.isDirty).toBe(false);
  });

  it('is clean again once a moved question is moved back', async () => {
    const { result } = await renderEditor();

    act(() => result.current.moveQuestion(0, 1));
    expect(draftKeys(result)).toEqual(['q-2', 'q-1', 'q-3']);
    expect(result.current.isDirty).toBe(true);

    act(() => result.current.moveQuestion(1, -1));
    expect(draftKeys(result)).toEqual(['q-1', 'q-2', 'q-3']);
    expect(result.current.isDirty).toBe(false);
  });

  it('is clean again once an added question is removed', async () => {
    const { result } = await renderEditor();

    act(() => result.current.addQuestion());
    expect(result.current.isDirty).toBe(true);

    act(() => result.current.removeQuestion(result.current.selected.key));
    expect(draftKeys(result)).toEqual(['q-1', 'q-2', 'q-3']);
    expect(result.current.isDirty).toBe(false);
  });

  it('does not count spaces around the name as a change, since a save would trim them', async () => {
    const { result } = await renderEditor();

    act(() => result.current.setName('  Avaliação mensal  '));

    expect(result.current.isDirty).toBe(false);
    expect(result.current.canSave).toBe(false);
  });

  it('does not count selecting another question as a change', async () => {
    const { result } = await renderEditor();

    act(() => result.current.selectQuestion('q-3'));

    expect(result.current.selected.key).toBe('q-3');
    expect(result.current.isDirty).toBe(false);
  });

  it('stays clean when the first question is moved up or the last one down', async () => {
    const { result } = await renderEditor();

    act(() => result.current.moveQuestion(0, -1));
    act(() => result.current.moveQuestion(2, 1));

    expect(draftKeys(result)).toEqual(['q-1', 'q-2', 'q-3']);
    expect(result.current.isDirty).toBe(false);
  });

  it('never reports the general template as dirty or saveable', async () => {
    const { result } = await renderEditor('tpl-general');

    act(() => result.current.setName('Outro nome'));

    expect(result.current.isDirty).toBe(false);
    expect(result.current.canSave).toBe(false);
  });
});

describe('useStudentFeedbackTemplateEditor: questions', () => {
  it('changes only the question under the key', async () => {
    const { result } = await renderEditor();

    act(() => result.current.changeQuestion('q-2', { text: 'Comeu bem?', required: false }));

    expect(draftTexts(result)).toEqual([TRAINING.text, 'Comeu bem?', REPORT.text]);
    expect(result.current.draft.questions[1]).toMatchObject({ key: 'q-2', required: false, type: 'stars', pillar: 'diet_adherence' });
  });

  it('appends a blank required score question and selects it', async () => {
    const { result } = await renderEditor();

    act(() => result.current.addQuestion());

    expect(result.current.draft.questions).toHaveLength(4);
    const added = result.current.draft.questions[3];
    expect(added).toMatchObject({ text: '', helpText: '', type: 'score', pillar: 'other', required: true, condition: null, invertScore: false, minLabel: '', maxLabel: '' });
    expect(result.current.selected).toBe(added);
  });

  it('gives each added question its own key', async () => {
    const { result } = await renderEditor();

    act(() => result.current.addQuestion());
    act(() => result.current.addQuestion());

    expect(new Set(draftKeys(result)).size).toBe(5);
  });

  it('selects the question after the removed one', async () => {
    const { result } = await renderEditor();
    act(() => result.current.selectQuestion('q-2'));

    act(() => result.current.removeQuestion('q-2'));

    expect(draftKeys(result)).toEqual(['q-1', 'q-3']);
    expect(result.current.selected.key).toBe('q-3');
  });

  it('selects the question before the removed one when the last question is removed', async () => {
    const { result } = await renderEditor();
    act(() => result.current.selectQuestion('q-3'));

    act(() => result.current.removeQuestion('q-3'));

    expect(draftKeys(result)).toEqual(['q-1', 'q-2']);
    expect(result.current.selected.key).toBe('q-2');
  });
});

describe('useStudentFeedbackTemplateEditor: what blocks a save', () => {
  it('cannot save while the name is empty, and can again once it has a name', async () => {
    const { result } = await renderEditor();

    act(() => result.current.setName(''));
    expect(result.current.isDirty).toBe(true);
    expect(result.current.canSave).toBe(false);

    act(() => result.current.setName('   '));
    expect(result.current.canSave).toBe(false);

    act(() => result.current.setName('Novo nome'));
    expect(result.current.canSave).toBe(true);
  });

  it('cannot save while an existing question has no text', async () => {
    const { result } = await renderEditor();

    act(() => result.current.changeQuestion('q-3', { text: '   ' }));

    expect(result.current.isDirty).toBe(true);
    expect(result.current.canSave).toBe(false);
  });

  it('cannot save while an added question has no text, and can once it gets one', async () => {
    const { result } = await renderEditor();

    act(() => result.current.addQuestion());
    expect(result.current.canSave).toBe(false);

    act(() => result.current.changeQuestion(result.current.selected.key, { text: 'Como está a hidratação?' }));
    expect(result.current.canSave).toBe(true);
  });

  it('cannot save while every question is shown only to a student with a meal plan, and can once one is always shown again', async () => {
    const { result } = await renderEditor();

    act(() => result.current.changeQuestion('q-1', { condition: 'has_meal_plan' }));
    expect(result.current.canSave).toBe(true);

    act(() => result.current.changeQuestion('q-3', { condition: 'has_meal_plan' }));
    expect(result.current.isDirty).toBe(true);
    expect(result.current.canSave).toBe(false);

    act(() => result.current.changeQuestion('q-2', { condition: null }));
    expect(result.current.canSave).toBe(true);
  });
});

describe('useStudentFeedbackTemplateEditor: saving', () => {
  it('sends one PUT with the trimmed name and every question in order, and resolves to the saved template', async () => {
    const { result } = await renderEditor();
    act(() => result.current.setName('  Avaliação trimestral '));
    act(() => result.current.moveQuestion(0, 1));

    let saved;
    await act(async () => {
      saved = await result.current.save();
    });

    expect(api.put).toHaveBeenCalledTimes(1);
    const [url, body] = api.put.mock.calls[0];
    expect(url).toBe(`${TEMPLATES_URL}/tpl-2`);
    expect(body.name).toBe('Avaliação trimestral');
    expect(body.questions.map((question) => question.text)).toEqual([DIET.text, TRAINING.text, REPORT.text]);
    expect(body.questions[1]).toEqual({
      text: TRAINING.text,
      helpText: TRAINING.helpText,
      type: 'score',
      pillar: 'training_adherence',
      required: true,
      condition: null,
      invertScore: false,
      minLabel: 'Não treinei',
      maxLabel: 'Treinei tudo',
    });
    expect(saved).toMatchObject({ id: 'tpl-2', name: 'Avaliação trimestral' });
  });

  it('adopts the returned template as the new baseline without fetching it again', async () => {
    const { result } = await renderEditor();
    act(() => result.current.setName('Avaliação trimestral'));

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.template.name).toBe('Avaliação trimestral');
    expect(result.current.draft.name).toBe('Avaliação trimestral');
    expect(draftKeys(result)).toEqual(['saved-1', 'saved-2', 'saved-3']);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.canSave).toBe(false);
    expect(result.current.saving).toBe(false);
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('keeps the question at the selected position selected after a save renamed its key', async () => {
    const { result } = await renderEditor();
    act(() => result.current.selectQuestion('q-2'));
    act(() => result.current.changeQuestion('q-2', { text: 'Comeu bem?' }));

    await act(async () => {
      await result.current.save();
    });

    expect(result.current.selected).toMatchObject({ key: 'saved-2', text: 'Comeu bem?' });
  });

  it('is dirty again after a change made on top of the saved template', async () => {
    const { result } = await renderEditor();
    act(() => result.current.setName('Avaliação trimestral'));
    await act(async () => {
      await result.current.save();
    });

    act(() => result.current.setName('Avaliação mensal'));

    expect(result.current.isDirty).toBe(true);
  });

  it('is saving and cannot be saved again while the request runs', async () => {
    let answer;
    api.put.mockImplementation(() => new Promise((resolve) => { answer = resolve; }));
    const { result } = await renderEditor();
    act(() => result.current.setName('Avaliação trimestral'));

    let pending;
    act(() => {
      pending = result.current.save();
    });

    expect(result.current.saving).toBe(true);
    expect(result.current.canSave).toBe(false);

    await act(async () => {
      answer({ data: { template: { ...OWN, name: 'Avaliação trimestral' } } });
      await pending;
    });
    expect(result.current.saving).toBe(false);
  });

  it('adopts a new version under its new id and does not fetch it when the route moves to that id', async () => {
    mockSaveCreatesVersion();
    const { result, rerender } = await renderEditor();
    act(() => result.current.setName('Avaliação trimestral'));

    let saved;
    await act(async () => {
      saved = await result.current.save();
    });
    expect(saved).toMatchObject({ id: 'tpl-3', version: 3 });
    expect(result.current.loading).toBe(false);
    expect(result.current.template).toMatchObject({ id: 'tpl-3', version: 3, hasRequests: false });

    rerender({ id: 'tpl-3' });

    expect(result.current.loading).toBe(false);
    expect(result.current.template).toMatchObject({ id: 'tpl-3', version: 3 });
    expect(result.current.draft.name).toBe('Avaliação trimestral');
    expect(result.current.isDirty).toBe(false);
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(getsOf('tpl-3')).toHaveLength(0);
  });

  it('saves the next change to the id of the new version', async () => {
    mockSaveCreatesVersion();
    const { result, rerender } = await renderEditor();
    act(() => result.current.setName('Avaliação trimestral'));
    await act(async () => {
      await result.current.save();
    });
    rerender({ id: 'tpl-3' });
    mockApi();
    templatesById['tpl-3'] = { ...OWN, id: 'tpl-3', version: 3, hasRequests: false };

    act(() => result.current.setName('Avaliação semestral'));
    await act(async () => {
      await result.current.save();
    });

    expect(api.put).toHaveBeenCalledTimes(2);
    expect(api.put.mock.calls[1][0]).toBe(`${TEMPLATES_URL}/tpl-3`);
    expect(result.current.template).toMatchObject({ id: 'tpl-3', name: 'Avaliação semestral' });
    expect(result.current.isDirty).toBe(false);
  });

  it('rejects with the API error and keeps the draft, the changes and the loaded template when the save fails', async () => {
    const failure = { userMessage: 'O modelo precisa ter entre 1 e 15 perguntas.' };
    api.put.mockRejectedValue(failure);
    const { result } = await renderEditor();
    act(() => result.current.setName('Avaliação trimestral'));
    act(() => result.current.changeQuestion('q-1', { text: 'Treinou?' }));

    let caught;
    await act(async () => {
      caught = await result.current.save().catch((error) => error);
    });

    expect(caught).toBe(failure);
    expect(api.put).toHaveBeenCalledTimes(1);
    expect(result.current.saving).toBe(false);
    expect(result.current.draft.name).toBe('Avaliação trimestral');
    expect(draftTexts(result)).toEqual(['Treinou?', DIET.text, REPORT.text]);
    expect(draftKeys(result)).toEqual(['q-1', 'q-2', 'q-3']);
    expect(result.current.template).toEqual(OWN);
    expect(result.current.isDirty).toBe(true);
    expect(result.current.canSave).toBe(true);
    expect(result.current.error).toBe('');
  });
});

describe('useStudentFeedbackTemplateEditor: coming back to a saved template', () => {
  it('loads a template saved in place again after the route visited another template and came back', async () => {
    const { result, rerender } = await renderEditor('tpl-2');
    act(() => result.current.setName('Avaliação trimestral'));
    await act(async () => {
      await result.current.save();
    });

    rerender({ id: 'tpl-general' });
    await waitFor(() => expect(result.current.template).toMatchObject({ id: 'tpl-general' }));
    rerender({ id: 'tpl-2' });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.template).toMatchObject({ id: 'tpl-2', name: 'Avaliação trimestral' });
  });

  it('loads a new version again after the route visited another template and came back', async () => {
    mockSaveCreatesVersion();
    const { result, rerender } = await renderEditor('tpl-2');
    act(() => result.current.setName('Avaliação trimestral'));
    await act(async () => {
      await result.current.save();
    });
    rerender({ id: 'tpl-3' });

    rerender({ id: 'tpl-general' });
    await waitFor(() => expect(result.current.template).toMatchObject({ id: 'tpl-general' }));
    rerender({ id: 'tpl-3' });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.template).toMatchObject({ id: 'tpl-3', name: 'Avaliação trimestral' });
  });
});
