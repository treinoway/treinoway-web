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
 * Question types that require options (rows/choices).
 */
export const QUESTION_TYPES_WITH_OPTIONS = [
  ANAMNESIS_QUESTION_TYPE.MULTIPLE_CHOICE,
  ANAMNESIS_QUESTION_TYPE.SINGLE_CHOICE,
  ANAMNESIS_QUESTION_TYPE.MATRIX,
];
