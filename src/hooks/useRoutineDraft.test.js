import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useRoutineDraft from './useRoutineDraft';

const DRAFT_KEY = 'treinoway:routine-builder-draft';
const DRAFT_VERSION = 3;

const TEMPLATES = [
  { id: 'tmpl-1', name: 'Peito' },
  { id: 'tmpl-2', name: 'Costas' },
];

const DEFAULT_PARAMS = {
  enabled: true,
  name: 'Rotina Teste',
  meta: { type: 'strength', trainingLevel: 'intermediate', defaultDurationWeeks: '12', genderOrdination: '', description: '' },
  trainings: [{ id: 'tmpl-1' }, { id: 'tmpl-2' }],
  trainingTemplates: TEMPLATES,
  createdTrainingIds: [],
  junctionsAddedToImported: [],
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

describe('useRoutineDraft — disabled (edit mode)', () => {
  it('does not write to localStorage when enabled=false', () => {
    renderHook(() =>
      useRoutineDraft({ ...DEFAULT_PARAMS, enabled: false })
    );

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
        data: { name: 'Old', meta: {}, trainingIds: [], trainingOverrides: {}, createdTrainingIds: [], junctionsAddedToImported: [] },
      })
    );

    renderHook(() =>
      useRoutineDraft({ ...DEFAULT_PARAMS, enabled: false, onRestore })
    );

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(onRestore).not.toHaveBeenCalled();
  });
});

// ─── Debounce ─────────────────────────────────────────────────────────────────

describe('useRoutineDraft — autosave debounce', () => {
  it('does not save before 1500ms', () => {
    renderHook(() => useRoutineDraft({ ...DEFAULT_PARAMS }));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it('saves to localStorage after 1500ms with v3 payload including trainingOverrides', () => {
    const params = {
      ...DEFAULT_PARAMS,
      trainings: [{ id: 'tmpl-1', weekDay: 'monday' }, { id: 'tmpl-2' }],
      createdTrainingIds: ['tmpl-1'],
      junctionsAddedToImported: [{ trainingId: 'tmpl-2', junctionId: 'j1' }],
    };
    renderHook(() => useRoutineDraft(params));

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY));
    expect(stored).not.toBeNull();
    expect(stored.version).toBe(DRAFT_VERSION);
    expect(stored.data.name).toBe('Rotina Teste');
    expect(stored.data.trainingIds).toEqual(['tmpl-1', 'tmpl-2']);
    expect(stored.data.trainingOverrides).toEqual({ 'tmpl-1': { weekDay: 'monday' } });
    expect(stored.data.createdTrainingIds).toEqual(['tmpl-1']);
    expect(stored.data.junctionsAddedToImported).toEqual([{ trainingId: 'tmpl-2', junctionId: 'j1' }]);
  });

  it('saves empty trainingOverrides when no training has weekDay', () => {
    renderHook(() => useRoutineDraft({ ...DEFAULT_PARAMS }));

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY));
    expect(stored.data.trainingOverrides).toEqual({});
  });

  it('saves overrides for all trainings that have weekDay set', () => {
    const params = {
      ...DEFAULT_PARAMS,
      trainings: [
        { id: 'tmpl-1', weekDay: 'tuesday' },
        { id: 'tmpl-2', weekDay: 'thursday' },
      ],
    };
    renderHook(() => useRoutineDraft(params));

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY));
    expect(stored.data.trainingOverrides).toEqual({
      'tmpl-1': { weekDay: 'tuesday' },
      'tmpl-2': { weekDay: 'thursday' },
    });
  });

  it('saves empty tracking arrays when not provided', () => {
    renderHook(() => useRoutineDraft({ ...DEFAULT_PARAMS }));

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY));
    expect(stored.data.createdTrainingIds).toEqual([]);
    expect(stored.data.junctionsAddedToImported).toEqual([]);
  });

  it('resets the debounce timer when inputs change before 1500ms', () => {
    const { rerender } = renderHook((props) => useRoutineDraft(props), {
      initialProps: { ...DEFAULT_PARAMS },
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Change name — should reset the timer
    rerender({ ...DEFAULT_PARAMS, name: 'Novo nome' });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Still not 1500ms from the last change
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY));
    expect(stored.data.name).toBe('Novo nome');
  });

  it('resets the debounce timer when createdTrainingIds changes', () => {
    const { rerender } = renderHook((props) => useRoutineDraft(props), {
      initialProps: { ...DEFAULT_PARAMS },
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    rerender({ ...DEFAULT_PARAMS, createdTrainingIds: ['tmpl-1'] });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY));
    expect(stored.data.createdTrainingIds).toEqual(['tmpl-1']);
  });

  it('resets the debounce timer when a training weekDay changes', () => {
    const { rerender } = renderHook((props) => useRoutineDraft(props), {
      initialProps: { ...DEFAULT_PARAMS },
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    rerender({
      ...DEFAULT_PARAMS,
      trainings: [{ id: 'tmpl-1', weekDay: 'friday' }, { id: 'tmpl-2' }],
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY));
    expect(stored.data.trainingOverrides).toEqual({ 'tmpl-1': { weekDay: 'friday' } });
  });

  it('sets lastSaved after writing', () => {
    const { result } = renderHook(() => useRoutineDraft({ ...DEFAULT_PARAMS }));

    expect(result.current.lastSaved).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(result.current.lastSaved).not.toBeNull();
    expect(typeof result.current.lastSaved).toBe('string');
  });
});

