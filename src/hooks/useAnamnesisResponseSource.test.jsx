import { renderHook, waitFor, act } from '../test/test-utils';
import useAnamnesisResponseSource, { ANAMNESIS_SOURCE_MODE } from './useAnamnesisResponseSource';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';

vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../api/axios', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));

const mockShowToast = vi.fn();
const anamnesis = { id: 'a-1', title: 'Saúde', sections: [] };
const httpError = (status) => Object.assign(new Error(`HTTP ${status}`), { response: { status } });

const trainerParams = { mode: ANAMNESIS_SOURCE_MODE.TRAINER, anamnesisId: 'a-1', studentId: 's-1' };
const studentParams = { mode: ANAMNESIS_SOURCE_MODE.STUDENT, anamnesisId: 'a-1' };

describe('useAnamnesisResponseSource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockReset();
    api.post.mockReset();
    api.patch.mockReset();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
  });

  describe('trainer mode', () => {
    it('stays idle and does not request anything while disabled', () => {
      const { result } = renderHook(() => useAnamnesisResponseSource({ ...trainerParams, enabled: false }));
      expect(result.current.status).toBe('idle');
      expect(api.get).not.toHaveBeenCalled();
    });

    it('loads the fill payload with studentPresent=true once enabled', async () => {
      api.get.mockResolvedValue({ data: { anamnesis, response: { id: 'r-1', answers: [] }, canFinalize: false } });
      const { result, rerender } = renderHook((props) => useAnamnesisResponseSource(props), {
        initialProps: { ...trainerParams, enabled: false },
      });
      rerender({ ...trainerParams, enabled: true });
      await waitFor(() => expect(result.current.status).toBe('ready'));
      expect(api.get).toHaveBeenCalledWith('/trainer/students/s-1/anamneses/a-1/fill', {
        params: { studentPresent: true },
      });
      expect(result.current.previousResponse).toEqual({ id: 'r-1', answers: [] });
      expect(result.current.canFinalize).toBe(false);
    });

    it('treats a null response as blank and finalizable', async () => {
      api.get.mockResolvedValue({ data: { anamnesis, response: null, canFinalize: true } });
      const { result } = renderHook(() => useAnamnesisResponseSource(trainerParams));
      await waitFor(() => expect(result.current.status).toBe('ready'));
      expect(result.current.previousResponse).toBeNull();
      expect(result.current.canFinalize).toBe(true);
    });

    it('bumps the version with every completed load so callers can remount on fresh data', async () => {
      api.get.mockResolvedValue({ data: { anamnesis, response: null, canFinalize: true } });
      const { result } = renderHook(() => useAnamnesisResponseSource(trainerParams));
      await waitFor(() => expect(result.current.status).toBe('ready'));
      const firstVersion = result.current.version;
      act(() => result.current.reload());
      await waitFor(() => expect(result.current.version).toBe(firstVersion + 1));
      expect(result.current.status).toBe('ready');
    });

    it('reports notFound on 404 without a toast', async () => {
      api.get.mockRejectedValue(httpError(404));
      const { result } = renderHook(() => useAnamnesisResponseSource(trainerParams));
      await waitFor(() => expect(result.current.status).toBe('notFound'));
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('reports an error and toasts on other failures', async () => {
      api.get.mockRejectedValue(Object.assign(httpError(500), { userMessage: 'Erro' }));
      const { result } = renderHook(() => useAnamnesisResponseSource(trainerParams));
      await waitFor(() => expect(result.current.status).toBe('error'));
      expect(mockShowToast).toHaveBeenCalledWith('Erro', 'error');
    });

    it('reloads on demand', async () => {
      api.get.mockResolvedValue({ data: { anamnesis, response: null, canFinalize: true } });
      const { result } = renderHook(() => useAnamnesisResponseSource(trainerParams));
      await waitFor(() => expect(result.current.status).toBe('ready'));
      act(() => result.current.reload());
      await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(result.current.status).toBe('ready'));
    });

    it('submits to the trainer route with the attestation', async () => {
      api.get.mockResolvedValue({ data: { anamnesis, response: null, canFinalize: true } });
      api.post.mockResolvedValue({ data: {} });
      const { result } = renderHook(() => useAnamnesisResponseSource(trainerParams));
      await waitFor(() => expect(result.current.status).toBe('ready'));
      await result.current.submit({ answers: [{ questionId: 'q', value: 1 }] });
      expect(api.post).toHaveBeenCalledWith('/trainer/students/s-1/anamneses/a-1/response', {
        answers: [{ questionId: 'q', value: 1 }],
        attestation: { studentPresent: true },
      });
    });
  });

  describe('trainer mode drafts', () => {
    const load = async (data) => {
      api.get.mockResolvedValue({ data: { anamnesis, canFinalize: true, ...data } });
      const hook = renderHook(() => useAnamnesisResponseSource(trainerParams));
      await waitFor(() => expect(hook.result.current.status).toBe('ready'));
      return hook;
    };

    it('patches the trainer draft route with only the given answers', async () => {
      api.patch.mockResolvedValue({ data: { updatedAt: 'now' } });
      const { result } = await load({ response: null });
      const answers = [{ questionId: 'q', value: 'x' }, { questionId: 'r', value: null }];
      await expect(result.current.saveDraft(answers)).resolves.toEqual({ data: { updatedAt: 'now' } });
      expect(api.patch).toHaveBeenCalledWith('/trainer/students/s-1/anamneses/a-1/response/draft', { answers });
    });

    it('allows autosave for a blank or draft response the trainer can finalize', async () => {
      expect((await load({ response: null })).result.current.canAutosave).toBe(true);
      const draft = await load({ response: { id: 'r-1', submittedAt: null, answers: [] } });
      expect(draft.result.current.canAutosave).toBe(true);
    });

    it('disables autosave when the response was already submitted', async () => {
      const { result } = await load({ response: { id: 'r-1', submittedAt: '2026-03-01T10:00:00.000Z', answers: [] } });
      expect(result.current.canAutosave).toBe(false);
    });

    it('disables autosave when the trainer cannot finalize', async () => {
      const { result } = await load({ response: { id: 'r-1', submittedAt: null, answers: [] }, canFinalize: false });
      expect(result.current.canAutosave).toBe(false);
    });
  });

  describe('student mode', () => {
    it('finds the linked anamnesis and treats a 404 response as blank', async () => {
      api.get.mockImplementation((url) =>
        url === '/my/anamneses'
          ? Promise.resolve({ data: [{ anamnesisId: 'a-1', anamnesis }] })
          : Promise.reject(httpError(404)),
      );
      const { result } = renderHook(() => useAnamnesisResponseSource(studentParams));
      await waitFor(() => expect(result.current.status).toBe('ready'));
      expect(result.current.anamnesis).toEqual(anamnesis);
      expect(result.current.previousResponse).toBeNull();
      expect(result.current.canFinalize).toBe(true);
    });

    it('reports notFound when the anamnesis is not linked', async () => {
      api.get.mockImplementation((url) =>
        url === '/my/anamneses' ? Promise.resolve({ data: [] }) : Promise.reject(httpError(404)),
      );
      const { result } = renderHook(() => useAnamnesisResponseSource(studentParams));
      await waitFor(() => expect(result.current.status).toBe('notFound'));
    });

    it('submits to the student route without an attestation', async () => {
      api.get.mockResolvedValue({ data: [] });
      api.post.mockResolvedValue({ data: {} });
      const { result } = renderHook(() => useAnamnesisResponseSource(studentParams));
      await waitFor(() => expect(result.current.status).not.toBe('loading'));
      await result.current.submit({ answers: [] });
      expect(api.post).toHaveBeenCalledWith('/my/anamneses/a-1/response', { answers: [] });
    });

    it('patches the student draft route with only the given answers', async () => {
      api.get.mockResolvedValue({ data: [] });
      api.patch.mockResolvedValue({ data: {} });
      const { result } = renderHook(() => useAnamnesisResponseSource(studentParams));
      await waitFor(() => expect(result.current.status).not.toBe('loading'));
      await result.current.saveDraft([{ questionId: 'q', value: 'x' }]);
      expect(api.patch).toHaveBeenCalledWith('/my/anamneses/a-1/response/draft', {
        answers: [{ questionId: 'q', value: 'x' }],
      });
    });

    it('allows autosave for a draft and blocks it once the response was submitted', async () => {
      const loadWith = async (response) => {
        api.get.mockImplementation((url) =>
          url === '/my/anamneses'
            ? Promise.resolve({ data: [{ anamnesisId: 'a-1', anamnesis }] })
            : Promise.resolve({ data: response }),
        );
        const hook = renderHook(() => useAnamnesisResponseSource(studentParams));
        await waitFor(() => expect(hook.result.current.status).toBe('ready'));
        return hook.result.current;
      };
      expect((await loadWith({ id: 'r-1', submittedAt: null, answers: [] })).canAutosave).toBe(true);
      expect((await loadWith({ id: 'r-1', submittedAt: '2026-03-01T10:00:00.000Z', answers: [] })).canAutosave).toBe(false);
    });
  });
});
