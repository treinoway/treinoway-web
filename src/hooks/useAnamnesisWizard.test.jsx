import { MemoryRouter, useNavigate } from 'react-router-dom';
import { renderHook, act } from '../test/test-utils';
import useAnamnesisWizard from './useAnamnesisWizard';
import { wizardAnamnesis, wizardResponse } from '../test/anamnesisWizardFixtures';

const renderWizard = ({ route = '/answer', previousResponse = null, anamnesis = wizardAnamnesis } = {}) => {
  const wrapper = ({ children }) => <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>;
  return renderHook(
    () => ({
      wizard: useAnamnesisWizard({ anamnesis, previousResponse }),
      navigate: useNavigate(),
    }),
    { wrapper },
  );
};

const answer = (result, questionId, value) =>
  act(() => result.current.wizard.setAnswer(questionId, value));

describe('useAnamnesisWizard', () => {
  it('orders sections, skips empty ones and appends the review step', () => {
    const { result } = renderWizard();
    const { steps, stepIndex, isReview, currentSection } = result.current.wizard;
    expect(steps.map((step) => step.title)).toEqual(['Saúde', 'Rotina', 'Objetivos', 'Revisão']);
    expect(stepIndex).toBe(0);
    expect(isReview).toBe(false);
    expect(currentSection.id).toBe('sec-1');
  });

  it('only exposes visible questions of the current section, ordered', () => {
    const { result } = renderWizard();
    expect(result.current.wizard.visibleQuestions.map((question) => question.id)).toEqual(['q-train']);
    answer(result, 'q-train', 'yes');
    expect(result.current.wizard.visibleQuestions.map((question) => question.id)).toEqual([
      'q-train',
      'q-years',
    ]);
  });

  it('blocks goNext while a required visible question is empty and requests focus', () => {
    const { result } = renderWizard();
    let advanced;
    act(() => { advanced = result.current.wizard.goNext(); });
    expect(advanced).toBe(false);
    expect(result.current.wizard.stepIndex).toBe(0);
    expect(result.current.wizard.errors['q-train']).toBeDefined();
    expect(result.current.wizard.focusQuestionId).toBe('q-train');
  });

  it('advances once the step is valid and clears the error when the answer changes', () => {
    const { result } = renderWizard();
    act(() => { result.current.wizard.goNext(); });
    answer(result, 'q-train', 'no');
    expect(result.current.wizard.errors['q-train']).toBeUndefined();
    let advanced;
    act(() => { advanced = result.current.wizard.goNext(); });
    expect(advanced).toBe(true);
    expect(result.current.wizard.stepIndex).toBe(1);
  });

  it('validates numeric bounds on the current step only', () => {
    const { result } = renderWizard();
    answer(result, 'q-train', 'yes');
    answer(result, 'q-years', '80');
    act(() => { result.current.wizard.goNext(); });
    expect(result.current.wizard.errors['q-years']).toBe('O valor máximo é 50.');
    expect(result.current.wizard.errors['q-shift']).toBeUndefined();
    expect(result.current.wizard.focusQuestionId).toBe('q-years');
  });

  it('goBack never validates', () => {
    const { result } = renderWizard({ route: '/answer?step=2' });
    expect(result.current.wizard.stepIndex).toBe(1);
    act(() => { result.current.wizard.goBack(); });
    expect(result.current.wizard.stepIndex).toBe(0);
    expect(result.current.wizard.errors).toEqual({});
  });

  it('reads the step from the URL and clamps invalid values', () => {
    expect(renderWizard({ route: '/answer?step=3' }).result.current.wizard.stepIndex).toBe(2);
    expect(renderWizard({ route: '/answer?step=99' }).result.current.wizard.isReview).toBe(true);
    expect(renderWizard({ route: '/answer?step=0' }).result.current.wizard.stepIndex).toBe(0);
    expect(renderWizard({ route: '/answer?step=abc' }).result.current.wizard.stepIndex).toBe(0);
  });

  it('keeps steps in history so the browser back returns to the previous step', () => {
    const { result } = renderWizard();
    answer(result, 'q-train', 'no');
    act(() => { result.current.wizard.goNext(); });
    expect(result.current.wizard.stepIndex).toBe(1);
    act(() => { result.current.navigate(-1); });
    expect(result.current.wizard.stepIndex).toBe(0);
  });

  it('keeps a hidden child answer in state but never submits it', () => {
    const { result } = renderWizard();
    answer(result, 'q-train', 'yes');
    answer(result, 'q-years', '5');
    answer(result, 'q-train', 'no');
    expect(result.current.wizard.answers['q-years']).toBe('5');
    expect(result.current.wizard.buildPayload().answers).toEqual([{ questionId: 'q-train', value: 'no' }]);
    answer(result, 'q-train', 'yes');
    expect(result.current.wizard.buildPayload().answers).toEqual([
      { questionId: 'q-train', value: 'yes' },
      { questionId: 'q-years', value: 5 },
    ]);
  });

  it('pre-fills answers from the previous response', () => {
    const { result } = renderWizard({ previousResponse: wizardResponse });
    expect(result.current.wizard.hasPreviousResponse).toBe(true);
    expect(result.current.wizard.answers['q-shift']).toBe('Noite');
    expect(result.current.wizard.hasPending).toBe(false);
  });

  it('reports no previous response when there is none', () => {
    const { result } = renderWizard();
    expect(result.current.wizard.hasPreviousResponse).toBe(false);
  });

  it('summarises sections and flags pending required questions', () => {
    const { result } = renderWizard();
    answer(result, 'q-train', 'no');
    const { summaries, hasPending } = result.current.wizard;
    expect(summaries).toEqual([
      { id: 'sec-1', title: 'Saúde', stepIndex: 0, total: 1, answered: 1, pending: 0 },
      { id: 'sec-2', title: 'Rotina', stepIndex: 1, total: 2, answered: 0, pending: 1 },
      { id: 'sec-3', title: 'Objetivos', stepIndex: 2, total: 2, answered: 0, pending: 1 },
    ]);
    expect(hasPending).toBe(true);
  });

  it('maps backend details to fields and jumps to the step of the first error', () => {
    const { result } = renderWizard({ previousResponse: wizardResponse });
    let handled;
    act(() => {
      handled = result.current.wizard.applyServerErrors([
        { questionId: 'q-goal', message: 'Resposta inválida (goal).' },
        { questionId: 'q-shift', message: 'Turno inválido.' },
      ]);
    });
    expect(handled).toBe(true);
    expect(result.current.wizard.stepIndex).toBe(1);
    expect(result.current.wizard.errors['q-shift']).toBe('Turno inválido.');
    expect(result.current.wizard.errors['q-goal']).toBe('Resposta inválida (goal).');
    expect(result.current.wizard.focusQuestionId).toBe('q-shift');
  });

  it('ignores backend details it cannot show and reports it', () => {
    const { result } = renderWizard();
    let handled;
    act(() => {
      handled = result.current.wizard.applyServerErrors([
        { questionId: 'q-years', message: 'x' },
        { questionId: 'unknown', message: 'y' },
        { message: 'no id' },
      ]);
    });
    expect(handled).toBe(false);
    expect(result.current.wizard.errors).toEqual({});
    expect(result.current.wizard.stepIndex).toBe(0);
  });

  it('clears the focus request', () => {
    const { result } = renderWizard();
    act(() => { result.current.wizard.goNext(); });
    expect(result.current.wizard.focusQuestionId).toBe('q-train');
    act(() => result.current.wizard.clearFocusRequest());
    expect(result.current.wizard.focusQuestionId).toBeNull();
  });

  it('handles an anamnesis without questions', () => {
    const { result } = renderWizard({ anamnesis: { ...wizardAnamnesis, sections: [] } });
    expect(result.current.wizard.steps).toHaveLength(1);
    expect(result.current.wizard.isReview).toBe(true);
    expect(result.current.wizard.buildPayload()).toEqual({ answers: [] });
  });
});
