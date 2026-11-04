import { act, renderHook } from '../test/test-utils';
import usePlanMutation from './usePlanMutation';
import { useToast } from '../contexts/ToastContext';

vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));

// Test helper: a promise settled from outside.
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

describe('usePlanMutation — out-of-order responses (fix round)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
  });

  it('ignores an older response that resolves after a newer one', async () => {
    const setPlan = vi.fn();
    const { result } = renderHook(() => usePlanMutation(setPlan));
    const older = deferred();
    const newer = deferred();

    let olderRun;
    let newerRun;
    act(() => {
      olderRun = result.current(() => older.promise);
      newerRun = result.current(() => newer.promise);
    });
    await act(async () => { newer.resolve({ version: 'new' }); await newerRun; });
    await act(async () => { older.resolve({ version: 'old' }); await olderRun; });

    expect(setPlan).toHaveBeenCalledWith({ version: 'new' });
    expect(setPlan).not.toHaveBeenCalledWith({ version: 'old' });
  });

  it('still applies the latest response when requests resolve in order', async () => {
    const setPlan = vi.fn();
    const { result } = renderHook(() => usePlanMutation(setPlan));

    await act(async () => { await result.current(() => Promise.resolve({ version: 'a' })); });
    await act(async () => { await result.current(() => Promise.resolve({ version: 'b' })); });

    expect(setPlan).toHaveBeenLastCalledWith({ version: 'b' });
  });
});
