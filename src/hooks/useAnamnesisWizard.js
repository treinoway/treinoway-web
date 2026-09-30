import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  buildAnswersFromResponse,
  buildSubmitPayload,
  flattenQuestions,
  getVisibleQuestionIds,
  getVisibleSectionQuestions,
  getWizardSections,
  isAnswerEmpty,
  summarizeSection,
  validateSection,
} from '../utils/anamnesisAnswers';

const STEP_PARAM = 'step';
const REVIEW_STEP_ID = 'review';
const REVIEW_STEP_TITLE = 'Revisão';
const INVALID_ANSWER_MESSAGE = 'Resposta inválida.';

const omitKeys = (object, keys) => {
  const next = { ...object };
  keys.forEach((key) => delete next[key]);
  return next;
};

// Step lives in the URL (1-based) so browser back/forward moves between steps.
// Without a valid `?step=` the wizard opens at `defaultIndex`.
const useWizardStep = (lastIndex, defaultIndex) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const parsed = parseInt(searchParams.get(STEP_PARAM), 10);
  const stepIndex = Number.isFinite(parsed) ? Math.min(Math.max(parsed - 1, 0), lastIndex) : defaultIndex;
  const goToStep = (index) => setSearchParams({ [STEP_PARAM]: String(index + 1) });
  return { stepIndex, goToStep };
};

const useWizardAnswers = (getInitialAnswers) => {
  const [answers, setAnswers] = useState(getInitialAnswers);
  const [errors, setErrors] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  const setAnswer = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setErrors((prev) => omitKeys(prev, [questionId]));
    setHasChanges(true);
  };

  const replaceErrors = (questionIds, nextErrors) =>
    setErrors((prev) => ({ ...omitKeys(prev, questionIds), ...nextErrors }));

  return { answers, errors, hasChanges, setAnswer, replaceErrors };
};

// A draft resumes at the first section with something left to fix, else at the review.
const getResumeState = (previousResponse, sections, answers, allQuestions) => {
  const hasAnswers = Object.values(answers).some((value) => !isAnswerEmpty(value));
  const isDraft = Boolean(previousResponse) && !previousResponse.submittedAt && hasAnswers;
  if (!isDraft) return { isDraft: false, stepIndex: 0 };
  const firstPending = sections.findIndex(
    (section) => summarizeSection(section, answers, allQuestions).pending > 0,
  );
  return { isDraft: true, stepIndex: firstPending === -1 ? sections.length : firstPending };
};

const buildSteps = (sections) => [
  ...sections.map((section) => ({ id: section.id, title: section.title })),
  { id: REVIEW_STEP_ID, title: REVIEW_STEP_TITLE },
];

const buildSummaries = (sections, answers, allQuestions) =>
  sections.map((section, index) => ({
    id: section.id,
    title: section.title,
    stepIndex: index,
    ...summarizeSection(section, answers, allQuestions),
  }));

const mapServerErrors = (details, visibleIds) => {
  const mapped = {};
  for (const detail of Array.isArray(details) ? details : []) {
    if (detail?.questionId && visibleIds.has(detail.questionId)) {
      mapped[detail.questionId] = detail.message || INVALID_ANSWER_MESSAGE;
    }
  }
  return mapped;
};

const findSectionIndex = (sections, questionId) =>
  sections.findIndex((section) => section.questions.some((question) => question.id === questionId));

const useAnamnesisWizard = ({ anamnesis, previousResponse }) => {
  const sections = getWizardSections(anamnesis);
  const allQuestions = flattenQuestions(sections);
  const { answers, errors, hasChanges, setAnswer, replaceErrors } = useWizardAnswers(() =>
    buildAnswersFromResponse(previousResponse, allQuestions),
  );
  const [resume] = useState(() => getResumeState(previousResponse, sections, answers, allQuestions));
  const { stepIndex, goToStep } = useWizardStep(sections.length, resume.stepIndex);
  const [focusQuestionId, setFocusQuestionId] = useState(null);
  const clearFocusRequest = useCallback(() => setFocusQuestionId(null), []);

  const currentSection = sections[stepIndex] ?? null;
  const visibleIds = getVisibleQuestionIds(allQuestions, answers);
  const visibleQuestions = currentSection ? getVisibleSectionQuestions(currentSection, visibleIds) : [];
  const summaries = buildSummaries(sections, answers, allQuestions);

  const goNext = () => {
    if (!currentSection) return false;
    const sectionErrors = validateSection(currentSection, answers, allQuestions);
    replaceErrors(currentSection.questions.map((question) => question.id), sectionErrors);
    const firstInvalid = currentSection.questions.find((question) => sectionErrors[question.id]);
    if (firstInvalid) {
      setFocusQuestionId(firstInvalid.id);
      return false;
    }
    goToStep(stepIndex + 1);
    return true;
  };

  const goBack = () => stepIndex > 0 && goToStep(stepIndex - 1);

  // Maps backend `details[].questionId` onto visible fields and jumps to the first one.
  const applyServerErrors = (details) => {
    const mapped = mapServerErrors(details, visibleIds);
    const first = allQuestions.find((question) => mapped[question.id]);
    if (!first) return false;
    replaceErrors(Object.keys(mapped), mapped);
    goToStep(findSectionIndex(sections, first.id));
    setFocusQuestionId(first.id);
    return true;
  };

  return {
    steps: buildSteps(sections),
    stepIndex,
    isReview: stepIndex === sections.length,
    isFirstStep: stepIndex === 0,
    currentSection,
    visibleQuestions,
    answers,
    errors,
    summaries,
    hasPending: summaries.some((summary) => summary.pending > 0),
    hasPreviousResponse: Boolean(previousResponse),
    isResumingDraft: resume.isDraft,
    hasChanges,
    focusQuestionId,
    setAnswer,
    goNext,
    goBack,
    goToStep,
    applyServerErrors,
    clearFocusRequest,
    buildPayload: () => buildSubmitPayload(allQuestions, answers),
  };
};

export default useAnamnesisWizard;
