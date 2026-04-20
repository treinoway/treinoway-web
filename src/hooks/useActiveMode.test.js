import { renderHook, act } from '@testing-library/react';
import useActiveMode from './useActiveMode';

const STORAGE_KEY = 'treinoway.activeMode';

describe('useActiveMode', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns "trainer" as default when localStorage has no value', () => {
    const { result } = renderHook(() => useActiveMode());
    expect(result.current[0]).toBe('trainer');
  });

  it('returns "trainer" as default when localStorage has an invalid value', () => {
    localStorage.setItem(STORAGE_KEY, 'invalid');
    const { result } = renderHook(() => useActiveMode());
    expect(result.current[0]).toBe('trainer');
  });

  it('returns "nutritionist" when localStorage has "nutritionist" stored', () => {
    localStorage.setItem(STORAGE_KEY, 'nutritionist');
    const { result } = renderHook(() => useActiveMode());
    expect(result.current[0]).toBe('nutritionist');
  });

  it('returns "trainer" when localStorage has "trainer" stored', () => {
    localStorage.setItem(STORAGE_KEY, 'trainer');
    const { result } = renderHook(() => useActiveMode());
    expect(result.current[0]).toBe('trainer');
  });

  it('updates state and persists to localStorage when setActiveMode is called', () => {
    const { result } = renderHook(() => useActiveMode());

    act(() => {
      result.current[1]('nutritionist');
    });

    expect(result.current[0]).toBe('nutritionist');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('nutritionist');
  });

  it('switches back to trainer and updates localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'nutritionist');
    const { result } = renderHook(() => useActiveMode());

    act(() => {
      result.current[1]('trainer');
    });

    expect(result.current[0]).toBe('trainer');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('trainer');
  });

  it('ignores invalid mode values passed to setter', () => {
    const { result } = renderHook(() => useActiveMode());

    act(() => {
      result.current[1]('invalid');
    });

    expect(result.current[0]).toBe('trainer');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('new hook instance with the same key reads the persisted value', () => {
    const { result: first } = renderHook(() => useActiveMode());

    act(() => {
      first.current[1]('nutritionist');
    });

    const { result: second } = renderHook(() => useActiveMode());
    expect(second.current[0]).toBe('nutritionist');
  });

  it('syncs across instances when storage event fires', () => {
    const { result } = renderHook(() => useActiveMode());

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: STORAGE_KEY,
          newValue: 'nutritionist',
        })
      );
    });

    expect(result.current[0]).toBe('nutritionist');
  });

  it('ignores storage events for other keys', () => {
    localStorage.setItem(STORAGE_KEY, 'trainer');
    const { result } = renderHook(() => useActiveMode());

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'some.other.key',
          newValue: 'nutritionist',
        })
      );
    });

    expect(result.current[0]).toBe('trainer');
  });

  it('falls back to trainer when storage event delivers an invalid value', () => {
    const { result } = renderHook(() => useActiveMode());

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: STORAGE_KEY,
          newValue: 'invalid',
        })
      );
    });

    expect(result.current[0]).toBe('trainer');
  });
});