// ─── Restore on mount ─────────────────────────────────────────────────────────

describe('useRoutineDraft — restore on mount', () => {
  it('calls onRestore when a valid v3 draft exists', () => {
    const onRestore = vi.fn();
    const savedAt = new Date().toISOString();
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        version: DRAFT_VERSION,
        savedAt,
        data: {
          name: 'Rotina Salva',
          meta: { type: 'cardio' },
          trainingIds: ['tmpl-1'],
          trainingOverrides: { 'tmpl-1': { weekDay: 'wednesday' } },
          createdTrainingIds: ['tmpl-1'],
          junctionsAddedToImported: [],
        },
      })
    );

    renderHook(() =>
      useRoutineDraft({ ...DEFAULT_PARAMS, onRestore })
    );

    expect(onRestore).toHaveBeenCalledOnce();
    expect(onRestore).toHaveBeenCalledWith({
      name: 'Rotina Salva',
      meta: { type: 'cardio' },
      trainingIds: ['tmpl-1'],
      trainingOverrides: { 'tmpl-1': { weekDay: 'wednesday' } },
      createdTrainingIds: ['tmpl-1'],
      junctionsAddedToImported: [],
    });
  });

  it('forward-migrates v2 draft and calls onRestore with trainingOverrides: {}', () => {
    const onRestore = vi.fn();
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        version: 2,
        savedAt: new Date().toISOString(),
        data: {
          name: 'Rotina V2',
          meta: { type: 'strength' },
          trainingIds: ['tmpl-1'],
          createdTrainingIds: [],
          junctionsAddedToImported: [],
        },
      })
    );

    renderHook(() =>
      useRoutineDraft({ ...DEFAULT_PARAMS, onRestore })
    );

    expect(onRestore).toHaveBeenCalledOnce();
    expect(onRestore).toHaveBeenCalledWith(
      expect.objectContaining({
        trainingIds: ['tmpl-1'],
        trainingOverrides: {},
      })
    );
  });

  it('passes trainingOverrides from draft to onRestore', () => {
    const onRestore = vi.fn();
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        version: DRAFT_VERSION,
        savedAt: new Date().toISOString(),
        data: {
          name: 'X',
          meta: {},
          trainingIds: ['tmpl-1', 'tmpl-2'],
          trainingOverrides: { 'tmpl-1': { weekDay: 'friday' } },
          createdTrainingIds: ['tmpl-1'],
          junctionsAddedToImported: [{ trainingId: 'tmpl-2', junctionId: 'j99' }],
        },
      })
    );

    renderHook(() => useRoutineDraft({ ...DEFAULT_PARAMS, onRestore }));

    expect(onRestore).toHaveBeenCalledWith(
      expect.objectContaining({
        trainingOverrides: { 'tmpl-1': { weekDay: 'friday' } },
        createdTrainingIds: ['tmpl-1'],
        junctionsAddedToImported: [{ trainingId: 'tmpl-2', junctionId: 'j99' }],
      })
    );
  });

  it('defaults trainingOverrides to {} when absent in stored data', () => {
    const onRestore = vi.fn();
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        version: DRAFT_VERSION,
        savedAt: new Date().toISOString(),
        data: { name: 'Y', meta: {}, trainingIds: [], createdTrainingIds: [], junctionsAddedToImported: [] },
      })
    );

    renderHook(() => useRoutineDraft({ ...DEFAULT_PARAMS, onRestore }));

    expect(onRestore).toHaveBeenCalledWith(
      expect.objectContaining({
        trainingOverrides: {},
      })
    );
  });

  it('defaults createdTrainingIds and junctionsAddedToImported to [] when absent in stored data', () => {
    const onRestore = vi.fn();
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        version: DRAFT_VERSION,
        savedAt: new Date().toISOString(),
        data: { name: 'Y', meta: {}, trainingIds: [], trainingOverrides: {} },
      })
    );

    renderHook(() => useRoutineDraft({ ...DEFAULT_PARAMS, onRestore }));

    expect(onRestore).toHaveBeenCalledWith(
      expect.objectContaining({
        createdTrainingIds: [],
        junctionsAddedToImported: [],
      })
    );
  });

  it('sets lastSaved from the stored savedAt when restoring', () => {
    const savedAt = '2026-04-24T10:00:00.000Z';
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        version: DRAFT_VERSION,
        savedAt,
        data: { name: 'Draft', meta: {}, trainingIds: [], trainingOverrides: {}, createdTrainingIds: [], junctionsAddedToImported: [] },
      })
    );

    const { result } = renderHook(() =>
      useRoutineDraft({ ...DEFAULT_PARAMS })
    );

    expect(result.current.lastSaved).toBe(savedAt);
  });

  it('does NOT call onRestore when no draft exists', () => {
    const onRestore = vi.fn();
    renderHook(() => useRoutineDraft({ ...DEFAULT_PARAMS, onRestore }));
    expect(onRestore).not.toHaveBeenCalled();
  });

  it('does NOT call onRestore for a v1 draft (silently dropped)', () => {
    const onRestore = vi.fn();
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        version: 1,
        savedAt: new Date().toISOString(),
        data: { name: 'Old', meta: {}, trainingIds: [] },
      })
    );

    renderHook(() => useRoutineDraft({ ...DEFAULT_PARAMS, onRestore }));

    expect(onRestore).not.toHaveBeenCalled();
  });

  it('calls onRestore only once even if trainingTemplates reference changes', () => {
    const onRestore = vi.fn();
    const savedAt = new Date().toISOString();
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        version: DRAFT_VERSION,
        savedAt,
        data: { name: 'X', meta: {}, trainingIds: [], trainingOverrides: {}, createdTrainingIds: [], junctionsAddedToImported: [] },
      })
    );

    const { rerender } = renderHook((props) => useRoutineDraft(props), {
      initialProps: { ...DEFAULT_PARAMS, onRestore },
    });

    // Re-render with a new trainingTemplates array reference
    rerender({ ...DEFAULT_PARAMS, onRestore, trainingTemplates: [...TEMPLATES] });

    expect(onRestore).toHaveBeenCalledOnce();
  });
});

