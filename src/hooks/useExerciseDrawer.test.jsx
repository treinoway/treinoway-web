import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '../test/test-utils';
import useExerciseDrawer from './useExerciseDrawer';

const EXERCISE = { id: 'ex-1', name: 'Supino reto' };

let routine;
let onMutate;
let onExerciseCreated;

// Renders the hook with fresh mocks for the routine mutations.
const setup = () => renderHook(() => useExerciseDrawer({ routine, onMutate, onExerciseCreated }));

describe('useExerciseDrawer', () => {
  beforeEach(() => {
    routine = {
      addExercise: vi.fn().mockResolvedValue({ id: 'ex-new' }),
      updateExercise: vi.fn().mockResolvedValue({}),
      addExerciseFromTemplate: vi.fn().mockResolvedValue({}),
      deleteExercise: vi.fn().mockResolvedValue(undefined),
    };
    onMutate = vi.fn();
    onExerciseCreated = vi.fn();
  });

  it('starts closed', () => {
    const { result } = setup();
    expect(result.current.target).toBeNull();
  });

  it('openAdd targets a training with no exercise', () => {
    const { result } = setup();
    act(() => result.current.openAdd('t1'));
    expect(result.current.target).toEqual({ trainingId: 't1', exercise: null });
  });

  it('openEdit targets a training and exercise', () => {
    const { result } = setup();
    act(() => result.current.openEdit('t1', EXERCISE));
    expect(result.current.target).toEqual({ trainingId: 't1', exercise: EXERCISE });
  });

  it('close resets the target', () => {
    const { result } = setup();
    act(() => result.current.openAdd('t1'));
    act(() => result.current.close());
    expect(result.current.target).toBeNull();
  });

  it('handleCreate adds the exercise, marks the screen touched, closes and reports the created exercise', async () => {
    const { result } = setup();
    act(() => result.current.openAdd('t1'));
    await act(() => result.current.handleCreate({ name: 'Leg press' }));
    expect(onMutate).toHaveBeenCalled();
    expect(routine.addExercise).toHaveBeenCalledWith('t1', { name: 'Leg press' });
    expect(onExerciseCreated).toHaveBeenCalledWith({ id: 'ex-new' });
    expect(result.current.target).toBeNull();
  });

  it('handleEdit updates the exercise and closes', async () => {
    const { result } = setup();
    act(() => result.current.openEdit('t1', EXERCISE));
    await act(() => result.current.handleEdit('ex-1', { name: 'Supino inclinado' }));
    expect(routine.updateExercise).toHaveBeenCalledWith('t1', 'ex-1', { name: 'Supino inclinado' });
    expect(result.current.target).toBeNull();
  });

  it('handleImport adds templates sequentially in selection order and closes', async () => {
    const order = [];
    let releaseFirst;
    routine.addExerciseFromTemplate = vi.fn((_trainingId, templateId) => {
      order.push(`start-${templateId}`);
      if (templateId === 'A') {
        return new Promise((resolve) => {
          releaseFirst = () => { order.push('end-A'); resolve({ id: 'A' }); };
        });
      }
      order.push(`end-${templateId}`);
      return Promise.resolve({ id: templateId });
    });
    const { result } = setup();
    act(() => result.current.openAdd('t1'));
    let pending;
    act(() => { pending = result.current.handleImport(['A', 'C', 'B'], { A: { id: 'A' } }); });
    expect(order).toEqual(['start-A']);
    await act(async () => { releaseFirst(); await pending; });
    expect(order).toEqual(['start-A', 'end-A', 'start-C', 'end-C', 'start-B', 'end-B']);
    expect(routine.addExerciseFromTemplate).toHaveBeenCalledWith('t1', 'A', { template: { id: 'A' } });
    expect(result.current.target).toBeNull();
  });

  it('handleDelete closes the drawer and deletes the exercise', async () => {
    const { result } = setup();
    act(() => result.current.openEdit('t1', EXERCISE));
    await act(() => result.current.handleDelete());
    expect(routine.deleteExercise).toHaveBeenCalledWith('t1', 'ex-1');
    expect(result.current.target).toBeNull();
  });

  it('keeps the drawer open when create fails', async () => {
    routine.addExercise.mockRejectedValue(new Error('boom'));
    const { result } = setup();
    act(() => result.current.openAdd('t1'));
    await act(async () => {
      await expect(result.current.handleCreate({ name: 'X' })).rejects.toThrow('boom');
    });
    expect(result.current.target).toEqual({ trainingId: 't1', exercise: null });
    expect(onExerciseCreated).not.toHaveBeenCalled();
  });

  it('keeps the drawer open when edit fails', async () => {
    routine.updateExercise.mockRejectedValue(new Error('boom'));
    const { result } = setup();
    act(() => result.current.openEdit('t1', EXERCISE));
    await act(async () => {
      await expect(result.current.handleEdit('ex-1', {})).rejects.toThrow('boom');
    });
    expect(result.current.target).not.toBeNull();
  });

  it('keeps the drawer open when an import fails midway', async () => {
    routine.addExerciseFromTemplate
      .mockResolvedValueOnce({ id: 'A' })
      .mockRejectedValueOnce(new Error('boom'));
    const { result } = setup();
    act(() => result.current.openAdd('t1'));
    await act(async () => {
      await expect(result.current.handleImport(['A', 'B'], {})).rejects.toThrow('boom');
    });
    expect(result.current.target).not.toBeNull();
  });
});

describe('useExerciseDrawer — handleAddFromTemplate (single add with prescription)', () => {
  const OVERRIDES = { template: { id: 'tmpl-1' }, sets: 5, repetitions: { min: 6, max: 10 }, restInterval: 120 };

  beforeEach(() => {
    routine = {
      addExercise: vi.fn(),
      updateExercise: vi.fn(),
      addExerciseFromTemplate: vi.fn().mockResolvedValue({ id: 'junction-1' }),
      deleteExercise: vi.fn(),
    };
    onMutate = vi.fn();
    onExerciseCreated = vi.fn();
  });

  it('adds the template with the overrides, marks the screen touched, closes and reports the created exercise', async () => {
    const { result } = setup();
    act(() => result.current.openAdd('t1'));

    await act(() => result.current.handleAddFromTemplate('tmpl-1', OVERRIDES));

    expect(onMutate).toHaveBeenCalled();
    expect(routine.addExerciseFromTemplate).toHaveBeenCalledTimes(1);
    expect(routine.addExerciseFromTemplate).toHaveBeenCalledWith('t1', 'tmpl-1', OVERRIDES);
    expect(onExerciseCreated).toHaveBeenCalledWith({ id: 'junction-1' });
    expect(result.current.target).toBeNull();
  });

  it('keeps the drawer open when the add fails', async () => {
    routine.addExerciseFromTemplate.mockRejectedValue(new Error('boom'));
    const { result } = setup();
    act(() => result.current.openAdd('t1'));

    await act(async () => {
      await expect(result.current.handleAddFromTemplate('tmpl-1', OVERRIDES)).rejects.toThrow('boom');
    });

    expect(result.current.target).toEqual({ trainingId: 't1', exercise: null });
    expect(onExerciseCreated).not.toHaveBeenCalled();
  });
});
