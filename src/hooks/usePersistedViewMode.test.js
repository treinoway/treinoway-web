import { renderHook, act } from '@testing-library/react';
import usePersistedViewMode, { VIEW_MODE_KEYS } from './usePersistedViewMode';

const TEST_KEY = 'treinoway.testView';

describe('usePersistedViewMode', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns "card" as default when localStorage has no value', () => {
    const { result } = renderHook(() => usePersistedViewMode(TEST_KEY));
    expect(result.current[0]).toBe('card');
  });

  it('returns "card" as default when localStorage has an invalid value', () => {
    localStorage.setItem(TEST_KEY, 'invalid');
    const { result } = renderHook(() => usePersistedViewMode(TEST_KEY));
    expect(result.current[0]).toBe('card');
  });

  it('returns "list" when localStorage has "list" stored', () => {
    localStorage.setItem(TEST_KEY, 'list');
    const { result } = renderHook(() => usePersistedViewMode(TEST_KEY));
    expect(result.current[0]).toBe('list');
  });

  it('returns "card" when localStorage has "card" stored', () => {
    localStorage.setItem(TEST_KEY, 'card');
    const { result } = renderHook(() => usePersistedViewMode(TEST_KEY));
    expect(result.current[0]).toBe('card');
  });

  it('updates state and persists to localStorage when setViewMode is called', () => {
    const { result } = renderHook(() => usePersistedViewMode(TEST_KEY));

    act(() => {
      result.current[1]('list');
    });

    expect(result.current[0]).toBe('list');
    expect(localStorage.getItem(TEST_KEY)).toBe('list');
  });

  it('switches back to "card" and updates localStorage', () => {
    localStorage.setItem(TEST_KEY, 'list');
    const { result } = renderHook(() => usePersistedViewMode(TEST_KEY));

    act(() => {
      result.current[1]('card');
    });

    expect(result.current[0]).toBe('card');
    expect(localStorage.getItem(TEST_KEY)).toBe('card');
  });

  it('new hook instance with the same key reads the persisted value', () => {
    const { result: first } = renderHook(() => usePersistedViewMode(TEST_KEY));

    act(() => {
      first.current[1]('list');
    });

    const { result: second } = renderHook(() => usePersistedViewMode(TEST_KEY));
    expect(second.current[0]).toBe('list');
  });

  it('supports functional updater form', () => {
    const { result } = renderHook(() => usePersistedViewMode(TEST_KEY));

    act(() => {
      result.current[1]((prev) => (prev === 'card' ? 'list' : 'card'));
    });

    expect(result.current[0]).toBe('list');
    expect(localStorage.getItem(TEST_KEY)).toBe('list');
  });

  it('does not persist to localStorage when an invalid value is passed via setter', () => {
    const { result } = renderHook(() => usePersistedViewMode(TEST_KEY));

    act(() => {
      result.current[1]('invalid');
    });

    expect(localStorage.getItem(TEST_KEY)).toBeNull();
  });

  it('VIEW_MODE_KEYS exports the expected keys', () => {
    expect(VIEW_MODE_KEYS.protocolTemplates).toBe('treinoway.protocolTemplatesView');
    expect(VIEW_MODE_KEYS.trainingTemplates).toBe('treinoway.trainingTemplatesView');
    expect(VIEW_MODE_KEYS.exerciseTemplates).toBe('treinoway.exerciseTemplatesView');
  });
});
