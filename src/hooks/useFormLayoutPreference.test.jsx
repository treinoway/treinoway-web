import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '../test/test-utils';
import useFormLayoutPreference from './useFormLayoutPreference';

const KEY = 'routineEditor.formLayout';

describe('useFormLayoutPreference (criterion 13)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to "modal" with nothing stored', () => {
    const { result } = renderHook(() => useFormLayoutPreference());
    expect(result.current[0]).toBe('modal');
  });

  it('reads a stored "side" value', () => {
    window.localStorage.setItem(KEY, 'side');
    const { result } = renderHook(() => useFormLayoutPreference());
    expect(result.current[0]).toBe('side');
  });

  it('falls back to "modal" for an invalid stored value', () => {
    window.localStorage.setItem(KEY, 'sidebar');
    const { result } = renderHook(() => useFormLayoutPreference());
    expect(result.current[0]).toBe('modal');
  });

  it('setLayout updates the value and persists it under routineEditor.formLayout', () => {
    const { result } = renderHook(() => useFormLayoutPreference());
    act(() => result.current[1]('side'));
    expect(result.current[0]).toBe('side');
    expect(window.localStorage.getItem(KEY)).toBe('side');
  });

  it('persists a switch back to "modal"', () => {
    window.localStorage.setItem(KEY, 'side');
    const { result } = renderHook(() => useFormLayoutPreference());
    act(() => result.current[1]('modal'));
    expect(result.current[0]).toBe('modal');
    expect(window.localStorage.getItem(KEY)).toBe('modal');
  });

  it('ignores an invalid value passed to setLayout', () => {
    const { result } = renderHook(() => useFormLayoutPreference());
    act(() => result.current[1]('floating'));
    expect(result.current[0]).toBe('modal');
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it('a remounted hook reads the persisted choice', () => {
    const first = renderHook(() => useFormLayoutPreference());
    act(() => first.result.current[1]('side'));
    first.unmount();
    const second = renderHook(() => useFormLayoutPreference());
    expect(second.result.current[0]).toBe('side');
  });

  it('works in memory when localStorage.getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useFormLayoutPreference());
    expect(result.current[0]).toBe('modal');
    act(() => result.current[1]('side'));
    expect(result.current[0]).toBe('side');
  });

  it('works in memory when localStorage.setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const { result } = renderHook(() => useFormLayoutPreference());
    act(() => result.current[1]('side'));
    expect(result.current[0]).toBe('side');
  });
});
