import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import useUnsavedChangesWarning from './useUnsavedChangesWarning';

describe('useUnsavedChangesWarning', () => {
  let addSpy;
  let removeSpy;

  beforeEach(() => {
    addSpy = vi.spyOn(window, 'addEventListener');
    removeSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers a beforeunload listener when isDirty is true', () => {
    renderHook(() => useUnsavedChangesWarning(true));

    expect(addSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  it('does NOT register a beforeunload listener when isDirty is false', () => {
    renderHook(() => useUnsavedChangesWarning(false));

    const beforeunloadCalls = addSpy.mock.calls.filter(
      ([event]) => event === 'beforeunload'
    );
    expect(beforeunloadCalls).toHaveLength(0);
  });

  it('removes the listener on unmount when isDirty is true', () => {
    const { unmount } = renderHook(() => useUnsavedChangesWarning(true));

    unmount();

    expect(removeSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  it('does NOT remove a listener on unmount when isDirty is false (nothing was added)', () => {
    const { unmount } = renderHook(() => useUnsavedChangesWarning(false));

    unmount();

    const beforeunloadRemoveCalls = removeSpy.mock.calls.filter(
      ([event]) => event === 'beforeunload'
    );
    expect(beforeunloadRemoveCalls).toHaveLength(0);
  });

  it('registers the listener when isDirty transitions from false to true', () => {
    let isDirty = false;
    const { rerender } = renderHook(() => useUnsavedChangesWarning(isDirty));

    expect(addSpy).not.toHaveBeenCalledWith('beforeunload', expect.any(Function));

    isDirty = true;
    rerender();

    expect(addSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  it('removes the listener when isDirty transitions from true to false', () => {
    let isDirty = true;
    const { rerender } = renderHook(() => useUnsavedChangesWarning(isDirty));

    expect(addSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));

    isDirty = false;
    rerender();

    expect(removeSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  it('sets event.returnValue and calls event.preventDefault when the handler fires', () => {
    renderHook(() => useUnsavedChangesWarning(true));

    const [, handler] = addSpy.mock.calls.find(([event]) => event === 'beforeunload');

    const fakeEvent = { preventDefault: vi.fn(), returnValue: undefined };
    handler(fakeEvent);

    expect(fakeEvent.preventDefault).toHaveBeenCalled();
    expect(fakeEvent.returnValue).toBe('');
  });
});
