import { describe, it, expect } from 'vitest';
import {
  buildNewQuestion,
  buildTemplatePayload,
  generalTemplateIdOf,
  isAtQuestionLimit,
  isTemplateDraftComplete,
  moveQuestion,
  neighbourKeyOf,
  orderTemplateOptions,
  toTemplateDraft,
  updateQuestion,
} from './studentFeedbackTemplate';

// Draft question with every editable field filled; overrides replace any of them
const draftQuestion = (overrides = {}) => ({
  key: 'q-1',
  text: 'Como foi sua adesão ao treino?',
  helpText: 'Considere os últimos 7 dias.',
  type: 'score',
  pillar: 'training_adherence',
  required: true,
  condition: null,
  invertScore: false,
  minLabel: 'Não treinei',
  maxLabel: 'Treinei tudo',
  ...overrides,
});

// Draft questions with the given keys, in that order
const questionsWithKeys = (...keys) => keys.map((key) => draftQuestion({ key, text: `Pergunta ${key}` }));

// The keys of the questions, in order
const keysOf = (questions) => questions.map((question) => question.key);

// What a save sends for one draft question
const payloadOf = (question) => buildTemplatePayload({ name: 'Modelo', questions: [question] }).questions[0];

describe('orderTemplateOptions', () => {
  const GENERAL = { id: 'tpl-general', name: 'Padrão TeuFit', isGeneral: true };
  const MONTHLY = { id: 'tpl-2', name: 'Avaliação mensal', isGeneral: false };
  const QUICK = { id: 'tpl-5', name: 'Check rápido', isGeneral: false };

  it('puts the general template first and keeps the others in the order given', () => {
    expect(orderTemplateOptions([QUICK, GENERAL, MONTHLY])).toEqual([GENERAL, QUICK, MONTHLY]);
  });

  it('keeps a list that already has the general template first', () => {
    expect(orderTemplateOptions([GENERAL, MONTHLY, QUICK])).toEqual([GENERAL, MONTHLY, QUICK]);
  });

  it('keeps the order of a list with no general template', () => {
    expect(orderTemplateOptions([QUICK, MONTHLY])).toEqual([QUICK, MONTHLY]);
  });

  it('answers an empty list for an empty list', () => {
    expect(orderTemplateOptions([])).toEqual([]);
  });

  it('does not change the list it was given', () => {
    const templates = [QUICK, GENERAL];
    orderTemplateOptions(templates);

    expect(templates).toEqual([QUICK, GENERAL]);
  });
});

describe('generalTemplateIdOf', () => {
  it('answers the id of the general template', () => {
    expect(generalTemplateIdOf([{ id: 'tpl-2', isGeneral: false }, { id: 'tpl-general', isGeneral: true }])).toBe('tpl-general');
  });

  it('answers null when the list has no general template', () => {
    expect(generalTemplateIdOf([{ id: 'tpl-2', isGeneral: false }])).toBeNull();
    expect(generalTemplateIdOf([])).toBeNull();
  });
});

describe('toTemplateDraft', () => {
  const API_QUESTION = {
    id: 'q-9',
    order: 1,
    text: 'Como você dormiu?',
    helpText: null,
    type: 'stars',
    typeLabel: 'Estrelas',
    pillar: 'sleep',
    pillarLabel: 'Sono',
    required: false,
    condition: 'has_meal_plan',
    invertScore: true,
    minLabel: null,
    maxLabel: null,
  };

  it('copies the name and each question under its id as key, with empty strings for the missing texts', () => {
    const draft = toTemplateDraft({ id: 'tpl-2', name: 'Avaliação mensal', version: 2, questions: [API_QUESTION] });

    expect(draft).toEqual({
      name: 'Avaliação mensal',
      questions: [
        { key: 'q-9', text: 'Como você dormiu?', helpText: '', type: 'stars', pillar: 'sleep', required: false, condition: 'has_meal_plan', invertScore: true, minLabel: '', maxLabel: '' },
      ],
    });
  });

  it('keeps the help text and the end labels the API sent', () => {
    const [question] = toTemplateDraft({ name: 'x', questions: [{ ...API_QUESTION, type: 'score', helpText: 'Ajuda', minLabel: 'Mal', maxLabel: 'Bem' }] }).questions;

    expect(question).toMatchObject({ helpText: 'Ajuda', minLabel: 'Mal', maxLabel: 'Bem' });
  });

  it('turns a missing condition into null', () => {
    const withoutCondition = { ...API_QUESTION };
    delete withoutCondition.condition;

    expect(toTemplateDraft({ name: 'x', questions: [withoutCondition] }).questions[0].condition).toBeNull();
  });

  it('keeps the questions in the order received', () => {
    const draft = toTemplateDraft({ name: 'x', questions: [{ ...API_QUESTION, id: 'b' }, { ...API_QUESTION, id: 'a' }] });

    expect(keysOf(draft.questions)).toEqual(['b', 'a']);
  });
});

