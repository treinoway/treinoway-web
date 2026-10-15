import { ANAMNESIS_QUESTION_TYPE, isQuestionVisible } from '../constants/anamnesis';

const CHOICE_TYPES = [
  ANAMNESIS_QUESTION_TYPE.SINGLE_CHOICE,
  ANAMNESIS_QUESTION_TYPE.MULTIPLE_CHOICE,
  ANAMNESIS_QUESTION_TYPE.MATRIX,
];

export const REQUIRED_ERROR_MESSAGE = 'Esta pergunta é obrigatória.';
export const INVALID_NUMBER_MESSAGE = 'Informe um número válido.';

export const sortByOrder = (items) =>
  [...(items ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

export const getQuestionDomId = (questionId) => `anamnesis-question-${questionId}`;

/** Choice answers may be a lone string (old data) or an array. */
export const toValueList = (value) => {
  if (value === null || value === undefined || value === '') return [];
  return Array.isArray(value) ? value : [value];
};

/**
 * Whether an option is selected in a stored answer. Answers are stored as the
 * option text; the id comparison is kept as a forward-compatible fallback.
 */
export const isOptionSelected = (option, value) => {
  const values = toValueList(value);
  if (values.includes(option.text)) return true;
  return option.id !== undefined && values.includes(option.id);
};

export const isAnswerEmpty = (value) => {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
};

const toBound = (raw) => {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/** Numeric config is written by the editor as strings; empty/NaN bounds are ignored. */
export const getNumericBounds = (config) => ({
  min: toBound(config?.min),
  max: toBound(config?.max),
});

/**
 * Build the `answersByQuestionId` map used by `isQuestionVisible`.
 * For single/multiple-choice questions the form stores option *text* as value
 * (backend contract), but conditions reference option *ids* — translate here.
 */
export const buildAnswersMap = (answers, allQuestions) => {
  const findId = (question, text) =>
    (question.options ?? []).find((opt) => opt.text === text)?.id ?? text;
  const map = {};
  for (const question of allQuestions) {
    const raw = answers[question.id];
    if (raw === undefined) continue;
    if (question.type === ANAMNESIS_QUESTION_TYPE.SINGLE_CHOICE && typeof raw === 'string') {
      map[question.id] = findId(question, raw);
    } else if (question.type === ANAMNESIS_QUESTION_TYPE.MULTIPLE_CHOICE && Array.isArray(raw)) {
      map[question.id] = raw.map((text) => findId(question, text));
    } else {
      map[question.id] = raw;
    }
  }
  return map;
};

/**
 * Ids of the questions currently visible. A child is only visible when its
 * parent is visible too, so a stale answer on a hidden parent never keeps its
 * children on screen.
 */
export const getVisibleQuestionIds = (allQuestions, answers) => {
  const answersMap = buildAnswersMap(answers, allQuestions);
  const byId = new Map(allQuestions.map((question) => [question.id, question]));
  const cache = new Map();

  const resolve = (question, trail) => {
    if (cache.has(question.id)) return cache.get(question.id);
    if (trail.has(question.id)) return false;
    trail.add(question.id);
    const parent = byId.get(question.parentQuestionId);
    const visible =
      isQuestionVisible(question, answersMap) && (!parent || resolve(parent, trail));
    cache.set(question.id, visible);
    return visible;
  };

  const visibleIds = new Set();
  for (const question of allQuestions) {
    if (resolve(question, new Set())) visibleIds.add(question.id);
  }
  return visibleIds;
};

/** Sections ordered by `order`, questions ordered by `order`; sections without questions are dropped. */
export const getWizardSections = (anamnesis) =>
  sortByOrder(anamnesis?.sections)
    .map((section) => ({ ...section, questions: sortByOrder(section.questions) }))
    .filter((section) => section.questions.length > 0);

export const flattenQuestions = (sections) => sections.flatMap((section) => section.questions);

const sanitizeStoredValue = (question, value) => {
  if (!CHOICE_TYPES.includes(question.type)) return value;
  const texts = (question.options ?? []).map((option) => option.text);
  const kept = toValueList(value).filter((item) => texts.includes(item));
  if (question.type === ANAMNESIS_QUESTION_TYPE.MULTIPLE_CHOICE) return kept;
  return kept[0];
};

/**
 * Answers keyed by question id from a stored response. Choice values that no
 * longer match a current option (renamed/removed) are dropped so the student
 * answers again instead of silently resubmitting a stale value.
 */
export const buildAnswersFromResponse = (response, allQuestions) => {
  const byId = new Map(allQuestions.map((question) => [question.id, question]));
  const answers = {};
  for (const answer of response?.answers ?? []) {
    const question = byId.get(answer.questionId);
    if (!question) continue;
    answers[question.id] = sanitizeStoredValue(question, answer.value);
  }
  return answers;
};

const validateNumeric = (question, value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return INVALID_NUMBER_MESSAGE;
  const { min, max } = getNumericBounds(question.config);
  if (min !== undefined && number < min) return `O valor mínimo é ${min}.`;
  if (max !== undefined && number > max) return `O valor máximo é ${max}.`;
  return null;
};

/** Error message for a visible question, or null when its answer is acceptable. */
export const validateQuestion = (question, value) => {
  if (isAnswerEmpty(value)) return question.required ? REQUIRED_ERROR_MESSAGE : null;
  if (question.type === ANAMNESIS_QUESTION_TYPE.NUMERIC) return validateNumeric(question, value);
  return null;
};

export const getVisibleSectionQuestions = (section, visibleIds) =>
  section.questions.filter((question) => visibleIds.has(question.id));

/** Errors (`{ [questionId]: message }`) for the visible questions of one section. */
export const validateSection = (section, answers, allQuestions) => {
  const visibleIds = getVisibleQuestionIds(allQuestions, answers);
  const errors = {};
  for (const question of getVisibleSectionQuestions(section, visibleIds)) {
    const message = validateQuestion(question, answers[question.id]);
    if (message) errors[question.id] = message;
  }
  return errors;
};

/** Per-section progress for the review step; counts only visible questions. */
export const summarizeSection = (section, answers, allQuestions) => {
  const visibleIds = getVisibleQuestionIds(allQuestions, answers);
  const visible = getVisibleSectionQuestions(section, visibleIds);
  const answered = visible.filter((question) => !isAnswerEmpty(answers[question.id])).length;
  const pending = visible.filter(
    (question) => validateQuestion(question, answers[question.id]) !== null,
  ).length;
  return { total: visible.length, answered, pending };
};

const toSubmitValue = (question, value) =>
  question.type === ANAMNESIS_QUESTION_TYPE.NUMERIC ? Number(value) : value;

/** Body for the submit endpoint: only visible, non-empty answers. */
export const buildSubmitPayload = (allQuestions, answers) => {
  const visibleIds = getVisibleQuestionIds(allQuestions, answers);
  return {
    answers: allQuestions
      .filter((question) => visibleIds.has(question.id))
      .filter((question) => !isAnswerEmpty(answers[question.id]))
      .map((question) => ({
        questionId: question.id,
        value: toSubmitValue(question, answers[question.id]),
      })),
  };
};

const SECONDS_PER_QUESTION_TYPE = {
  [ANAMNESIS_QUESTION_TYPE.DICHOTOMOUS]: 10,
  [ANAMNESIS_QUESTION_TYPE.SINGLE_CHOICE]: 10,
  [ANAMNESIS_QUESTION_TYPE.MULTIPLE_CHOICE]: 10,
  [ANAMNESIS_QUESTION_TYPE.MATRIX]: 10,
  [ANAMNESIS_QUESTION_TYPE.NUMERIC]: 15,
  [ANAMNESIS_QUESTION_TYPE.FREE_TEXT]: 40,
};

/** Unknown types are answered like free text, so they get the slowest estimate. */
const FALLBACK_SECONDS_PER_QUESTION = SECONDS_PER_QUESTION_TYPE[ANAMNESIS_QUESTION_TYPE.FREE_TEXT];

/**
 * Estimated minutes to answer the given questions: 10 s per closed question,
 * 15 s per numeric, 40 s per free text, rounded up to whole minutes (minimum 1).
 * Returns 0 when there are no questions, so callers can hide the estimate.
 */
export const estimateMinutes = (questions) => {
  const list = questions ?? [];
  if (list.length === 0) return 0;
  const seconds = list.reduce(
    (total, question) =>
      total + (SECONDS_PER_QUESTION_TYPE[question?.type] ?? FALLBACK_SECONDS_PER_QUESTION),
    0,
  );
  return Math.max(1, Math.ceil(seconds / 60));
};
