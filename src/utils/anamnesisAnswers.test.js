import {
  INVALID_NUMBER_MESSAGE,
  REQUIRED_ERROR_MESSAGE,
  buildAnswersFromResponse,
  buildAnswersMap,
  buildSubmitPayload,
  flattenQuestions,
  getNumericBounds,
  getVisibleQuestionIds,
  getWizardSections,
  isAnswerEmpty,
  isOptionSelected,
  summarizeSection,
  toValueList,
  validateSection,
} from './anamnesisAnswers';

const options = (...texts) => texts.map((text, index) => ({ id: `opt-${text}`, text, order: index }));

const dichotomous = { id: 'q-dich', text: 'Treina?', type: 'dichotomous', required: true, order: 0 };
const yearsChild = {
  id: 'q-years',
  text: 'Há quantos anos?',
  type: 'numeric',
  required: true,
  order: 1,
  config: { min: '1', max: '50', unit: 'anos' },
  parentQuestionId: 'q-dich',
  condition: { operator: 'equals', value: 'yes' },
};
const single = {
  id: 'q-single',
  text: 'Turno?',
  type: 'single_choice',
  required: false,
  order: 2,
  options: options('Manhã', 'Noite'),
};
const multiple = {
  id: 'q-multi',
  text: 'Atividades?',
  type: 'multiple_choice',
  required: false,
  order: 3,
  options: options('Corrida', 'Yoga', 'Natação'),
};
const grandchild = {
  id: 'q-grand',
  text: 'Quais dias?',
  type: 'free_text',
  required: true,
  order: 4,
  parentQuestionId: 'q-years',
  condition: { operator: 'equals', value: '5' },
};
const allQuestions = [dichotomous, yearsChild, single, multiple, grandchild];

describe('isOptionSelected', () => {
  const option = { id: 'opt-1', text: 'Corrida' };

  it('matches by text against a string value', () => {
    expect(isOptionSelected(option, 'Corrida')).toBe(true);
    expect(isOptionSelected(option, 'Yoga')).toBe(false);
  });

  it('matches by text against an array value', () => {
    expect(isOptionSelected(option, ['Yoga', 'Corrida'])).toBe(true);
    expect(isOptionSelected(option, ['Yoga'])).toBe(false);
  });

  it('falls back to matching the option id', () => {
    expect(isOptionSelected(option, 'opt-1')).toBe(true);
    expect(isOptionSelected(option, ['opt-1'])).toBe(true);
  });

  it('is false for empty values', () => {
    expect(isOptionSelected(option, null)).toBe(false);
    expect(isOptionSelected(option, undefined)).toBe(false);
    expect(isOptionSelected(option, '')).toBe(false);
    expect(isOptionSelected(option, [])).toBe(false);
  });

  it('does not match an undefined id against an undefined entry', () => {
    expect(isOptionSelected({ text: 'A' }, [undefined])).toBe(false);
  });
});

describe('toValueList', () => {
  it('normalises strings, arrays and empties', () => {
    expect(toValueList('a')).toEqual(['a']);
    expect(toValueList(['a', 'b'])).toEqual(['a', 'b']);
    expect(toValueList(null)).toEqual([]);
    expect(toValueList('')).toEqual([]);
  });
});

describe('isAnswerEmpty', () => {
  it.each([undefined, null, '', '   ', []])('treats %j as empty', (value) => {
    expect(isAnswerEmpty(value)).toBe(true);
  });

  it.each(['a', 0, false, ['a'], '0'])('treats %j as answered', (value) => {
    expect(isAnswerEmpty(value)).toBe(false);
  });
});

describe('getNumericBounds', () => {
  it('converts string bounds to numbers', () => {
    expect(getNumericBounds({ min: '1', max: '10.5' })).toEqual({ min: 1, max: 10.5 });
  });

  it('ignores empty, missing and NaN bounds', () => {
    expect(getNumericBounds({ min: '', max: 'abc' })).toEqual({ min: undefined, max: undefined });
    expect(getNumericBounds(null)).toEqual({ min: undefined, max: undefined });
  });

  it('keeps a zero bound', () => {
    expect(getNumericBounds({ min: 0, max: '0' })).toEqual({ min: 0, max: 0 });
  });
});