describe('buildNewQuestion', () => {
  it('builds a blank required score question of the pillar "other" under the given key', () => {
    expect(buildNewQuestion('new-1')).toEqual({
      key: 'new-1',
      text: '',
      helpText: '',
      type: 'score',
      pillar: 'other',
      required: true,
      condition: null,
      invertScore: false,
      minLabel: '',
      maxLabel: '',
    });
  });
});

describe('buildTemplatePayload', () => {
  it('sends the trimmed name and the questions in list order', () => {
    const payload = buildTemplatePayload({ name: '  Avaliação mensal  ', questions: questionsWithKeys('b', 'a', 'c') });

    expect(payload.name).toBe('Avaliação mensal');
    expect(payload.questions.map((question) => question.text)).toEqual(['Pergunta b', 'Pergunta a', 'Pergunta c']);
  });

  it('sends exactly the fields a save accepts, without the list key', () => {
    expect(payloadOf(draftQuestion())).toEqual({
      text: 'Como foi sua adesão ao treino?',
      helpText: 'Considere os últimos 7 dias.',
      type: 'score',
      pillar: 'training_adherence',
      required: true,
      condition: null,
      invertScore: false,
      minLabel: 'Não treinei',
      maxLabel: 'Treinei tudo',
    });
  });

  it('trims the question text, the help text and the end labels', () => {
    const payload = payloadOf(draftQuestion({ text: '  Dormiu bem?  ', helpText: '  Pense na semana.  ', minLabel: ' Mal ', maxLabel: ' Bem ' }));

    expect(payload).toMatchObject({ text: 'Dormiu bem?', helpText: 'Pense na semana.', minLabel: 'Mal', maxLabel: 'Bem' });
  });

  it('sends null for a blank help text and blank end labels', () => {
    const payload = payloadOf(draftQuestion({ helpText: '   ', minLabel: '', maxLabel: '  ' }));

    expect(payload.helpText).toBeNull();
    expect(payload.minLabel).toBeNull();
    expect(payload.maxLabel).toBeNull();
  });

  it('keeps the end labels on a score question', () => {
    expect(payloadOf(draftQuestion({ type: 'score' }))).toMatchObject({ minLabel: 'Não treinei', maxLabel: 'Treinei tudo' });
  });

  it.each(['stars', 'open'])('drops the end labels typed before the question became "%s"', (type) => {
    const payload = payloadOf(draftQuestion({ type }));

    expect(payload.minLabel).toBeNull();
    expect(payload.maxLabel).toBeNull();
  });

  it('forces the inverted score off on an open question', () => {
    expect(payloadOf(draftQuestion({ type: 'open', invertScore: true })).invertScore).toBe(false);
  });

  it.each(['score', 'stars'])('keeps the inverted score on a "%s" question', (type) => {
    expect(payloadOf(draftQuestion({ type, invertScore: true })).invertScore).toBe(true);
    expect(payloadOf(draftQuestion({ type, invertScore: false })).invertScore).toBe(false);
  });

  it('sends the condition, the pillar and the required flag as they are', () => {
    const payload = payloadOf(draftQuestion({ condition: 'has_meal_plan', pillar: 'diet_adherence', required: false }));

    expect(payload).toMatchObject({ condition: 'has_meal_plan', pillar: 'diet_adherence', required: false });
  });

  it('does not change the draft', () => {
    const draft = { name: ' Nome ', questions: [draftQuestion({ type: 'open', invertScore: true, text: ' a ' })] };
    const before = JSON.parse(JSON.stringify(draft));
    buildTemplatePayload(draft);

    expect(draft).toEqual(before);
  });
});

