import { renderHook, act, waitFor } from '@testing-library/react';
import useConfirmDialog from './useConfirmDialog';
import { useToast } from '../contexts/ToastContext';

vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));

const showToast = vi.fn();

describe('useConfirmDialog', () => {
  beforeEach(() => {
    showToast.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast });
  });

  it('has no dialog props until a confirmation is requested', () => {
    const { result } = renderHook(() => useConfirmDialog());
    expect(result.current.dialogProps).toBeNull();
  });

  it('opens with the message and closes on cancel without running the action', () => {
    const onConfirm = vi.fn();
    const { result } = renderHook(() => useConfirmDialog());

    act(() => result.current.requestConfirm({ message: 'Excluir?', onConfirm }));
    expect(result.current.dialogProps.message).toBe('Excluir?');

    act(() => result.current.dialogProps.onCancel());
    expect(result.current.dialogProps).toBeNull();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('stays busy while the action runs, then closes', async () => {
    let resolveAction;
    const onConfirm = vi.fn(() => new Promise((resolve) => { resolveAction = resolve; }));
    const { result } = renderHook(() => useConfirmDialog());

    act(() => result.current.requestConfirm({ message: 'Excluir?', onConfirm }));
    act(() => { result.current.dialogProps.onConfirm(); });
    await waitFor(() => expect(result.current.dialogProps.busy).toBe(true));

    await act(async () => { resolveAction(); });
    expect(result.current.dialogProps).toBeNull();
  });

  it('shows an error toast and closes when the action rejects', async () => {
    const onConfirm = vi.fn().mockRejectedValue({ userMessage: 'Falhou' });
    const { result } = renderHook(() => useConfirmDialog());

    act(() => result.current.requestConfirm({ message: 'Excluir?', onConfirm }));
    await act(async () => { await result.current.dialogProps.onConfirm(); });

    expect(showToast).toHaveBeenCalledWith('Falhou', 'error');
    expect(result.current.dialogProps).toBeNull();
  });

  it('forwards confirmTone to the dialog props when given', () => {
    const { result } = renderHook(() => useConfirmDialog());

    act(() => result.current.requestConfirm({ message: 'Convidar?', onConfirm: vi.fn(), confirmTone: 'primary' }));

    expect(result.current.dialogProps.confirmTone).toBe('primary');
  });

  it('leaves confirmTone undefined when not given, keeping the default tone', () => {
    const { result } = renderHook(() => useConfirmDialog());

    act(() => result.current.requestConfirm({ message: 'Excluir?', onConfirm: vi.fn() }));

    expect(result.current.dialogProps.confirmTone).toBeUndefined();
    expect(result.current.dialogProps.busyLabel).toBe('Excluindo…');
  });
});