describe('buildAnswersMap', () => {
  it('translates single-choice text to the option id', () => {
    const map = buildAnswersMap({ 'q-single': 'Noite' }, allQuestions);
    expect(map['q-single']).toBe('opt-Noite');
  });

  it('translates multiple-choice texts to option ids', () => {
    const map = buildAnswersMap({ 'q-multi': ['Corrida', 'Natação'] }, allQuestions);
    expect(map['q-multi']).toEqual(['opt-Corrida', 'opt-Natação']);
  });

  it('keeps unknown texts as is and passes other types through', () => {
    const map = buildAnswersMap({ 'q-single': 'Removida', 'q-dich': 'yes' }, allQuestions);
    expect(map['q-single']).toBe('Removida');
    expect(map['q-dich']).toBe('yes');
  });

  it('skips unanswered questions', () => {
    expect(buildAnswersMap({}, allQuestions)).toEqual({});
  });
});

describe('getVisibleQuestionIds', () => {
  it('hides children until the parent matches', () => {
    expect(getVisibleQuestionIds(allQuestions, {}).has('q-years')).toBe(false);
    expect(getVisibleQuestionIds(allQuestions, { 'q-dich': 'yes' }).has('q-years')).toBe(true);
    expect(getVisibleQuestionIds(allQuestions, { 'q-dich': 'no' }).has('q-years')).toBe(false);
  });

  it('hides grandchildren when the middle parent is hidden but still holds a stale answer', () => {
    const answers = { 'q-dich': 'no', 'q-years': '5' };
    expect(getVisibleQuestionIds(allQuestions, answers).has('q-grand')).toBe(false);
    const visible = getVisibleQuestionIds(allQuestions, { 'q-dich': 'yes', 'q-years': '5' });
    expect(visible.has('q-grand')).toBe(true);
  });

  it('does not loop on circular parent references', () => {
    const a = { id: 'a', type: 'free_text', parentQuestionId: 'b', condition: { operator: 'equals', value: 'x' } };
    const b = { id: 'b', type: 'free_text', parentQuestionId: 'a', condition: { operator: 'equals', value: 'x' } };
    const visible = getVisibleQuestionIds([a, b], { a: 'x', b: 'x' });
    expect(visible.size).toBe(0);
  });
});

describe('getWizardSections / flattenQuestions', () => {
  it('sorts sections and questions, dropping sections without questions', () => {
    const anamnesis = {
      sections: [
        { id: 's2', title: 'B', order: 1, questions: [{ id: 'b2', order: 1 }, { id: 'b1', order: 0 }] },
        { id: 's-empty', title: 'Vazia', order: 2, questions: [] },
        { id: 's1', title: 'A', order: 0, questions: [{ id: 'a1', order: 0 }] },
      ],
    };
    const sections = getWizardSections(anamnesis);
    expect(sections.map((section) => section.id)).toEqual(['s1', 's2']);
    expect(flattenQuestions(sections).map((question) => question.id)).toEqual(['a1', 'b1', 'b2']);
  });

  it('handles a missing anamnesis', () => {
    expect(getWizardSections(null)).toEqual([]);
  });
});

describe('buildAnswersFromResponse', () => {
  const response = {
    answers: [
      { questionId: 'q-dich', value: 'yes' },
      { questionId: 'q-single', value: 'Removida' },
      { questionId: 'q-multi', value: ['Corrida', 'Removida'] },
      { questionId: 'q-unknown', value: 'x' },
    ],
  };

  it('maps answers by question id and ignores unknown questions', () => {
    const answers = buildAnswersFromResponse(response, allQuestions);
    expect(answers['q-dich']).toBe('yes');
    expect(answers).not.toHaveProperty('q-unknown');
  });

  it('drops choice values that no longer match a current option', () => {
    const answers = buildAnswersFromResponse(response, allQuestions);
    expect(answers['q-single']).toBeUndefined();
    expect(answers['q-multi']).toEqual(['Corrida']);
  });

  it('turns a lone multiple-choice string into an array', () => {
    const answers = buildAnswersFromResponse(
      { answers: [{ questionId: 'q-multi', value: 'Yoga' }] },
      allQuestions,
    );
    expect(answers['q-multi']).toEqual(['Yoga']);
  });

  it('returns an empty map without a response', () => {
    expect(buildAnswersFromResponse(null, allQuestions)).toEqual({});
  });
});