// ─── Stale ID filtering ───────────────────────────────────────────────────────

describe('useRoutineDraft — stale ID filtering', () => {
  it('filters out training IDs not present in trainingTemplates', () => {
    const onRestore = vi.fn();
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        version: DRAFT_VERSION,
        savedAt: new Date().toISOString(),
        data: {
          name: 'Rotina',
          meta: {},
          trainingIds: ['tmpl-1', 'tmpl-deleted', 'tmpl-2'],
          trainingOverrides: {},
          createdTrainingIds: [],
          junctionsAddedToImported: [],
        },
      })
    );

    renderHook(() =>
      useRoutineDraft({ ...DEFAULT_PARAMS, onRestore })
    );

    expect(onRestore).toHaveBeenCalledWith(
      expect.objectContaining({ trainingIds: ['tmpl-1', 'tmpl-2'] })
    );
  });

  it('filters trainingOverrides to only valid training ids', () => {
    const onRestore = vi.fn();
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        version: DRAFT_VERSION,
        savedAt: new Date().toISOString(),
        data: {
          name: 'Rotina',
          meta: {},
          trainingIds: ['tmpl-1', 'tmpl-deleted'],
          trainingOverrides: {
            'tmpl-1': { weekDay: 'monday' },
            'tmpl-deleted': { weekDay: 'friday' },
          },
          createdTrainingIds: [],
          junctionsAddedToImported: [],
        },
      })
    );

    renderHook(() => useRoutineDraft({ ...DEFAULT_PARAMS, onRestore }));

    expect(onRestore).toHaveBeenCalledWith(
      expect.objectContaining({
        trainingIds: ['tmpl-1'],
        trainingOverrides: { 'tmpl-1': { weekDay: 'monday' } },
      })
    );
  });

  it('passes empty trainingIds when all stored IDs are stale', () => {
    const onRestore = vi.fn();
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        version: DRAFT_VERSION,
        savedAt: new Date().toISOString(),
        data: {
          name: 'Rotina',
          meta: {},
          trainingIds: ['stale-1', 'stale-2'],
          trainingOverrides: {},
          createdTrainingIds: [],
          junctionsAddedToImported: [],
        },
      })
    );

    renderHook(() =>
      useRoutineDraft({ ...DEFAULT_PARAMS, onRestore })
    );

    expect(onRestore).toHaveBeenCalledWith(
      expect.objectContaining({ trainingIds: [] })
    );
  });

  it('filters createdTrainingIds to only those present in validIds', () => {
    const onRestore = vi.fn();
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        version: DRAFT_VERSION,
        savedAt: new Date().toISOString(),
        data: {
          name: 'Rotina',
          meta: {},
          trainingIds: ['tmpl-1', 'tmpl-deleted'],
          trainingOverrides: {},
          createdTrainingIds: ['tmpl-1', 'tmpl-deleted'],
          junctionsAddedToImported: [],
        },
      })
    );

    renderHook(() => useRoutineDraft({ ...DEFAULT_PARAMS, onRestore }));

    // tmpl-deleted is not in TEMPLATES, so must be filtered from both
    expect(onRestore).toHaveBeenCalledWith(
      expect.objectContaining({
        trainingIds: ['tmpl-1'],
        createdTrainingIds: ['tmpl-1'],
      })
    );
  });

  it('filters junctionsAddedToImported to only those with valid trainingIds', () => {
    const onRestore = vi.fn();
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        version: DRAFT_VERSION,
        savedAt: new Date().toISOString(),
        data: {
          name: 'Rotina',
          meta: {},
          trainingIds: ['tmpl-1', 'tmpl-deleted'],
          trainingOverrides: {},
          createdTrainingIds: [],
          junctionsAddedToImported: [
            { trainingId: 'tmpl-1', junctionId: 'j-keep' },
            { trainingId: 'tmpl-deleted', junctionId: 'j-drop' },
          ],
        },
      })
    );

    renderHook(() => useRoutineDraft({ ...DEFAULT_PARAMS, onRestore }));

    expect(onRestore).toHaveBeenCalledWith(
      expect.objectContaining({
        junctionsAddedToImported: [{ trainingId: 'tmpl-1', junctionId: 'j-keep' }],
      })
    );
  });
});

