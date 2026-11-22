import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '../test/test-utils';
import useStudentFeedbackUnreadCount, { announceStudentFeedbackUnreadCount } from './useStudentFeedbackUnreadCount';
import api from '../api/axios';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const UNREAD_COUNT_URL = '/trainer/student-feedbacks/unread-count';
const UNREAD_EVENT = 'treinoway:student-feedback-unread-changed';

// Answers the unread count request with the given body
const mockUnreadAnswer = (data) => {
  api.get.mockResolvedValue({ data });
};

// Renders the hook with the given flag; `rerender({ enabled })` changes it
const renderUnreadCount = (enabled) =>
  renderHook((props) => useStudentFeedbackUnreadCount(props.enabled), { initialProps: { enabled } });

// Lets the mocked request and the state update it causes settle inside act()
const settle = () => act(async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
});

// Announces a count the way the inbox does, inside act()
const announce = (count) => act(() => {
  announceStudentFeedbackUnreadCount(count);
});

beforeEach(() => {
  vi.clearAllMocks();
  mockUnreadAnswer({ count: 0 });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('announceStudentFeedbackUnreadCount', () => {
  it('dispatches the unread event on window carrying the count', () => {
    const listener = vi.fn();
    window.addEventListener(UNREAD_EVENT, listener);

    announceStudentFeedbackUnreadCount(4);
    window.removeEventListener(UNREAD_EVENT, listener);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail).toEqual({ count: 4 });
  });
});

describe('useStudentFeedbackUnreadCount: enabled', () => {
  it('starts at zero and asks the service once for the unread count', async () => {
    mockUnreadAnswer({ count: 3 });
    const { result } = renderUnreadCount(true);

    expect(result.current).toBe(0);
    await waitFor(() => expect(result.current).toBe(3));
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith(UNREAD_COUNT_URL);
  });

  it('does not ask again when the component re-renders with the same flag', async () => {
    mockUnreadAnswer({ count: 3 });
    const { result, rerender } = renderUnreadCount(true);
    await waitFor(() => expect(result.current).toBe(3));

    rerender({ enabled: true });
    await settle();

    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['a text', { count: '3' }],
    ['null', { count: null }],
    ['a body without count', {}],
  ])('stays at zero when the service answers %s instead of a number', async (_label, data) => {
    mockUnreadAnswer(data);
    const { result } = renderUnreadCount(true);

    await settle();

    expect(api.get).toHaveBeenCalledWith(UNREAD_COUNT_URL);
    expect(result.current).toBe(0);
  });

  it('stays at zero without throwing when axios answers nothing (a test that left it unmocked)', async () => {
    api.get.mockReturnValue(undefined);
    const { result } = renderUnreadCount(true);

    await settle();

    expect(api.get).toHaveBeenCalledWith(UNREAD_COUNT_URL);
    expect(result.current).toBe(0);
  });

  it('stays at zero when the answer has no body', async () => {
    api.get.mockResolvedValue({});
    const { result } = renderUnreadCount(true);

    await settle();

    expect(result.current).toBe(0);
  });

  it('stays at zero when the request fails', async () => {
    api.get.mockRejectedValue({ userMessage: 'Erro ao carregar.' });
    const { result } = renderUnreadCount(true);

    await settle();

    expect(api.get).toHaveBeenCalledWith(UNREAD_COUNT_URL);
    expect(result.current).toBe(0);
  });

  it('follows the count the inbox announces, without another request', async () => {
    mockUnreadAnswer({ count: 3 });
    const { result } = renderUnreadCount(true);
    await waitFor(() => expect(result.current).toBe(3));

    await announce(2);
    expect(result.current).toBe(2);
    await announce(0);

    expect(result.current).toBe(0);
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('keeps the announced count after a failed request', async () => {
    api.get.mockRejectedValue({ userMessage: 'Erro ao carregar.' });
    const { result } = renderUnreadCount(true);
    await settle();

    await announce(5);

    expect(result.current).toBe(5);
  });

  it('ignores an announcement that carries no number', async () => {
    mockUnreadAnswer({ count: 3 });
    const { result } = renderUnreadCount(true);
    await waitFor(() => expect(result.current).toBe(3));

    await announce('7');
    await announce(null);
    act(() => {
      window.dispatchEvent(new CustomEvent(UNREAD_EVENT));
    });

    expect(result.current).toBe(3);
  });

  it('stops listening once unmounted', async () => {
    const removeListener = vi.spyOn(window, 'removeEventListener');
    const { result, unmount } = renderUnreadCount(true);
    await settle();

    unmount();
    announceStudentFeedbackUnreadCount(9);

    expect(removeListener).toHaveBeenCalledWith(UNREAD_EVENT, expect.any(Function));
    expect(result.current).toBe(0);
  });
});

describe('useStudentFeedbackUnreadCount: disabled (gate closed or not a trainer)', () => {
  it('makes no request and answers zero', async () => {
    mockUnreadAnswer({ count: 3 });
    const { result } = renderUnreadCount(false);

    await settle();

    expect(api.get).not.toHaveBeenCalled();
    expect(result.current).toBe(0);
  });

  it('ignores the counts the inbox announces', async () => {
    const { result } = renderUnreadCount(false);
    await settle();

    await announce(6);

    expect(result.current).toBe(0);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('answers zero as soon as it is disabled, whatever it had counted', async () => {
    mockUnreadAnswer({ count: 3 });
    const { result, rerender } = renderUnreadCount(true);
    await waitFor(() => expect(result.current).toBe(3));

    rerender({ enabled: false });

    expect(result.current).toBe(0);
    await announce(8);
    expect(result.current).toBe(0);
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('asks the service only once it becomes enabled', async () => {
    mockUnreadAnswer({ count: 4 });
    const { result, rerender } = renderUnreadCount(false);
    await settle();
    expect(api.get).not.toHaveBeenCalled();

    rerender({ enabled: true });

    await waitFor(() => expect(result.current).toBe(4));
    expect(api.get).toHaveBeenCalledTimes(1);
    expect(api.get).toHaveBeenCalledWith(UNREAD_COUNT_URL);
  });
});
