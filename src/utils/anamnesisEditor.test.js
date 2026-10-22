import {
  sortSections,
  buildAllQuestions,
  buildTypeEyebrow,
  isStudentLinksConflict,
  getEligibleParentCandidates,
  hasDependents,
  buildInitialCondition,
  deriveEditorView,
} from './anamnesisEditor';

const sections = [
  { id: 's2', order: 1, questions: [{ id: 'q3', text: 'C', type: 'free_text' }] },
  {
    id: 's1',
    order: 0,
    questions: [
      { id: 'q1', text: 'A', type: 'dichotomous' },
      { id: 'q2', text: 'B', type: 'free_text', parentQuestionId: 'q1' },
    ],
  },
];

describe('anamnesisEditor utils', () => {
  it('sorts sections by order without mutating the input', () => {
    expect(sortSections(sections).map((s) => s.id)).toEqual(['s1', 's2']);
    expect(sections[0].id).toBe('s2');
    expect(sortSections(undefined)).toEqual([]);
  });

  it('flattens questions tagging the section id', () => {
    const all = buildAllQuestions(sortSections(sections));
    expect(all.map((q) => [q.id, q.sectionId])).toEqual([['q1', 's1'], ['q2', 's1'], ['q3', 's2']]);
  });

  it('builds the type eyebrow with the required marker', () => {
    expect(buildTypeEyebrow({ type: 'numeric', required: false })).toBe('NUMÉRICO');
    expect(buildTypeEyebrow({ type: 'numeric', required: true })).toBe('NUMÉRICO · OBRIGATÓRIA');
  });

  it('detects only the student-links conflict', () => {
    expect(isStudentLinksConflict({ response: { status: 409, data: { error: 'ANAMNESIS_HAS_STUDENT_LINKS' } } })).toBe(true);
    expect(isStudentLinksConflict({ response: { status: 409, data: { error: 'OTHER' } } })).toBe(false);
    expect(isStudentLinksConflict(undefined)).toBe(false);
  });

  it('lists eligible parents: eligible type, not itself, not already conditional', () => {
    const questions = sections[1].questions;
    expect(getEligibleParentCandidates(questions[1], questions).map((q) => q.id)).toEqual(['q1']);
    expect(getEligibleParentCandidates(questions[0], questions)).toEqual([]);
    expect(hasDependents(questions[0], questions)).toBe(true);
    expect(hasDependents(questions[1], questions)).toBe(false);
  });

  it('builds the initial condition per parent type', () => {
    expect(buildInitialCondition(null)).toBeNull();
    expect(buildInitialCondition({ type: 'dichotomous' })).toEqual({ operator: 'equals', value: 'yes' });
    expect(buildInitialCondition({ type: 'single_choice', options: [{ id: 'o1' }] })).toEqual({ operator: 'equals', optionId: 'o1' });
    expect(buildInitialCondition({ type: 'single_choice', options: [] })).toBeNull();
    expect(buildInitialCondition({ type: 'multiple_choice' })).toEqual({ operator: 'includesAny', optionIds: [] });
    expect(buildInitialCondition({ type: 'free_text' })).toBeNull();
  });

  it('derives the editor view from the selection', () => {
    const sorted = sortSections(sections);
    const view = deriveEditorView(sorted, 's1', 'q2');
    expect(view.selectedQuestion.id).toBe('q2');
    expect(view.selectedQuestionIndex).toBe(1);
    expect(view.allQuestions).toHaveLength(3);
    expect(view.activeSectionId).toBe('s1');
    expect(view.activeSectionHasQuestions).toBe(true);
  });

  it('derives an empty view when nothing is selected', () => {
    const view = deriveEditorView([], null, null);
    expect(view.selectedQuestion).toBeNull();
    expect(view.activeSection).toBeNull();
    expect(view.activeSectionHasQuestions).toBe(false);
  });
});