describe('validateSection', () => {
  const section = { id: 's1', questions: allQuestions };

  it('flags required visible questions that are empty', () => {
    expect(validateSection(section, {}, allQuestions)).toEqual({ 'q-dich': REQUIRED_ERROR_MESSAGE });
  });

  it('ignores hidden required questions', () => {
    const errors = validateSection(section, { 'q-dich': 'no' }, allQuestions);
    expect(errors).toEqual({});
  });

  it('requires the child once it becomes visible', () => {
    const errors = validateSection(section, { 'q-dich': 'yes' }, allQuestions);
    expect(errors).toEqual({ 'q-years': REQUIRED_ERROR_MESSAGE });
  });

  it('validates numeric bounds converted with Number()', () => {
    const base = { 'q-dich': 'yes' };
    expect(validateSection(section, { ...base, 'q-years': '0' }, allQuestions)['q-years']).toBe('O valor mínimo é 1.');
    expect(validateSection(section, { ...base, 'q-years': '51' }, allQuestions)['q-years']).toBe('O valor máximo é 50.');
    expect(validateSection(section, { ...base, 'q-years': '10' }, allQuestions)).toEqual({});
  });

  it('rejects non-numeric input on a numeric question', () => {
    const errors = validateSection(section, { 'q-dich': 'yes', 'q-years': 'abc' }, allQuestions);
    expect(errors['q-years']).toBe(INVALID_NUMBER_MESSAGE);
  });

  it('ignores empty bounds', () => {
    const open = { ...yearsChild, config: { min: '', max: '' } };
    const questions = [dichotomous, open];
    const errors = validateSection({ questions }, { 'q-dich': 'yes', 'q-years': '-500' }, questions);
    expect(errors).toEqual({});
  });

  it('does not require optional questions but still checks their range', () => {
    const optional = { ...yearsChild, required: false, parentQuestionId: null, condition: null };
    expect(validateSection({ questions: [optional] }, {}, [optional])).toEqual({});
    expect(validateSection({ questions: [optional] }, { 'q-years': '99' }, [optional])['q-years']).toBeDefined();
  });

  it('only reports the questions of the given section', () => {
    const errors = validateSection({ questions: [single] }, {}, allQuestions);
    expect(errors).toEqual({});
  });
});

describe('summarizeSection', () => {
  const section = { id: 's1', questions: allQuestions };

  it('counts only visible questions', () => {
    expect(summarizeSection(section, { 'q-dich': 'no' }, allQuestions)).toEqual({
      total: 3,
      answered: 1,
      pending: 0,
    });
  });

  it('counts required pending questions once they are visible', () => {
    expect(summarizeSection(section, { 'q-dich': 'yes' }, allQuestions)).toEqual({
      total: 4,
      answered: 1,
      pending: 1,
    });
  });
});

describe('buildSubmitPayload', () => {
  it('sends only visible, non-empty answers', () => {
    const answers = {
      'q-dich': 'no',
      'q-years': '5',
      'q-single': '',
      'q-multi': [],
    };
    expect(buildSubmitPayload(allQuestions, answers)).toEqual({
      answers: [{ questionId: 'q-dich', value: 'no' }],
    });
  });

  it('converts numeric values with Number() and keeps choice texts', () => {
    const answers = {
      'q-dich': 'yes',
      'q-years': '12.5',
      'q-single': 'Manhã',
      'q-multi': ['Corrida', 'Yoga'],
    };
    expect(buildSubmitPayload(allQuestions, answers)).toEqual({
      answers: [
        { questionId: 'q-dich', value: 'yes' },
        { questionId: 'q-years', value: 12.5 },
        { questionId: 'q-single', value: 'Manhã' },
        { questionId: 'q-multi', value: ['Corrida', 'Yoga'] },
      ],
    });
  });

  it('keeps a zero numeric answer', () => {
    const questions = [{ ...yearsChild, parentQuestionId: null, condition: null }];
    expect(buildSubmitPayload(questions, { 'q-years': '0' }).answers).toEqual([
      { questionId: 'q-years', value: 0 },
    ]);
  });

  it('drops the answer of a hidden grandchild whose parent holds a stale answer', () => {
    const answers = { 'q-dich': 'no', 'q-years': '5', 'q-grand': 'Segunda' };
    expect(buildSubmitPayload(allQuestions, answers).answers).toEqual([
      { questionId: 'q-dich', value: 'no' },
    ]);
  });

  it('follows the order of the given questions', () => {
    const answers = { 'q-multi': ['Yoga'], 'q-dich': 'no' };
    const ids = buildSubmitPayload(allQuestions, answers).answers.map((entry) => entry.questionId);
    expect(ids).toEqual(['q-dich', 'q-multi']);
  });
});
