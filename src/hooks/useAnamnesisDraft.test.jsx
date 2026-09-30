import { renderHook, act } from '../test/test-utils';
import useAnamnesisDraft, { DRAFT_DEBOUNCE_MS, DRAFT_RETRY_DELAYS_MS } from './useAnamnesisDraft';
import { useToast } from '../contexts/ToastContext';

vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));

const mockShowToast = vi.fn();
const SAVED_AT = '2026-09-30T17:32:00.000Z';

const httpError = (status, extra = {}) =>
  Object.assign(new Error(`HTTP ${status}`), { response: { status }, ...extra });

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

const advance = (ms) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const settle = () => act(async () => { await vi.advanceTimersByTimeAsync(0); });

const setup = (overrides = {}) => {
  const save = vi.fn().mockResolvedValue({ data: { updatedAt: SAVED_AT } });
  const onConflict = vi.fn();
  let props = {
    enabled: true,
    answers: { q1: 'a', q2: ['x'] },
    stepIndex: 0,
    hasChanges: false,
    save,
    onConflict,
    ...overrides,
  };
  const hook = renderHook((current) => useAnamnesisDraft(current), { initialProps: props });
  const update = (patch) => {
    props = { ...props, ...patch };
    hook.rerender(props);
  };
  const answer = (patch) => update({ answers: { ...props.answers, ...patch } });
  return { ...hook, save: props.save, onConflict, update, answer };
};

const setVisibility = (state) => {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
};

const beforeUnloadPrevented = () => {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
};

