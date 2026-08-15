import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useProtocolDraft from './useProtocolDraft';

const STUDENT_ID = 'student-1';
const DRAFT_KEY = `treinoway:protocol-builder-draft:${STUDENT_ID}`;
const DRAFT_VERSION = 1;

const TRAINING = {
  id: 'tmp_1',
  name: 'Peito',
  category: 'strength',
  weekDay: null,
  exercises: [{ id: 'tmp_ex_1', name: 'Supino', sets: 4 }],
};

const DEFAULT_PARAMS = {
  enabled: true,
  studentId: STUDENT_ID,
  name: 'Rotina do Aluno',
  meta: {
    type: 'strength',
    trainingLevel: 'intermediate',
    genderOrdination: '',
    description: '',
    startDate: '2026-05-01',
    expirationDate: '',
    assigneeId: STUDENT_ID,
  },
  trainings: [TRAINING],
  onRestore: vi.fn(),
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

// ─── enabled=false ────────────────────────────────────────────────────────────

describe('useProtocolDraft — disabled (edit/view mode, no studentId, or loading)', () => {
  it('does not write to localStorage when enabled=false', () => {
    renderHook(() => useProtocolDraft({ ...DEFAULT_PARAMS, enabled: false }));

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it('does not call onRestore when enabled=false', () => {
    const onRestore = vi.fn();
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        version: DRAFT_VERSION,
        savedAt: new Date().toISOString(),
        studentId: STUDENT_ID,
        data: { name: 'Old', meta: {}, trainings: [] },
      })
    );

    renderHook(() => useProtocolDraft({ ...DEFAULT_PARAMS, enabled: false, onRestore }));

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(onRestore).not.toHaveBeenCalled();
  });

  it('does not write when studentId is missing', () => {
    renderHook(() => useProtocolDraft({ ...DEFAULT_PARAMS, studentId: null }));

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });
});

// ─── Autosave: structural vs. debounced ───────────────────────────────────────

describe('useProtocolDraft — autosave (structural immediate / meta debounced)', () => {
  it('writes immediately on first render because trainings differ from null signature', () => {
    renderHook(() => useProtocolDraft({ ...DEFAULT_PARAMS }));

    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY));
    expect(stored).not.toBeNull();
    expect(stored.version).toBe(DRAFT_VERSION);
    expect(stored.studentId).toBe(STUDENT_ID);
    expect(stored.data.name).toBe('Rotina do Aluno');
  });

  it('persists the FULL local training objects — nested exercises included, not just ids', () => {
    renderHook(() => useProtocolDraft({ ...DEFAULT_PARAMS }));

    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY));
    expect(stored.data.trainings).toEqual([TRAINING]);
    expect(stored.data.trainings[0].exercises).toEqual([
      { id: 'tmp_ex_1', name: 'Supino', sets: 4 },
    ]);
  });

  it('persists protocol-only meta fields (startDate, expirationDate, assigneeId)', () => {
    renderHook(() => useProtocolDraft({ ...DEFAULT_PARAMS }));

    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY));
    expect(stored.data.meta).toEqual(DEFAULT_PARAMS.meta);
  });

  it('debounces a pure name change (no write until 1500ms)', () => {
    const baseParams = { ...DEFAULT_PARAMS, trainings: [] };
    const { rerender } = renderHook((props) => useProtocolDraft(props), {
      initialProps: baseParams,
    });

    localStorage.clear();
    rerender({ ...baseParams, name: 'Novo nome' });

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();

    act(() => {
      vi.advanceTimersByTime(500);
    });
    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY));
    expect(stored.data.name).toBe('Novo nome');
  });

  it('debounces a pure meta change (no write until 1500ms)', () => {
    const baseParams = { ...DEFAULT_PARAMS, trainings: [] };
    const { rerender } = renderHook((props) => useProtocolDraft(props), {
      initialProps: baseParams,
    });

    localStorage.clear();
    rerender({ ...baseParams, meta: { ...DEFAULT_PARAMS.meta, startDate: '2026-06-01' } });

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();

    act(() => {
      vi.advanceTimersByTime(500);
    });
    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY));
    expect(stored.data.meta.startDate).toBe('2026-06-01');
  });

  it('writes immediately when a training is added (structural change)', () => {
    const { rerender } = renderHook((props) => useProtocolDraft(props), {
      initialProps: { ...DEFAULT_PARAMS },
    });

    localStorage.clear();

    const secondTraining = { id: 'tmp_2', name: 'Costas', exercises: [] };
    rerender({ ...DEFAULT_PARAMS, trainings: [TRAINING, secondTraining] });

    // No timer advance — must already be written, protecting exactly the
    // "just added an exercise/training, click save immediately, save fails"
    // scenario from the production bug this hook exists to fix.
    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY));
    expect(stored).not.toBeNull();
    expect(stored.data.trainings).toHaveLength(2);
  });

  it('writes immediately when an exercise is added inside an existing training (structural change)', () => {
    const { rerender } = renderHook((props) => useProtocolDraft(props), {
      initialProps: { ...DEFAULT_PARAMS },
    });

    localStorage.clear();

    const trainingWithNewExercise = {
      ...TRAINING,
      exercises: [...TRAINING.exercises, { id: 'tmp_ex_2', name: 'Crucifixo', sets: 3 }],
    };
    rerender({ ...DEFAULT_PARAMS, trainings: [trainingWithNewExercise] });

    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY));
    expect(stored).not.toBeNull();
    expect(stored.data.trainings[0].exercises).toHaveLength(2);
  });

  it('sets lastSaved after the first structural write', () => {
    const { result } = renderHook(() => useProtocolDraft({ ...DEFAULT_PARAMS }));
    expect(result.current.lastSaved).not.toBeNull();
    expect(typeof result.current.lastSaved).toBe('string');
  });
});

