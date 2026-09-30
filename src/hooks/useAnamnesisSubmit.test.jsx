import { renderHook, act } from '../test/test-utils';
import useAnamnesisSubmit from './useAnamnesisSubmit';
import { useToast } from '../contexts/ToastContext';

vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));

const mockShowToast = vi.fn();

const httpError = (status, data, extra = {}) =>
  Object.assign(new Error(`HTTP ${status}`), { response: { status, data }, ...extra });

const setup = ({ submit, applyServerErrors = vi.fn(() => false), onConflict, draft } = {}) => {
  const wizard = { buildPayload: () => ({ answers: [] }), applyServerErrors };
  const onSubmitted = vi.fn();
  const hook = renderHook(() => useAnamnesisSubmit({ wizard, submit, onSubmitted, onConflict, draft }));
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

  describe('with autosave', () => {
    const buildDraft = (prepared = true) => ({
      prepareForSubmit: vi.fn().mockResolvedValue(prepared),
      resume: vi.fn(),
    });

    it('flushes the draft before posting and keeps autosave paused after a success', async () => {
      const order = [];
      const draft = buildDraft();
      draft.prepareForSubmit.mockImplementation(async () => { order.push('flush'); return true; });
      const submit = vi.fn(async () => { order.push('post'); });
      const { result, onSubmitted } = setup({ submit, draft });
      await act(() => result.current.handleSubmit());
      expect(order).toEqual(['flush', 'post']);
      expect(onSubmitted).toHaveBeenCalledTimes(1);
      expect(draft.resume).not.toHaveBeenCalled();
    });

    it('does not post when the draft flush reported a conflict', async () => {
      const draft = buildDraft(false);
      const submit = vi.fn();
      const { result, onSubmitted } = setup({ submit, draft });
      await act(() => result.current.handleSubmit());
      expect(submit).not.toHaveBeenCalled();
      expect(onSubmitted).not.toHaveBeenCalled();
      expect(result.current.submitting).toBe(false);
    });

    it('resumes autosave when the submit fails', async () => {
      const draft = buildDraft();
      const submit = vi.fn().mockRejectedValue(httpError(500, {}, { userMessage: 'Erro' }));
      const { result } = setup({ submit, draft });
      await act(() => result.current.handleSubmit());
      expect(draft.resume).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledWith('Erro', 'error');
    });

    it('resumes autosave when a 400 is mapped onto the fields', async () => {
      const draft = buildDraft();
      const submit = vi.fn().mockRejectedValue(httpError(400, { details: [{ questionId: 'q1' }] }));
      const { result } = setup({ submit, draft, applyServerErrors: vi.fn(() => true) });
      await act(() => result.current.handleSubmit());
      expect(draft.resume).toHaveBeenCalledTimes(1);
    });
  });
});
