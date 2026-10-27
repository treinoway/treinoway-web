import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '../test/test-utils';
import useDiscardGuard from './useDiscardGuard';

describe('useDiscardGuard', () => {
  it('closes directly when pristine', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useDiscardGuard(onClose, false));
    act(() => result.current.requestClose());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(result.current.dialogProps).toBeNull();
  });

  it('asks for confirmation when dirty and closes only after discarding', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useDiscardGuard(onClose, true));
    act(() => result.current.requestClose());
    expect(onClose).not.toHaveBeenCalled();
    expect(result.current.dialogProps.message).toBe('Descartar alterações?');
    act(() => result.current.dialogProps.onConfirm());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(result.current.dialogProps).toBeNull();
  });

  it('keeps editing when the confirmation is cancelled', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useDiscardGuard(onClose, true));
    act(() => result.current.requestClose());
    act(() => result.current.dialogProps.onCancel());
    expect(onClose).not.toHaveBeenCalled();
    expect(result.current.dialogProps).toBeNull();
  });

  it('ignores close requests while the confirmation is open', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() => useDiscardGuard(onClose, true));
    act(() => result.current.requestClose());
    act(() => result.current.requestClose());
    expect(onClose).not.toHaveBeenCalled();
    expect(result.current.dialogProps).not.toBeNull();
  });
});