// ─── Draft isolation per studentId ─────────────────────────────────────────────

describe('useProtocolDraft — isolation per studentId', () => {
  it('writes to a key scoped to the given studentId', () => {
    renderHook(() => useProtocolDraft({ ...DEFAULT_PARAMS, studentId: 'student-2' }));

    expect(localStorage.getItem('treinoway:protocol-builder-draft:student-2')).not.toBeNull();
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it('does not restore a draft written for a different student', () => {
    localStorage.setItem(
      'treinoway:protocol-builder-draft:student-2',
      JSON.stringify({
        version: DRAFT_VERSION,
        savedAt: new Date().toISOString(),
        studentId: 'student-2',
        data: { name: 'Rotina de outro aluno', meta: {}, trainings: [] },
      })
    );

    const onRestore = vi.fn();
    renderHook(() => useProtocolDraft({ ...DEFAULT_PARAMS, onRestore }));

    expect(onRestore).not.toHaveBeenCalled();
  });
});

// ─── beforeunload flush ───────────────────────────────────────────────────────

describe('useProtocolDraft — beforeunload flush', () => {
  it('writes the current payload synchronously when beforeunload fires (even without debounce timer)', () => {
    const baseParams = { ...DEFAULT_PARAMS, trainings: [] };
    const { rerender } = renderHook((props) => useProtocolDraft(props), {
      initialProps: baseParams,
    });

    rerender({ ...baseParams, name: 'Antes do fechamento' });
    localStorage.clear();

    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });

    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY));
    expect(stored).not.toBeNull();
    expect(stored.data.name).toBe('Antes do fechamento');
  });

  it('does not write on beforeunload when enabled=false', () => {
    renderHook(() => useProtocolDraft({ ...DEFAULT_PARAMS, enabled: false }));

    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });

    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it('does not write on beforeunload when payload is empty (no name, no trainings, no meta)', () => {
    renderHook(() =>
      useProtocolDraft({
        ...DEFAULT_PARAMS,
        name: '',
        trainings: [],
        meta: { type: '', trainingLevel: '', genderOrdination: '', description: '', startDate: '', expirationDate: '', assigneeId: '' },
      })
    );

    localStorage.clear();

    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });

    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });
});

// ─── Restore on mount ─────────────────────────────────────────────────────────

describe('useProtocolDraft — restore on mount', () => {
  it('calls onRestore with the full trainings array when a valid draft exists', () => {
    const onRestore = vi.fn();
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        version: DRAFT_VERSION,
        savedAt: new Date().toISOString(),
        studentId: STUDENT_ID,
        data: {
          name: 'Rotina Salva',
          meta: { ...DEFAULT_PARAMS.meta },
          trainings: [TRAINING],
        },
      })
    );

    renderHook(() => useProtocolDraft({ ...DEFAULT_PARAMS, onRestore }));

    expect(onRestore).toHaveBeenCalledOnce();
    expect(onRestore).toHaveBeenCalledWith({
      name: 'Rotina Salva',
      meta: { ...DEFAULT_PARAMS.meta },
      trainings: [TRAINING],
    });
  });

  it('does NOT call onRestore when no draft exists', () => {
    const onRestore = vi.fn();
    renderHook(() => useProtocolDraft({ ...DEFAULT_PARAMS, onRestore }));
    expect(onRestore).not.toHaveBeenCalled();
  });

  it('does NOT call onRestore for an unsupported version', () => {
    const onRestore = vi.fn();
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        version: 99,
        savedAt: new Date().toISOString(),
        studentId: STUDENT_ID,
        data: { name: 'Old', meta: {}, trainings: [] },
      })
    );

    renderHook(() => useProtocolDraft({ ...DEFAULT_PARAMS, onRestore }));
    expect(onRestore).not.toHaveBeenCalled();
  });

  it('does NOT call onRestore for malformed JSON', () => {
    const onRestore = vi.fn();
    localStorage.setItem(DRAFT_KEY, '{not-json');

    renderHook(() => useProtocolDraft({ ...DEFAULT_PARAMS, onRestore }));
    expect(onRestore).not.toHaveBeenCalled();
  });

  it('sets lastSaved from the stored savedAt when restoring', () => {
    const savedAt = '2026-04-24T10:00:00.000Z';
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        version: DRAFT_VERSION,
        savedAt,
        studentId: STUDENT_ID,
        data: { name: 'Draft', meta: {}, trainings: [] },
      })
    );

    const { result } = renderHook(() =>
      useProtocolDraft({ ...DEFAULT_PARAMS, trainings: [] })
    );

    expect(result.current.lastSaved).not.toBeNull();
    expect(typeof result.current.lastSaved).toBe('string');
  });
});

// ─── clearDraft ─────────────────────────────────────────────────────────────

describe('useProtocolDraft — clearDraft', () => {
  it('removes the draft from localStorage and resets lastSaved', () => {
    const { result } = renderHook(() => useProtocolDraft({ ...DEFAULT_PARAMS }));

    expect(localStorage.getItem(DRAFT_KEY)).not.toBeNull();

    act(() => {
      result.current.clearDraft();
    });

    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    expect(result.current.lastSaved).toBeNull();
  });

  it('does not persist again on unmount after clearDraft was called', () => {
    const { result, unmount } = renderHook(() => useProtocolDraft({ ...DEFAULT_PARAMS }));

    act(() => {
      result.current.clearDraft();
    });

    unmount();

    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });
});
