import { renderHook, act } from '../test/test-utils';
import useAnamnesisSelection from './useAnamnesisSelection';

const anamnesis = {
  sections: [
    { id: 's2', order: 1, questions: [{ id: 'q3' }] },
    { id: 's1', order: 0, questions: [{ id: 'q1' }, { id: 'q2' }] },
  ],
};

describe('useAnamnesisSelection', () => {
  it('auto-selects the first section and its first question', () => {
    const { result } = renderHook(() => useAnamnesisSelection(anamnesis));
    expect(result.current.selectedSectionId).toBe('s1');
    expect(result.current.selectedQuestionId).toBe('q1');
  });

  it('does nothing while there is no anamnesis or no section', () => {
    const { result: none } = renderHook(() => useAnamnesisSelection(null));
    expect(none.current.selectedSectionId).toBeNull();
    const { result: empty } = renderHook(() => useAnamnesisSelection({ sections: [] }));
    expect(empty.current.selectedSectionId).toBeNull();
  });

  it('toggles a section off and clears the question', () => {
    const { result } = renderHook(() => useAnamnesisSelection(anamnesis));
    act(() => result.current.handleSelectSection('s1'));
    expect(result.current.selectedSectionId).toBeNull();
    expect(result.current.selectedQuestionId).toBeNull();
  });

  it('selecting a question notifies the page', () => {
    const onQuestionOpened = vi.fn();
    const { result } = renderHook(() => useAnamnesisSelection(anamnesis, { onQuestionOpened }));
    act(() => result.current.handleSelectQuestion('q3', 's2'));
    expect(result.current.selectedSectionId).toBe('s2');
    expect(result.current.selectedQuestionId).toBe('q3');
    expect(onQuestionOpened).toHaveBeenCalledTimes(1);
  });

  it('steps across sections and stops at the edges', () => {
    const { result } = renderHook(() => useAnamnesisSelection(anamnesis));
    act(() => result.current.handleStepQuestion(-1));
    expect(result.current.selectedQuestionId).toBe('q1');
    act(() => result.current.handleStepQuestion(1));
    act(() => result.current.handleStepQuestion(1));
    expect(result.current.selectedQuestionId).toBe('q3');
    expect(result.current.selectedSectionId).toBe('s2');
    act(() => result.current.handleStepQuestion(1));
    expect(result.current.selectedQuestionId).toBe('q3');
  });
});
