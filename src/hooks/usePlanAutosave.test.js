import { renderHook, act } from '../test/test-utils';
import usePlanAutosave from './usePlanAutosave';

const DEBOUNCE_LIMIT_MS = 1500;

// Test helper: advance.
const advance = (ms) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

// Test helper: deferred.
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

// Test helper: setup.
const setup = (initial = { kcalTarget: 1550 }, save = vi.fn().mockResolvedValue({})) => {
  const hook = renderHook((props) => usePlanAutosave(props), { initialProps: { value: initial, save } });
  const change = (value) => hook.rerender({ value, save });
  return { ...hook, change, save };
};

describe('usePlanAutosave (criterion 10)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 1, 14, 5, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts idle and does not save the initial value', async () => {
    const { result, save } = setup();
    await advance(DEBOUNCE_LIMIT_MS * 2);
    expect(save).not.toHaveBeenCalled();
    expect(result.current.status).toBe('idle');
    expect(result.current.statusText).toBe('');
  });

  it('saves the changed value within 1.5 s and not before the debounce', async () => {
    const { change, save } = setup();
    change({ kcalTarget: 1600 });

    await advance(DEBOUNCE_LIMIT_MS - 1);
    expect(save).not.toHaveBeenCalled();

    await advance(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ kcalTarget: 1600 });
  });

  it('coalesces rapid edits into one save with the latest value', async () => {
    const { change, save } = setup();
    change({ kcalTarget: 1600 });
    await advance(500);
    change({ kcalTarget: 1650 });
    await advance(500);
    change({ kcalTarget: 1700 });
    await advance(DEBOUNCE_LIMIT_MS);

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith({ kcalTarget: 1700 });
  });

  it('shows "Salvando…" while the request is in flight', async () => {
    const pending = deferred();
    const { result, change } = setup({ kcalTarget: 1550 }, vi.fn().mockReturnValue(pending.promise));
    change({ kcalTarget: 1600 });
    await advance(DEBOUNCE_LIMIT_MS);

    expect(result.current.status).toBe('saving');
    expect(result.current.statusText).toBe('Salvando…');

    await act(async () => { pending.resolve({}); });
    expect(result.current.status).toBe('saved');
  });

  it('shows "Salvo automaticamente às HH:MM" after a successful save', async () => {
    const { result, change } = setup();
    change({ kcalTarget: 1600 });
    await advance(DEBOUNCE_LIMIT_MS);

    expect(result.current.status).toBe('saved');
    expect(result.current.savedAt).toBeInstanceOf(Date);
    expect(result.current.statusText).toBe('Salvo automaticamente às 14:05');
  });

  it('does not save again when the value returns to what was saved', async () => {
    const { change, save } = setup();
    change({ kcalTarget: 1600 });
    await advance(DEBOUNCE_LIMIT_MS);
    change({ kcalTarget: 1600 });
    await advance(DEBOUNCE_LIMIT_MS);

    expect(save).toHaveBeenCalledTimes(1);
  });

  it('reports an error and keeps the edit when the save fails', async () => {
    const save = vi.fn().mockRejectedValue(Object.assign(new Error('boom'), { userMessage: 'Falhou' }));
    const { result, change } = setup({ kcalTarget: 1550 }, save);
    change({ kcalTarget: 1600 });
    await advance(DEBOUNCE_LIMIT_MS);

    expect(result.current.status).toBe('error');
    expect(result.current.statusText).toMatch(/Não foi possível salvar/);
  });

  it('retry() sends the pending value again and recovers to saved', async () => {
    const save = vi.fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue({});
    const { result, change } = setup({ kcalTarget: 1550 }, save);
    change({ kcalTarget: 1600 });
    await advance(DEBOUNCE_LIMIT_MS);
    expect(result.current.status).toBe('error');

    await act(async () => { result.current.retry(); });
    await advance(0);

    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith({ kcalTarget: 1600 });
    expect(result.current.status).toBe('saved');
  });

  it('flush() saves immediately without waiting for the debounce', async () => {
    const { result, change, save } = setup();
    change({ kcalTarget: 1600 });

    await act(async () => { await result.current.flush(); });

    expect(save).toHaveBeenCalledWith({ kcalTarget: 1600 });
  });
});