describe('isTemplateDraftComplete', () => {
  it('accepts a draft with a name and a text on every question', () => {
    expect(isTemplateDraftComplete({ name: 'Modelo', questions: questionsWithKeys('a', 'b') })).toBe(true);
  });

  it.each(['', '   '])('refuses the name "%s"', (name) => {
    expect(isTemplateDraftComplete({ name, questions: questionsWithKeys('a') })).toBe(false);
  });

  it('refuses a draft with no question', () => {
    expect(isTemplateDraftComplete({ name: 'Modelo', questions: [] })).toBe(false);
  });

  it.each(['', '   '])('refuses a draft where one question has the text "%s"', (text) => {
    const questions = [...questionsWithKeys('a', 'b'), draftQuestion({ key: 'c', text })];

    expect(isTemplateDraftComplete({ name: 'Modelo', questions })).toBe(false);
  });

  it('does not ask for a help text or end labels', () => {
    const questions = [draftQuestion({ helpText: '', minLabel: '', maxLabel: '' })];

    expect(isTemplateDraftComplete({ name: 'Modelo', questions })).toBe(true);
  });

  it('refuses a draft whose only question is shown only to a student with a meal plan', () => {
    const questions = [draftQuestion({ condition: 'has_meal_plan' })];

    expect(isTemplateDraftComplete({ name: 'Modelo', questions })).toBe(false);
  });

  it('refuses a draft where every question is shown only to a student with a meal plan', () => {
    const questions = questionsWithKeys('a', 'b', 'c').map((question) => ({ ...question, condition: 'has_meal_plan' }));

    expect(isTemplateDraftComplete({ name: 'Modelo', questions })).toBe(false);
  });

  it.each([0, 1, 2])('accepts a draft where only the question at index %i has no condition', (index) => {
    const questions = questionsWithKeys('a', 'b', 'c').map((question, position) => ({ ...question, condition: position === index ? null : 'has_meal_plan' }));

    expect(isTemplateDraftComplete({ name: 'Modelo', questions })).toBe(true);
  });
});

// As many keys as asked, to build lists of a given size
const keys = (count) => Array.from({ length: count }, (_, index) => `q-${index}`);

describe('isAtQuestionLimit', () => {
  it('is false below 15 questions', () => {
    expect(isAtQuestionLimit([])).toBe(false);
    expect(isAtQuestionLimit(questionsWithKeys(...keys(14)))).toBe(false);
  });

  it('is true at 15 questions and above', () => {
    expect(isAtQuestionLimit(questionsWithKeys(...keys(15)))).toBe(true);
    expect(isAtQuestionLimit(questionsWithKeys(...keys(16)))).toBe(true);
  });
});

describe('moveQuestion', () => {
  const QUESTIONS = questionsWithKeys('a', 'b', 'c');

  it('swaps a question with the one below it', () => {
    expect(keysOf(moveQuestion(QUESTIONS, 0, 1))).toEqual(['b', 'a', 'c']);
  });

  it('swaps a question with the one above it', () => {
    expect(keysOf(moveQuestion(QUESTIONS, 2, -1))).toEqual(['a', 'c', 'b']);
  });

  it('leaves the list as it is when the first question goes up', () => {
    expect(moveQuestion(QUESTIONS, 0, -1)).toBe(QUESTIONS);
  });

  it('leaves the list as it is when the last question goes down', () => {
    expect(moveQuestion(QUESTIONS, 2, 1)).toBe(QUESTIONS);
  });

  it('leaves a list of one question as it is in both directions', () => {
    const single = questionsWithKeys('a');

    expect(moveQuestion(single, 0, -1)).toBe(single);
    expect(moveQuestion(single, 0, 1)).toBe(single);
  });

  it('answers a new list and does not change the one given', () => {
    const moved = moveQuestion(QUESTIONS, 1, 1);

    expect(moved).not.toBe(QUESTIONS);
    expect(keysOf(QUESTIONS)).toEqual(['a', 'b', 'c']);
  });

  it('moving down and back up restores the order', () => {
    expect(keysOf(moveQuestion(moveQuestion(QUESTIONS, 1, 1), 2, -1))).toEqual(['a', 'b', 'c']);
  });
});

describe('updateQuestion', () => {
  const QUESTIONS = questionsWithKeys('a', 'b');

  it('applies the changes to the question under the key and keeps its other fields', () => {
    const [first, second] = updateQuestion(QUESTIONS, 'b', { text: 'Novo texto', required: false });

    expect(first).toBe(QUESTIONS[0]);
    expect(second).toEqual({ ...QUESTIONS[1], text: 'Novo texto', required: false });
  });

  it('changes nothing for a key that is not in the list', () => {
    expect(updateQuestion(QUESTIONS, 'zzz', { text: 'x' })).toEqual(QUESTIONS);
  });
});

describe('neighbourKeyOf', () => {
  const QUESTIONS = questionsWithKeys('a', 'b', 'c');

  it('answers the question after the first one', () => {
    expect(neighbourKeyOf(QUESTIONS, 'a')).toBe('b');
  });

  it('answers the question after a middle one', () => {
    expect(neighbourKeyOf(QUESTIONS, 'b')).toBe('c');
  });

  it('answers the question before the last one', () => {
    expect(neighbourKeyOf(QUESTIONS, 'c')).toBe('b');
  });

  it('answers null for the only question of the list', () => {
    expect(neighbourKeyOf(questionsWithKeys('a'), 'a')).toBeNull();
  });

  it('answers null for an empty list', () => {
    expect(neighbourKeyOf([], 'a')).toBeNull();
  });
});
