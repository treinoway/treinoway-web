import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { openChatStream, readChatEvents } from './aiChatStream';
import { clearAuthAndRedirect, refreshAccessToken } from './axios';

vi.mock('./axios', () => ({ refreshAccessToken: vi.fn(), clearAuthAndRedirect: vi.fn() }));

const encoder = new TextEncoder();

// Builds a response whose body delivers the given text chunks and ends.
const streamResponse = (chunks) => {
  const stream = new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });
  return { ok: true, status: 200, body: { getReader: () => stream.getReader() } };
};

// Builds a rejected HTTP response with a JSON body.
const failure = (status, body) => ({ ok: false, status, json: () => Promise.resolve(body) });

describe('aiChatStream', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
    vi.mocked(refreshAccessToken).mockReset();
    vi.mocked(clearAuthAndRedirect).mockReset();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('openChatStream', () => {
    it('posts the payload with the bearer token and the abort signal', async () => {
      const controller = new AbortController();
      global.fetch.mockResolvedValue(streamResponse([]));

      await openChatStream({ payload: { message: 'oi' }, token: 'abc', signal: controller.signal });

      const [url, init] = global.fetch.mock.calls[0];
      expect(url).toContain('/trainer/ai/chat/stream');
      expect(init.headers.Authorization).toBe('Bearer abc');
      expect(JSON.parse(init.body)).toEqual({ message: 'oi' });
      expect(init.signal).toBe(controller.signal);
    });

    it('sends the current i18n locale as the app-language header', async () => {
      global.fetch.mockResolvedValue(streamResponse([]));

      await openChatStream({ payload: {}, token: 't' });

      expect(global.fetch.mock.calls[0][1].headers['app-language']).toBe('pt-BR');
    });

    it('rejects with an axios-like error carrying the status and JSON body', async () => {
      global.fetch.mockResolvedValue(failure(403, { messageCode: 'platformPlan.aiNotAvailable' }));

      await expect(openChatStream({ payload: {}, token: 't', signal: undefined })).rejects.toMatchObject({
        response: { status: 403, data: { messageCode: 'platformPlan.aiNotAvailable' } },
      });
    });

    it('keeps the status with a null body when the error is not JSON', async () => {
      global.fetch.mockResolvedValue({ ok: false, status: 502, json: () => Promise.reject(new Error('html')) });

      await expect(openChatStream({ payload: {}, token: 't' })).rejects.toMatchObject({
        response: { status: 502, data: null },
      });
    });

    it('refreshes once on 401 and retries with the new token', async () => {
      vi.mocked(refreshAccessToken).mockResolvedValue('fresh');
      global.fetch.mockResolvedValueOnce(failure(401, {})).mockResolvedValueOnce(streamResponse([]));

      await openChatStream({ payload: {}, token: 'old' });

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer fresh');
    });

    it('ends the session like the axios interceptor when the refresh yields no token', async () => {
      vi.mocked(refreshAccessToken).mockResolvedValue(null);
      global.fetch.mockResolvedValue(failure(401, {}));

      await expect(openChatStream({ payload: {}, token: 'old' })).rejects.toMatchObject({ response: { status: 401 } });

      expect(clearAuthAndRedirect).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('ends the session when the refresh request itself fails', async () => {
      vi.mocked(refreshAccessToken).mockRejectedValue(new Error('nope'));
      global.fetch.mockResolvedValue(failure(401, {}));

      await expect(openChatStream({ payload: {}, token: 'old' })).rejects.toMatchObject({ response: { status: 401 } });

      expect(clearAuthAndRedirect).toHaveBeenCalledTimes(1);
    });

    it('keeps the session when the refresh succeeds', async () => {
      vi.mocked(refreshAccessToken).mockResolvedValue('fresh');
      global.fetch.mockResolvedValueOnce(failure(401, {})).mockResolvedValueOnce(streamResponse([]));

      await openChatStream({ payload: {}, token: 'old' });

      expect(clearAuthAndRedirect).not.toHaveBeenCalled();
    });

    it('does not retry when the refresh fails', async () => {
      vi.mocked(refreshAccessToken).mockRejectedValue(new Error('nope'));
      global.fetch.mockResolvedValue(failure(401, {}));

      await expect(openChatStream({ payload: {}, token: 'old' })).rejects.toMatchObject({ response: { status: 401 } });
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('readChatEvents', () => {
    it('delivers events split across chunks and flushes the unterminated tail', async () => {
      const onEvent = vi.fn();
      const response = streamResponse([
        'event: status\ndata: {"message":"a"}\n\nevent: do',
        'ne\ndata: {"conversationId":"c1"}',
      ]);

      await readChatEvents(response, new AbortController().signal, onEvent);

      expect(onEvent.mock.calls.map(([event]) => event.event)).toEqual(['status', 'done']);
    });

    it('stops reading once the signal is aborted', async () => {
      const onEvent = vi.fn();
      const controller = new AbortController();
      controller.abort();

      await readChatEvents(streamResponse(['event: status\ndata: {"message":"a"}\n\n']), controller.signal, onEvent);

      expect(onEvent).not.toHaveBeenCalled();
    });
  });
});
