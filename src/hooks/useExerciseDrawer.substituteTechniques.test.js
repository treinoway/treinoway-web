import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// S1 + guard (biset-substitute-revamp): create-mode library substitutes carry the template techniques.

vi.mock('../api/axios', () => ({ default: { post: vi.fn(), patch: vi.fn() } }));

import useExerciseDrawer from './useExerciseDrawer';
import useProtocolBuilder from './useProtocolBuilder';
import api from '../api/axios';
import { useToast } from '../contexts/ToastContext';

vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));

const TECHNIQUES = [
  { id: 'tech-b', name: 'Rest-pause', order: 1 },
  { id: 'tech-a', name: 'Drop set', order: 0 },
];
const TEMPLATE = { id: 'tmpl-1', name: 'Supino', type: 'strength', sets: 4, advancedTechniques: TECHNIQUES };

describe('useExerciseDrawer — substitute from library in create mode', () => {
  const routine = { addLocalSubstitute: vi.fn(), updateLocalSubstitute: vi.fn(), addExerciseFromTemplate: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    routine.addLocalSubstitute.mockResolvedValue({});
  });

  const setup = () => renderHook(() => useExerciseDrawer({
    routine, onMutate: vi.fn(), onExerciseCreated: vi.fn(), localSubstitutes: true,
  }));

  it('local body carries the template advancedTechniques sorted by order', async () => {
    const { result } = setup();
    act(() => result.current.openAddSubstitute('t1', { id: 'p1', name: 'Rosca' }));

    await act(async () => {
      await result.current.handleAddFromTemplate('tmpl-1', { template: TEMPLATE });
    });

    const body = routine.addLocalSubstitute.mock.calls[0][2];
    expect(body.advancedTechniques.map((technique) => technique.id)).toEqual(['tech-a', 'tech-b']);
  });

  it('an explicit technique override from the composer wins over the template list', async () => {
    const { result } = setup();
    act(() => result.current.openAddSubstitute('t1', { id: 'p1', name: 'Rosca' }));

    await act(async () => {
      await result.current.handleAddFromTemplate('tmpl-1', { template: TEMPLATE, advancedTechniques: [], advancedTechniqueIds: [] });
    });

    expect(routine.addLocalSubstitute.mock.calls[0][2].advancedTechniques).toEqual([]);
  });

  it('never imports as a normal exercise while in substitute mode', async () => {
    const { result } = setup();
    act(() => result.current.openAddSubstitute('t1', { id: 'p1', name: 'Rosca' }));

    await act(async () => {
      await result.current.handleImport(['tmpl-1'], { 'tmpl-1': TEMPLATE });
    });

    expect(routine.addExerciseFromTemplate).not.toHaveBeenCalled();
  });
});

describe('local substitute from library keeps techniques through edit and bulk payload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
    api.get = vi.fn().mockResolvedValue({ data: { data: [], total: 0, page: 1, limit: 100 } });
    api.post.mockResolvedValue({ data: { id: 'p1' } });
  });

  it('editing the picked substitute with the composer ids keeps advancedTechniqueIds', async () => {
    const { result: builder } = renderHook(() => useProtocolBuilder('student-1'));
    await act(async () => {});
    let training;
    let principal;
    await act(async () => { training = await builder.current.createTraining({ name: 'A', category: 'strength' }); });
    await act(async () => { principal = await builder.current.addExercise(training.id, { name: 'Rosca', type: 'strength' }); });
    const { result: drawer } = renderHook(() => useExerciseDrawer({
      routine: builder.current, onMutate: vi.fn(), onExerciseCreated: vi.fn(), localSubstitutes: true,
    }));
    act(() => drawer.current.openAddSubstitute(training.id, principal));
    await act(async () => { await drawer.current.handleAddFromTemplate('tmpl-1', { template: TEMPLATE }); });

    const [picked] = builder.current.data.trainings[0].exercises[0].substitutes;
    await act(async () => {
      await builder.current.updateLocalSubstitute(training.id, principal.id, picked.id, {
        sets: 5, advancedTechniqueIds: picked.advancedTechniques.map((technique) => technique.id),
      });
    });
    await act(async () => {
      await builder.current.saveRoutine({ name: 'P', startDate: '2026-05-01' }, builder.current.data.trainings);
    });

    const payload = api.post.mock.calls.find(([url]) => url === '/trainer/protocols/with-trainings')[1];
    expect(payload.trainings[0].exercises[0].substitutes[0]).toMatchObject({
      sets: 5, exerciseTemplateId: 'tmpl-1', advancedTechniqueIds: ['tech-a', 'tech-b'],
    });
  });
});