// ─── Deferred restore (templates not yet loaded) ──────────────────────────────

describe('useRoutineDraft — deferred restore', () => {
  it('defers restore when draft has trainingIds but trainingTemplates is empty', () => {
    const onRestore = vi.fn();
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        version: DRAFT_VERSION,
        savedAt: new Date().toISOString(),
        data: {
          name: 'Rotina Adiada',
          meta: {},
          trainingIds: ['a', 'b'],
          trainingOverrides: {},
          createdTrainingIds: [],
          junctionsAddedToImported: [],
        },
      })
    );

    const { rerender } = renderHook((props) => useRoutineDraft(props), {
      initialProps: { ...DEFAULT_PARAMS, onRestore, trainingTemplates: [] },
    });

    // Templates not loaded yet — restore must NOT have fired.
    expect(onRestore).not.toHaveBeenCalled();

    // Templates arrive.
    rerender({ ...DEFAULT_PARAMS, onRestore, trainingTemplates: [{ id: 'a' }, { id: 'b' }] });

    expect(onRestore).toHaveBeenCalledOnce();
    expect(onRestore).toHaveBeenCalledWith(
      expect.objectContaining({ trainingIds: ['a', 'b'] })
    );
  });

  it('restores immediately when draft has no trainingIds even if templates empty', () => {
    const onRestore = vi.fn();
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        version: DRAFT_VERSION,
        savedAt: new Date().toISOString(),
        data: {
          name: 'Foo',
          meta: {},
          trainingIds: [],
          trainingOverrides: {},
          createdTrainingIds: [],
          junctionsAddedToImported: [],
        },
      })
    );

    renderHook(() =>
      useRoutineDraft({ ...DEFAULT_PARAMS, onRestore, trainingTemplates: [] })
    );

    expect(onRestore).toHaveBeenCalledOnce();
    expect(onRestore).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Foo', trainingIds: [] })
    );
  });

  it('restores once even when re-rendering with the same templates', () => {
    const onRestore = vi.fn();
    const savedAt = new Date().toISOString();
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        version: DRAFT_VERSION,
        savedAt,
        data: {
          name: 'Único',
          meta: {},
          trainingIds: ['tmpl-1'],
          trainingOverrides: {},
          createdTrainingIds: [],
          junctionsAddedToImported: [],
        },
      })
    );

    const { rerender } = renderHook((props) => useRoutineDraft(props), {
      initialProps: { ...DEFAULT_PARAMS, onRestore },
    });

    // onRestore fires on first render (templates are populated in DEFAULT_PARAMS).
    expect(onRestore).toHaveBeenCalledOnce();

    // Re-render several times with the same templates.
    rerender({ ...DEFAULT_PARAMS, onRestore });
    rerender({ ...DEFAULT_PARAMS, onRestore });
    rerender({ ...DEFAULT_PARAMS, onRestore });

    // Must still be exactly one call.
    expect(onRestore).toHaveBeenCalledOnce();
  });
});