describe('useAnamnesisDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.mocked(useToast).mockReturnValue({ showToast: mockShowToast });
  });

  afterEach(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    vi.useRealTimers();
  });

  describe('debounced autosave', () => {
    it('sends nothing until an answer changes', async () => {
      const { save, result } = setup();
      await advance(DRAFT_DEBOUNCE_MS * 3);
      expect(save).not.toHaveBeenCalled();
      expect(result.current.saveState).toEqual({ status: 'idle', savedAt: null });
    });

    it('sends only the dirty answers after the debounce', async () => {
      const { save, answer } = setup();
      answer({ q1: 'b' });
      await advance(DRAFT_DEBOUNCE_MS - 1);
      expect(save).not.toHaveBeenCalled();
      await advance(1);
      expect(save).toHaveBeenCalledTimes(1);
      expect(save).toHaveBeenCalledWith([{ questionId: 'q1', value: 'b' }]);
    });

    it('restarts the debounce on every change and sends them together', async () => {
      const { save, answer } = setup();
      answer({ q1: 'b' });
      await advance(1000);
      answer({ q2: ['x', 'y'] });
      await advance(1000);
      expect(save).not.toHaveBeenCalled();
      await advance(DRAFT_DEBOUNCE_MS);
      expect(save).toHaveBeenCalledTimes(1);
      expect(save).toHaveBeenCalledWith([
        { questionId: 'q1', value: 'b' },
        { questionId: 'q2', value: ['x', 'y'] },
      ]);
    });

    it('does not resend answers that were already saved', async () => {
      const { save, answer } = setup();
      answer({ q1: 'b' });
      await advance(DRAFT_DEBOUNCE_MS);
      answer({ q3: 'c' });
      await advance(DRAFT_DEBOUNCE_MS);
      expect(save).toHaveBeenCalledTimes(2);
      expect(save).toHaveBeenLastCalledWith([{ questionId: 'q3', value: 'c' }]);
    });

    it('sends nothing when an answer goes back to its saved value', async () => {
      const { save, answer } = setup();
      answer({ q1: 'b' });
      answer({ q1: 'a' });
      await advance(DRAFT_DEBOUNCE_MS * 2);
      expect(save).not.toHaveBeenCalled();
    });

    it('sends cleared answers as null', async () => {
      const { save, answer } = setup();
      answer({ q1: '', q2: [] });
      await advance(DRAFT_DEBOUNCE_MS);
      expect(save).toHaveBeenCalledWith([
        { questionId: 'q1', value: null },
        { questionId: 'q2', value: null },
      ]);
    });

    it('treats whitespace-only text as cleared and never sends an unanswered empty question', async () => {
      const { save, answer } = setup();
      answer({ q1: '   ', q9: '' });
      await advance(DRAFT_DEBOUNCE_MS);
      expect(save).toHaveBeenCalledWith([{ questionId: 'q1', value: null }]);
    });

    it('sends the raw value without converting numbers and keeps answers of hidden questions', async () => {
      const { save, answer } = setup({ answers: {} });
      answer({ 'q-years': '12.5', 'q-hidden-child': 'kept' });
      await advance(DRAFT_DEBOUNCE_MS);
      expect(save).toHaveBeenCalledWith([
        { questionId: 'q-years', value: '12.5' },
        { questionId: 'q-hidden-child', value: 'kept' },
      ]);
    });

    it('splits more than 300 dirty answers across requests', async () => {
      const many = Object.fromEntries(Array.from({ length: 301 }, (_, index) => [`q-${index}`, 'v']));
      const { save, answer } = setup({ answers: {} });
      answer(many);
      await advance(DRAFT_DEBOUNCE_MS);
      expect(save.mock.calls[0][0]).toHaveLength(300);
      await advance(DRAFT_DEBOUNCE_MS);
      expect(save.mock.calls[1][0]).toHaveLength(1);
    });
  });

  describe('save state', () => {
    it('goes saving, then saved with the server timestamp', async () => {
      const pending = deferred();
      const { save, answer, result } = setup();
      save.mockReturnValue(pending.promise);
      answer({ q1: 'b' });
      await advance(DRAFT_DEBOUNCE_MS);
      expect(result.current.saveState.status).toBe('saving');
      await act(async () => { pending.resolve({ data: { updatedAt: SAVED_AT } }); });
      expect(result.current.saveState.status).toBe('saved');
      expect(result.current.saveState.savedAt).toEqual(new Date(SAVED_AT));
    });

    it('falls back to the local time when the response has no usable timestamp', async () => {
      vi.setSystemTime(new Date('2026-09-30T12:00:00.000Z'));
      const { save, answer, result } = setup();
      save.mockResolvedValue({ data: {} });
      answer({ q1: 'b' });
      await advance(DRAFT_DEBOUNCE_MS);
      expect(result.current.saveState.savedAt).toEqual(new Date('2026-09-30T12:00:01.500Z'));
    });
  });

  describe('single request in flight', () => {
    it('keeps changes made during a flight for the next flush', async () => {
      const first = deferred();
      const { save, answer } = setup();
      save.mockReturnValueOnce(first.promise);
      answer({ q1: 'b' });
      await advance(DRAFT_DEBOUNCE_MS);
      expect(save).toHaveBeenCalledTimes(1);

      answer({ q3: 'c' });
      await advance(DRAFT_DEBOUNCE_MS * 2);
      expect(save).toHaveBeenCalledTimes(1);

      await act(async () => { first.resolve({ data: { updatedAt: SAVED_AT } }); });
      await advance(0);
      expect(save).toHaveBeenCalledTimes(2);
      expect(save).toHaveBeenLastCalledWith([{ questionId: 'q3', value: 'c' }]);
    });

    it('makes an explicit flush wait for the flight instead of overlapping it', async () => {
      const first = deferred();
      const { save, answer, result } = setup();
      save.mockReturnValueOnce(first.promise);
      answer({ q1: 'b' });
      await advance(DRAFT_DEBOUNCE_MS);
      answer({ q3: 'c' });

      let flushed = false;
      act(() => { result.current.flush().then(() => { flushed = true; }); });
      await settle();
      expect(save).toHaveBeenCalledTimes(1);
      expect(flushed).toBe(false);

      await act(async () => { first.resolve({ data: {} }); });
      await settle();
      expect(save).toHaveBeenCalledTimes(2);
      expect(flushed).toBe(true);
    });

    it('does not send the same answers twice when flushes pile up', async () => {
      const first = deferred();
      const { save, answer, result } = setup();
      save.mockReturnValueOnce(first.promise);
      answer({ q1: 'b' });
      await advance(DRAFT_DEBOUNCE_MS);
      act(() => { result.current.flush(); result.current.flush(); });
      await act(async () => { first.resolve({ data: {} }); });
      await settle();
      expect(save).toHaveBeenCalledTimes(1);
    });
  });

  describe('retry with backoff', () => {
    it('retries after 2 s, 5 s and 10 s and keeps the dirty answers', async () => {
      const { save, answer, result } = setup();
      save.mockRejectedValue(httpError(500));
      answer({ q1: 'b' });
      await advance(DRAFT_DEBOUNCE_MS);
      expect(save).toHaveBeenCalledTimes(1);
      expect(result.current.saveState.status).toBe('error');

      await advance(DRAFT_RETRY_DELAYS_MS[0] - 1);
      expect(save).toHaveBeenCalledTimes(1);
      await advance(1);
      expect(save).toHaveBeenCalledTimes(2);

      await advance(DRAFT_RETRY_DELAYS_MS[1]);
      expect(save).toHaveBeenCalledTimes(3);

      await advance(DRAFT_RETRY_DELAYS_MS[2]);
      expect(save).toHaveBeenCalledTimes(4);
      expect(save).toHaveBeenLastCalledWith([{ questionId: 'q1', value: 'b' }]);

      await advance(DRAFT_RETRY_DELAYS_MS[2]);
      expect(save).toHaveBeenCalledTimes(5);
    });

    it('recovers when a retry succeeds and restarts the backoff afterwards', async () => {
      const { save, answer, result } = setup();
      save.mockRejectedValueOnce(httpError(500)).mockResolvedValueOnce({ data: { updatedAt: SAVED_AT } });
      answer({ q1: 'b' });
      await advance(DRAFT_DEBOUNCE_MS);
      await advance(DRAFT_RETRY_DELAYS_MS[0]);
      expect(result.current.saveState.status).toBe('saved');
      await advance(DRAFT_RETRY_DELAYS_MS[2] * 2);
      expect(save).toHaveBeenCalledTimes(2);

      save.mockRejectedValueOnce(httpError(500));
      answer({ q1: 'c' });
      await advance(DRAFT_DEBOUNCE_MS);
      expect(save).toHaveBeenCalledTimes(3);
      await advance(DRAFT_RETRY_DELAYS_MS[0]);
      expect(save).toHaveBeenCalledTimes(4);
    });

    it('retries network failures (no response)', async () => {
      const { save, answer } = setup();
      save.mockRejectedValueOnce(new Error('Network Error'));
      answer({ q1: 'b' });
      await advance(DRAFT_DEBOUNCE_MS + DRAFT_RETRY_DELAYS_MS[0]);
      expect(save).toHaveBeenCalledTimes(2);
    });

    it('does not retry on its own for a client error but tries again on the next change', async () => {
      const { save, answer, result } = setup();
      save.mockRejectedValueOnce(httpError(400));
      answer({ q1: 'b' });
      await advance(DRAFT_DEBOUNCE_MS);
      expect(result.current.saveState.status).toBe('error');
      await advance(DRAFT_RETRY_DELAYS_MS[2] * 3);
      expect(save).toHaveBeenCalledTimes(1);

      answer({ q1: 'c' });
      await advance(DRAFT_DEBOUNCE_MS);
      expect(save).toHaveBeenCalledTimes(2);
      expect(result.current.saveState.status).toBe('saved');
    });

    it('does not block the wizard: the state is exposed and the caller keeps working', async () => {
      const { save, answer, result } = setup();
      save.mockRejectedValue(httpError(503));
      answer({ q1: 'b' });
      await advance(DRAFT_DEBOUNCE_MS);
      expect(result.current.saveState.status).toBe('error');
      expect(result.current.hasUnsaved).toBe(true);
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('goes back to idle when the failed change is reverted before the retry', async () => {
      const { save, answer, result } = setup();
      save.mockRejectedValueOnce(httpError(500));
      answer({ q1: 'b' });
      await advance(DRAFT_DEBOUNCE_MS);
      answer({ q1: 'a' });
      await advance(DRAFT_RETRY_DELAYS_MS[0]);
      expect(save).toHaveBeenCalledTimes(1);
      expect(result.current.saveState.status).toBe('idle');
    });
  });

  describe('flush triggers', () => {
    it('flushes immediately on step change', async () => {
      const { save, answer, update } = setup();
      answer({ q1: 'b' });
      update({ stepIndex: 1 });
      await settle();
      expect(save).toHaveBeenCalledTimes(1);
      expect(save).toHaveBeenCalledWith([{ questionId: 'q1', value: 'b' }]);
    });

    it('does nothing on step change when nothing is dirty', async () => {
      const { save, update } = setup();
      update({ stepIndex: 1 });
      await settle();
      expect(save).not.toHaveBeenCalled();
    });

    it('flushes when the tab becomes hidden but not when it becomes visible', async () => {
      const { save, answer } = setup();
      answer({ q1: 'b' });
      act(() => setVisibility('visible'));
      await settle();
      expect(save).not.toHaveBeenCalled();
      act(() => setVisibility('hidden'));
      await settle();
      expect(save).toHaveBeenCalledTimes(1);
    });

    it('flushes pending answers on unmount', async () => {
      const { save, answer, unmount } = setup();
      answer({ q1: 'b' });
      unmount();
      await settle();
      expect(save).toHaveBeenCalledTimes(1);
      await advance(DRAFT_DEBOUNCE_MS * 2);
      expect(save).toHaveBeenCalledTimes(1);
    });

    it('stops listening to the tab visibility after unmount', async () => {
      const { save, unmount } = setup();
      unmount();
      act(() => setVisibility('hidden'));
      await settle();
      expect(save).not.toHaveBeenCalled();
    });
  });

  describe('when disabled', () => {
    it('never saves, whatever the trigger', async () => {
      const { save, answer, update, unmount } = setup({ enabled: false });
      answer({ q1: 'b' });
      await advance(DRAFT_DEBOUNCE_MS * 2);
      update({ stepIndex: 1 });
      act(() => setVisibility('hidden'));
      await settle();
      unmount();
      await settle();
      expect(save).not.toHaveBeenCalled();
    });

    it('keeps the idle state and lets prepareForSubmit go through', async () => {
      const { answer, result } = setup({ enabled: false });
      answer({ q1: 'b' });
      expect(result.current.enabled).toBe(false);
      expect(result.current.saveState.status).toBe('idle');
      let proceed;
      await act(async () => { proceed = await result.current.prepareForSubmit(); });
      expect(proceed).toBe(true);
    });

    it('warns before unload only once an answer changed (full submit is the only way to persist)', async () => {
      const { update } = setup({ enabled: false });
      expect(beforeUnloadPrevented()).toBe(false);
      update({ hasChanges: true });
      expect(beforeUnloadPrevented()).toBe(true);
    });
  });

  describe('unload warning while enabled', () => {
    it('warns while there are unsaved answers and stops once saved', async () => {
      const { answer, update } = setup({ hasChanges: false });
      expect(beforeUnloadPrevented()).toBe(false);
      answer({ q1: 'b' });
      update({ hasChanges: true });
      expect(beforeUnloadPrevented()).toBe(true);
      await advance(DRAFT_DEBOUNCE_MS);
      expect(beforeUnloadPrevented()).toBe(false);
    });

    it('warns while a request is in flight and while saving keeps failing', async () => {
      const pending = deferred();
      const { save, answer, update } = setup();
      save.mockReturnValueOnce(pending.promise);
      answer({ q1: 'b' });
      update({ hasChanges: true });
      await advance(DRAFT_DEBOUNCE_MS);
      expect(beforeUnloadPrevented()).toBe(true);
      await act(async () => { pending.reject(httpError(500)); });
      expect(beforeUnloadPrevented()).toBe(true);
    });
  });

  describe('409 conflict', () => {
    it('toasts, reports the conflict and stops autosaving', async () => {
      const { save, answer, update, onConflict, result } = setup();
      save.mockRejectedValueOnce(httpError(409, { userMessage: 'Anamnese já enviada' }));
      answer({ q1: 'b' });
      await advance(DRAFT_DEBOUNCE_MS);
      expect(mockShowToast).toHaveBeenCalledWith('Anamnese já enviada', 'error');
      expect(onConflict).toHaveBeenCalledTimes(1);
      expect(result.current.saveState.status).toBe('idle');

      answer({ q1: 'c' });
      update({ stepIndex: 1 });
      act(() => setVisibility('hidden'));
      await advance(DRAFT_DEBOUNCE_MS + DRAFT_RETRY_DELAYS_MS[2]);
      expect(save).toHaveBeenCalledTimes(1);
    });

    it('does not schedule a retry after a conflict', async () => {
      const { save, answer } = setup();
      save.mockRejectedValue(httpError(409, { userMessage: 'Conflito' }));
      answer({ q1: 'b' });
      await advance(DRAFT_DEBOUNCE_MS + DRAFT_RETRY_DELAYS_MS[2] * 2);
      expect(save).toHaveBeenCalledTimes(1);
    });
  });

  describe('around the final submit', () => {
    it('flushes pending answers first, then pauses so no draft save follows the submit', async () => {
      const { save, answer, result } = setup();
      answer({ q1: 'b' });
      let proceed;
      await act(async () => { proceed = await result.current.prepareForSubmit(); });
      expect(proceed).toBe(true);
      expect(save).toHaveBeenCalledTimes(1);
      expect(save).toHaveBeenCalledWith([{ questionId: 'q1', value: 'b' }]);

      answer({ q1: 'c' });
      act(() => setVisibility('hidden'));
      await advance(DRAFT_DEBOUNCE_MS * 2);
      expect(save).toHaveBeenCalledTimes(1);
    });

    it('waits for a request already in flight before letting the submit go', async () => {
      const pending = deferred();
      const { save, answer, result } = setup();
      save.mockReturnValueOnce(pending.promise);
      answer({ q1: 'b' });
      await advance(DRAFT_DEBOUNCE_MS);

      let proceeded = false;
      act(() => { result.current.prepareForSubmit().then(() => { proceeded = true; }); });
      await settle();
      expect(proceeded).toBe(false);
      await act(async () => { pending.resolve({ data: {} }); });
      await settle();
      expect(proceeded).toBe(true);
      expect(save).toHaveBeenCalledTimes(1);
    });

    it('lets the submit proceed even when the last draft save failed', async () => {
      const { save, answer, result } = setup();
      save.mockRejectedValue(httpError(500));
      answer({ q1: 'b' });
      let proceed;
      await act(async () => { proceed = await result.current.prepareForSubmit(); });
      expect(proceed).toBe(true);
      await advance(DRAFT_RETRY_DELAYS_MS[0] * 2);
      expect(save).toHaveBeenCalledTimes(1);
    });

    it('aborts the submit when the flush hits a conflict', async () => {
      const { save, answer, onConflict, result } = setup();
      save.mockRejectedValueOnce(httpError(409, { userMessage: 'Conflito' }));
      answer({ q1: 'b' });
      let proceed;
      await act(async () => { proceed = await result.current.prepareForSubmit(); });
      expect(proceed).toBe(false);
      expect(onConflict).toHaveBeenCalledTimes(1);
    });

    it('resumes autosave and flushes the pending answers when the submit fails', async () => {
      const { save, answer, result } = setup();
      await act(async () => { await result.current.prepareForSubmit(); });
      answer({ q1: 'b' });
      await advance(DRAFT_DEBOUNCE_MS * 2);
      expect(save).not.toHaveBeenCalled();

      act(() => result.current.resume());
      await settle();
      expect(save).toHaveBeenCalledTimes(1);
      answer({ q1: 'c' });
      await advance(DRAFT_DEBOUNCE_MS);
      expect(save).toHaveBeenCalledTimes(2);
    });

    it('does not flush on unmount after the submit started', async () => {
      const { save, answer, result, unmount } = setup();
      await act(async () => { await result.current.prepareForSubmit(); });
      answer({ q1: 'b' });
      unmount();
      await settle();
      expect(save).not.toHaveBeenCalled();
    });
  });
});
