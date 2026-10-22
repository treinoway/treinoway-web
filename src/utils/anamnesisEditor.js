import {
  ANAMNESIS_CONDITION_OPERATOR,
  ANAMNESIS_PARENT_ELIGIBLE_TYPES,
  ANAMNESIS_QUESTION_TYPE,
  getQuestionTypeLabel,
} from '../constants/anamnesis';

export const sortSections = (sections) =>
  [...(sections ?? [])].sort((a, b) => a.order - b.order);

export const buildAllQuestions = (sections) =>
  sections.flatMap((s) => (s.questions ?? []).map((q) => ({ ...q, sectionId: s.id })));

const LEGACY_MATRIX_LABEL = 'Matriz (descontinuado)';

export const buildTypeEyebrow = (question) => {
  const isLegacyMatrix = question.type === ANAMNESIS_QUESTION_TYPE.MATRIX;
  const typeLabel = (isLegacyMatrix ? LEGACY_MATRIX_LABEL : getQuestionTypeLabel(question.type)).toUpperCase();
  return question.required ? `${typeLabel} · OBRIGATÓRIA` : typeLabel;
};

export const isStudentLinksConflict = (error) =>
  error?.response?.status === 409 &&
  error?.response?.data?.error === 'ANAMNESIS_HAS_STUDENT_LINKS';

/**
 * Eligible parents for conditional visibility: same section, a parent-eligible type,
 * not the question itself and not already conditional (single-level rule).
 */
export const getEligibleParentCandidates = (question, sectionQuestions) =>
  (sectionQuestions ?? []).filter((candidate) =>
    candidate.id !== question.id
    && !candidate.parentQuestionId
    && ANAMNESIS_PARENT_ELIGIBLE_TYPES.includes(candidate.type));

export const hasDependents = (question, sectionQuestions) =>
  (sectionQuestions ?? []).some((q) => q.parentQuestionId === question.id);

/** Default `condition` for a freshly-selected parent of a given type. */
export const buildInitialCondition = (parentQuestion) => {
  if (!parentQuestion) return null;
  switch (parentQuestion.type) {
    case ANAMNESIS_QUESTION_TYPE.DICHOTOMOUS:
      return { operator: ANAMNESIS_CONDITION_OPERATOR.EQUALS, value: 'yes' };
    case ANAMNESIS_QUESTION_TYPE.SINGLE_CHOICE: {
      const firstOptionId = parentQuestion.options?.[0]?.id ?? null;
      return firstOptionId
        ? { operator: ANAMNESIS_CONDITION_OPERATOR.EQUALS, optionId: firstOptionId }
        : null;
    }
    case ANAMNESIS_QUESTION_TYPE.MULTIPLE_CHOICE:
      return { operator: ANAMNESIS_CONDITION_OPERATOR.INCLUDES_ANY, optionIds: [] };
    default:
      return null;
  }
};

/** Resolve what the canvas should show from the current selection. */
export const deriveEditorView = (sortedSections, selectedSectionId, selectedQuestionId) => {
  const selectedSection = sortedSections.find((s) => s.id === selectedSectionId) ?? null;
  const selectedQuestion = (selectedSection?.questions ?? [])
    .find((q) => q.id === selectedQuestionId) ?? null;
  const allQuestions = buildAllQuestions(sortedSections);
  const sectionForQuestion = selectedQuestionId
    ? sortedSections.find((s) => s.questions?.some((q) => q.id === selectedQuestionId))
    : selectedSection;
  const activeSectionId = sectionForQuestion?.id ?? selectedSectionId;
  const activeSection = sortedSections.find((s) => s.id === activeSectionId) ?? null;
  return {
    selectedQuestion,
    allQuestions,
    selectedQuestionIndex: allQuestions.findIndex((q) => q.id === selectedQuestionId),
    activeSectionId,
    activeSection,
    activeSectionHasQuestions: (activeSection?.questions ?? []).length > 0,
  };
};