// ─── clearDraft ───────────────────────────────────────────────────────────────

describe('useRoutineDraft — clearDraft', () => {
  it('removes the draft from localStorage', () => {
    const { result } = renderHook(() => useRoutineDraft({ ...DEFAULT_PARAMS }));

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(localStorage.getItem(DRAFT_KEY)).not.toBeNull();

    act(() => {
      result.current.clearDraft();
    });

    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it('resets lastSaved to null', () => {
    const { result } = renderHook(() => useRoutineDraft({ ...DEFAULT_PARAMS }));

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(result.current.lastSaved).not.toBeNull();

    act(() => {
      result.current.clearDraft();
    });

    expect(result.current.lastSaved).toBeNull();
  });
});

// ─── Flush on unmount ─────────────────────────────────────────────────────────

describe('useRoutineDraft — flush on unmount', () => {
  it('flushes to localStorage on unmount without waiting for debounce', () => {
    const { unmount } = renderHook(() =>
      useRoutineDraft({ ...DEFAULT_PARAMS })
    );

    // Unmount immediately — debounce timer (1500ms) has NOT fired yet.
    unmount();

    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY));
    expect(stored).not.toBeNull();
    expect(stored.data.name).toBe('Rotina Teste');
    expect(stored.data.trainingIds).toEqual(['tmpl-1', 'tmpl-2']);
  });

  it('flush on unmount includes trainingOverrides', () => {
    const { unmount } = renderHook(() =>
      useRoutineDraft({
        ...DEFAULT_PARAMS,
        trainings: [{ id: 'tmpl-1', weekDay: 'saturday' }, { id: 'tmpl-2' }],
      })
    );

    unmount();

    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY));
    expect(stored.data.trainingOverrides).toEqual({ 'tmpl-1': { weekDay: 'saturday' } });
  });

  it('flush on unmount includes tracking arrays', () => {
    const { unmount } = renderHook(() =>
      useRoutineDraft({
        ...DEFAULT_PARAMS,
        createdTrainingIds: ['tmpl-1'],
        junctionsAddedToImported: [{ trainingId: 'tmpl-2', junctionId: 'jX' }],
      })
    );

    unmount();

    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY));
    expect(stored.data.createdTrainingIds).toEqual(['tmpl-1']);
    expect(stored.data.junctionsAddedToImported).toEqual([{ trainingId: 'tmpl-2', junctionId: 'jX' }]);
  });

  it('does not flush on unmount when enabled=false', () => {
    const { unmount } = renderHook(() =>
      useRoutineDraft({ ...DEFAULT_PARAMS, enabled: false })
    );

    unmount();

    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it('flushes the latest prop values on unmount after a prop change', () => {
    const { rerender, unmount } = renderHook((props) => useRoutineDraft(props), {
      initialProps: { ...DEFAULT_PARAMS, name: 'Nome Inicial' },
    });

    rerender({ ...DEFAULT_PARAMS, name: 'Nome Atualizado' });

    // Unmount before debounce fires.
    unmount();

    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY));
    expect(stored).not.toBeNull();
    expect(stored.data.name).toBe('Nome Atualizado');
  });

  it('does not flush empty payload on unmount', () => {
    const { unmount } = renderHook(() =>
      useRoutineDraft({
        ...DEFAULT_PARAMS,
        name: '',
        trainings: [],
        meta: null,
      })
    );

    unmount();

    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });

  it('clearDraft prevents subsequent flush-on-unmount', () => {
    const { result, unmount } = renderHook(() =>
      useRoutineDraft({ ...DEFAULT_PARAMS })
    );

    act(() => {
      result.current.clearDraft();
    });

    unmount();

    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
  });
});

// ─── Malformed / wrong-version JSON ──────────────────────────────────────────

describe('useRoutineDraft — malformed draft', () => {
  it('silently ignores malformed JSON in localStorage', () => {
    const onRestore = vi.fn();
    localStorage.setItem(DRAFT_KEY, 'not-valid-json{{{');

    expect(() => {
      renderHook(() => useRoutineDraft({ ...DEFAULT_PARAMS, onRestore }));
    }).not.toThrow();

    expect(onRestore).not.toHaveBeenCalled();
  });

  it('ignores a v1 draft (wrong version number)', () => {
    const onRestore = vi.fn();
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        version: 1,
        savedAt: new Date().toISOString(),
        data: { name: 'X', meta: {}, trainingIds: [] },
      })
    );

    renderHook(() => useRoutineDraft({ ...DEFAULT_PARAMS, onRestore }));

    expect(onRestore).not.toHaveBeenCalled();
  });

  it('ignores a draft with missing data field', () => {
    const onRestore = vi.fn();
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ version: DRAFT_VERSION, savedAt: new Date().toISOString() })
    );

    renderHook(() => useRoutineDraft({ ...DEFAULT_PARAMS, onRestore }));

    expect(onRestore).not.toHaveBeenCalled();
  });
});
