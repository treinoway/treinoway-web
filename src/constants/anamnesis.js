/**
 * Anamnesis question type constants — mirrors backend AnamnesisQuestionType.
 */
export const ANAMNESIS_QUESTION_TYPE = {
  FREE_TEXT: 'free_text',
  DICHOTOMOUS: 'dichotomous',
  MULTIPLE_CHOICE: 'multiple_choice',
  NUMERIC: 'numeric',
  SINGLE_CHOICE: 'single_choice',
  MATRIX: 'matrix',
};

/**
 * Types that can still be authored. MATRIX is legacy: it stays readable
 * (labels, wizard, dossier, preview) but the backend rejects creating it.
 */
export const CREATABLE_QUESTION_TYPES = [
  ANAMNESIS_QUESTION_TYPE.FREE_TEXT,
  ANAMNESIS_QUESTION_TYPE.DICHOTOMOUS,
  ANAMNESIS_QUESTION_TYPE.SINGLE_CHOICE,
  ANAMNESIS_QUESTION_TYPE.MULTIPLE_CHOICE,
  ANAMNESIS_QUESTION_TYPE.NUMERIC,
];

/**
 * Anamnesis response lifecycle and authorship — mirrors the backend values.
 */
export const ANAMNESIS_RESPONSE_STATUS = {
  DRAFT: 'draft',
  AWAITING_CONFIRMATION: 'awaiting_confirmation',
  SUBMITTED: 'submitted',
};

export const ANAMNESIS_FILLED_BY = {
  STUDENT: 'student',
  TRAINER: 'trainer',
};

/**
 * Autosave indicator states of the answer wizard.
 */
export const DRAFT_SAVE_STATUS = { IDLE: 'idle', SAVING: 'saving', SAVED: 'saved', ERROR: 'error' };

export const ANAMNESIS_FILL_TOAST_DURATION_MS = 8000;

export const getAnamnesisFillPath = (studentId, anamnesisId) =>
  `/trainer/students/${studentId}/anamneses/${anamnesisId}/fill`;

/**
 * Returns a pt-BR label for an anamnesis question type.
 * @param {string} type
 * @returns {string}
 */
export function getQuestionTypeLabel(type) {
  switch (type) {
    case ANAMNESIS_QUESTION_TYPE.FREE_TEXT: return 'Texto livre';
    case ANAMNESIS_QUESTION_TYPE.DICHOTOMOUS: return 'Sim/Não';
    case ANAMNESIS_QUESTION_TYPE.MULTIPLE_CHOICE: return 'Múltipla escolha';
    case ANAMNESIS_QUESTION_TYPE.NUMERIC: return 'Numérico';
    case ANAMNESIS_QUESTION_TYPE.SINGLE_CHOICE: return 'Escolha única';
    case ANAMNESIS_QUESTION_TYPE.MATRIX: return 'Matriz';
    default: return type ?? '—';
  }
}

/**
 * Question types that require options (choices).
 */
export const QUESTION_TYPES_WITH_OPTIONS = [
  ANAMNESIS_QUESTION_TYPE.MULTIPLE_CHOICE,
  ANAMNESIS_QUESTION_TYPE.SINGLE_CHOICE,
];

/**
 * Condition operators supported by the backend for conditional visibility.
 */
export const ANAMNESIS_CONDITION_OPERATOR = {
  EQUALS: 'equals',
  INCLUDES_ANY: 'includesAny',
};

/**
 * Question types allowed as the *parent* in a conditional link.
 * FREE_TEXT / NUMERIC / MATRIX are not meaningful triggers in v1.
 */
export const ANAMNESIS_PARENT_ELIGIBLE_TYPES = [
  ANAMNESIS_QUESTION_TYPE.DICHOTOMOUS,
  ANAMNESIS_QUESTION_TYPE.SINGLE_CHOICE,
  ANAMNESIS_QUESTION_TYPE.MULTIPLE_CHOICE,
];

/**
 * Pure predicate: should this question be visible given the current answers?
 *
 * Rules (mirrors backend):
 *  - No parent → always visible.
 *  - Parent unanswered (undefined, null, '', or empty array) → hidden.
 *  - operator === 'equals' with `value`   → parent raw answer must strictly equal `value`.
 *  - operator === 'equals' with `optionId`→ parent raw answer must strictly equal `optionId`.
 *  - operator === 'includesAny' with `optionIds` → parent answer (array) must include at least one `optionId`.
 *  - Any malformed / unknown condition → hidden (fail-closed).
 *
 * @param {object} question
 * @param {object} answersByQuestionId  plain object keyed by questionId
 * @returns {boolean}
 */
export function isQuestionVisible(question, answersByQuestionId) {
  if (!question?.parentQuestionId) return true;

  const condition = question.condition;
  if (!condition || typeof condition !== 'object') return false;

  const parentAnswer = answersByQuestionId?.[question.parentQuestionId];
  if (parentAnswer === undefined || parentAnswer === null || parentAnswer === '') return false;
  if (Array.isArray(parentAnswer) && parentAnswer.length === 0) return false;

  if (condition.operator === ANAMNESIS_CONDITION_OPERATOR.EQUALS) {
    if (condition.optionId !== undefined) {
      return parentAnswer === condition.optionId;
    }
    if (condition.value !== undefined) {
      return parentAnswer === condition.value;
    }
    return false;
  }

  if (condition.operator === ANAMNESIS_CONDITION_OPERATOR.INCLUDES_ANY) {
    if (!Array.isArray(condition.optionIds) || condition.optionIds.length === 0) return false;
    if (!Array.isArray(parentAnswer)) return false;
    return condition.optionIds.some((optId) => parentAnswer.includes(optId));
  }

  return false;
}

/**
 * Returns a blank question form object.
 * @returns {object}
 */
export const defaultQuestionForm = () => ({
  text: '',
  type: ANAMNESIS_QUESTION_TYPE.FREE_TEXT,
  required: false,
  order: 0,
  config: null,
  options: [],
  parentQuestionId: null,
  condition: null,
});

/**
 * Returns a blank section form object.
 * @returns {object}
 */
export const defaultSectionForm = () => ({
  title: '',
  description: '',
  order: 0,
});
