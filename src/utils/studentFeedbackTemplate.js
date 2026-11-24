import { FEEDBACK_QUESTION_TYPE, FEEDBACK_TEMPLATE_LIMITS } from '../constants/studentFeedback';

// Trimmed text, or null when nothing is left
const textOrNull = (value) => value.trim() || null;

// Templates with the general one first and the others in the order given
export const orderTemplateOptions = (templates) => [...templates.filter((template) => template.isGeneral), ...templates.filter((template) => !template.isGeneral)];

// Id of the general template in the list, or null when the list has none
export const generalTemplateIdOf = (templates) => templates.find((template) => template.isGeneral)?.id ?? null;

// Editable copy of a question of the API, under a stable list key
const toDraftQuestion = (question) => ({
  key: question.id,
  text: question.text,
  helpText: question.helpText ?? '',
  type: question.type,
  pillar: question.pillar,
  required: question.required,
  condition: question.condition ?? null,
  invertScore: question.invertScore,
  minLabel: question.minLabel ?? '',
  maxLabel: question.maxLabel ?? '',
});

// Editable copy of a template of the API: its name and its questions in order
export const toTemplateDraft = (template) => ({ name: template.name, questions: template.questions.map(toDraftQuestion) });

// Blank question appended by "Adicionar pergunta"
export const buildNewQuestion = (key) => ({
  key,
  text: '',
  helpText: '',
  type: FEEDBACK_QUESTION_TYPE.SCORE,
  pillar: 'other',
  required: true,
  condition: null,
  invertScore: false,
  minLabel: '',
  maxLabel: '',
});

// What a save sends for one question: end labels only on a score, inverted score never on an open one
const toQuestionPayload = (question) => {
  const isScore = question.type === FEEDBACK_QUESTION_TYPE.SCORE;
  return {
    text: question.text.trim(),
    helpText: textOrNull(question.helpText),
    type: question.type,
    pillar: question.pillar,
    required: question.required,
    condition: question.condition,
    invertScore: question.type !== FEEDBACK_QUESTION_TYPE.OPEN && question.invertScore,
    minLabel: isScore ? textOrNull(question.minLabel) : null,
    maxLabel: isScore ? textOrNull(question.maxLabel) : null,
  };
};

// Body of the save: the name and every question in list order
export const buildTemplatePayload = (draft) => ({ name: draft.name.trim(), questions: draft.questions.map(toQuestionPayload) });

// Whether the draft has questions and every one of them is shown only on a condition, leaving a student who does not meet it with nothing to answer
export const hasOnlyConditionalQuestions = (draft) => draft.questions.length > 0 && draft.questions.every((question) => question.condition !== null);

// Whether the draft can be saved: a name, at least one question, a text on each of them and at least one question with no condition
export const isTemplateDraftComplete = (draft) =>
  draft.name.trim() !== '' &&
  draft.questions.length > 0 &&
  draft.questions.every((question) => question.text.trim() !== '') &&
  !hasOnlyConditionalQuestions(draft);

// Whether the draft already has as many questions as a template accepts
export const isAtQuestionLimit = (questions) => questions.length >= FEEDBACK_TEMPLATE_LIMITS.questions;

// Questions with the one at `index` swapped with its neighbour `offset` positions away; unchanged at the edges
export const moveQuestion = (questions, index, offset) => {
  const target = index + offset;
  if (target < 0 || target >= questions.length) return questions;
  const next = [...questions];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

// Questions with the given changes applied to the one under `key`
export const updateQuestion = (questions, key, changes) => questions.map((question) => (question.key === key ? { ...question, ...changes } : question));

// Key to select after the question under `key` is removed: the one after it, else the one before it
export const neighbourKeyOf = (questions, key) => {
  const index = questions.findIndex((question) => question.key === key);
  return (questions[index + 1] ?? questions[index - 1])?.key ?? null;
};
