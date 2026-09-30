import { renderHook, act } from '../test/test-utils';
import useAnamnesisSubmit from './useAnamnesisSubmit';
import { useToast } from '../contexts/ToastContext';

vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));

const mockShowToast = vi.fn();

const httpError = (status, data, extra = {}) =>
  Object.assign(new Error(`HTTP ${status}`), { response: { status, data }, ...extra });

const setup = ({ submit, applyServerErrors = vi.fn(() => false), onConflict } = {}) => {
  const wizard = { buildPayload: () => ({ answers: [] }), applyServerErrors };
  const onSubmitted = vi.fn();
  const hook = renderHook(() => useAnamnesisSubmit({ wizard, submit, onSubmitted, onConflict }));
  return { ...hook, onSubmitted, applyServerErrors };
};

describe('useAnamnesisSubmit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
  });

  it('submits the wizard payload and reports success', async () => {
    const submit = vi.fn().mockResolvedValue({});
    const { result, onSubmitted } = setup({ submit });
    await act(() => result.current.handleSubmit());
    expect(submit).toHaveBeenCalledWith({ answers: [] });
    expect(onSubmitted).toHaveBeenCalledTimes(1);
    expect(result.current.submitting).toBe(false);
  });

  it('stays silent when the 400 details were mapped onto fields', async () => {
    const submit = vi.fn().mockRejectedValue(httpError(400, { details: [{ questionId: 'q1' }] }));
    const { result, onSubmitted, applyServerErrors } = setup({ submit, applyServerErrors: vi.fn(() => true) });
    await act(() => result.current.handleSubmit());
    expect(applyServerErrors).toHaveBeenCalledWith([{ questionId: 'q1' }]);
    expect(mockShowToast).not.toHaveBeenCalled();
    expect(onSubmitted).not.toHaveBeenCalled();
  });

  it('toasts a 400 that could not be mapped', async () => {
    const submit = vi.fn().mockRejectedValue(httpError(400, {}, { userMessage: 'Dados inválidos' }));
    const { result } = setup({ submit });
    await act(() => result.current.handleSubmit());
    expect(mockShowToast).toHaveBeenCalledWith('Dados inválidos', 'error');
  });

  it('toasts and calls onConflict on 409', async () => {
    const onConflict = vi.fn();
    const submit = vi.fn().mockRejectedValue(httpError(409, {}, { userMessage: 'Conflito' }));
    const { result } = setup({ submit, onConflict });
    await act(() => result.current.handleSubmit());
    expect(mockShowToast).toHaveBeenCalledWith('Conflito', 'error');
    expect(onConflict).toHaveBeenCalledTimes(1);
  });

  it('does not call onConflict for other errors', async () => {
    const onConflict = vi.fn();
    const submit = vi.fn().mockRejectedValue(httpError(500, {}, { userMessage: 'Erro' }));
    const { result } = setup({ submit, onConflict });
    await act(() => result.current.handleSubmit());
    expect(onConflict).not.toHaveBeenCalled();
  });
});
