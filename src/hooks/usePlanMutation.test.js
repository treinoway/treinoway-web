import { renderHook, act } from '../test/test-utils';
import usePlanMutation from './usePlanMutation';
import { useToast } from '../contexts/ToastContext';

vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));

const showToast = vi.fn();

describe('usePlanMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast });
  });

  it('applies and returns the plan of a successful request', async () => {
    const setPlan = vi.fn();
    const { result } = renderHook(() => usePlanMutation(setPlan));
    let returned;
    await act(async () => { returned = await result.current(() => Promise.resolve({ id: 'p' })); });
    expect(setPlan).toHaveBeenCalledWith({ id: 'p' });
    expect(returned).toEqual({ id: 'p' });
  });

  it('toasts the API message and returns null on failure', async () => {
    const setPlan = vi.fn();
    const { result } = renderHook(() => usePlanMutation(setPlan));
    let returned;
    await act(async () => {
      returned = await result.current(() => Promise.reject(Object.assign(new Error('x'), { userMessage: 'Falhou' })));
    });
    expect(showToast).toHaveBeenCalledWith('Falhou', 'error');
    expect(setPlan).not.toHaveBeenCalled();
    expect(returned).toBeNull();
  });
});
