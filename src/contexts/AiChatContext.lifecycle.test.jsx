import { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '../test/test-utils';
import { AiChatProvider, useAiChat } from './AiChatContext';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import api, { refreshAccessToken } from '../api/axios';
import { getTranslations } from '../i18n';

vi.mock('./AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('./ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
  refreshAccessToken: vi.fn(),
}));

const USER_1 = { id: 'user-1', email: 'one@test.com' };
const USER_2 = { id: 'user-2', email: 'two@test.com' };
const encoder = new TextEncoder();

// Serialises events to SSE wire format.
const toSse = (events) =>
  events.map((e) => `event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`).join('');

// Builds a terminal `done` SSE event.
const doneEvent = (conversationId, message = 'Resposta final') => ({
  event: 'done',
  data: { conversationId, message, actionsExecuted: [] },
});

// Builds a fetch response whose body stays open until the test pushes events or closes it.
function openStream() {
  let controller;
  const stream = new ReadableStream({ start(c) { controller = c; } });
  return {
    response: { ok: true, status: 200, body: { getReader: () => stream.getReader() } },
    push: (events) => {
      try { controller.enqueue(encoder.encode(toSse(events))); } catch { return undefined; }
    },
    pushRaw: (text) => {
      try { controller.enqueue(encoder.encode(text)); } catch { return undefined; }
    },
    close: () => {
      try { controller.close(); } catch { return undefined; }
    },
  };
}

// Builds a fetch response that delivers the events and ends.
function closedStream(events) {
  const s = openStream();
  s.push(events);
  s.close();
  return s.response;
}

// Builds a non-OK fetch response with a JSON (or unreadable) error body.
function httpError(status, body, { rejectJson = false } = {}) {
  return {
    ok: false,
    status,
    json: rejectJson ? () => Promise.reject(new Error('not json')) : () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body ?? {})),
  };
}

const chat = { current: null };

// Renders the context state as text and exposes the live context value to the tests.
const Probe = () => {
  const ctx = useAiChat();
  useEffect(() => {
    chat.current = ctx;
  });
  return (
    <div>
      {ctx.messages.map((m, i) => (
        <p key={i}>{`${m.role}: ${m.content}`}</p>
      ))}
      <p>{`conversation: ${ctx.conversationId ?? 'none'}`}</p>
      <p>{`loading: ${ctx.loading}`}</p>
      <p>{`error: ${ctx.errorMessage ?? 'none'}`}</p>
      <p>{`retry: ${ctx.errorRetry ?? 'none'}`}</p>
      <p>{`code: ${ctx.errorCode ?? 'none'}`}</p>
      <p>{`messages: ${ctx.messages.length}`}</p>
    </div>
  );
};

// Renders the provider with the text probe.
const renderProvider = () =>
  render(
    <AiChatProvider>
      <Probe />
    </AiChatProvider>
  );

// Sends a message through the context inside act().
const send = (text = 'Mensagem', options) => act(async () => { chat.current.sendMessage(text, options); });
// Returns the AbortSignal passed to the nth fetch call.
const signalOf = (callIndex) => global.fetch.mock.calls[callIndex][1].signal;
// Returns the parsed JSON body of the nth fetch call.
const bodyOf = (callIndex) => JSON.parse(global.fetch.mock.calls[callIndex][1].body);
// Lets pending promises and timers settle inside act().
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

describe('AiChatContext — lifecycle, errors and refresh', () => {
  let showToast;
  const originalFetch = global.fetch;

  beforeEach(() => {
    showToast = vi.fn();
    vi.mocked(useToast).mockReturnValue({ showToast });
    vi.mocked(useAuth).mockReturnValue({ accessToken: 'test-token', user: USER_1 });
    api.get.mockReset();
    vi.mocked(refreshAccessToken).mockReset();
    global.fetch = vi.fn();
    localStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('AC 29: stream is bound to its conversation', () => {
    it('passes an AbortSignal to the stream request', async () => {
      global.fetch.mockResolvedValue(openStream().response);
      renderProvider();

      await send();

      expect(signalOf(0)).toBeInstanceOf(AbortSignal);
      expect(signalOf(0).aborted).toBe(false);
    });

    it('aborts the running stream on "Nova conversa" and ignores late events', async () => {
      const stream = openStream();
      global.fetch.mockResolvedValue(stream.response);
      renderProvider();
      await send();
      stream.push([{ event: 'text_delta', data: { content: 'Parcial' } }]);

      act(() => chat.current.startNewConversation());

      expect(signalOf(0).aborted).toBe(true);
      stream.push([
        { event: 'text_delta', data: { content: 'Tardio' } },
        doneEvent('conv-old', 'Resposta antiga'),
      ]);
      stream.close();
      await flush();

      expect(screen.getByText('messages: 0')).toBeInTheDocument();
      expect(screen.getByText('conversation: none')).toBeInTheDocument();
      expect(screen.getByText('loading: false')).toBeInTheDocument();
      expect(screen.queryByText(/Resposta antiga|Tardio/)).not.toBeInTheDocument();
    });

    it('does not report an error when the abort was intentional', async () => {
      global.fetch.mockImplementation((_url, init) => new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      }));
      renderProvider();
      await send();

      act(() => chat.current.startNewConversation());
      await flush();

      expect(showToast).not.toHaveBeenCalled();
      expect(screen.getByText('error: none')).toBeInTheDocument();
      expect(screen.getByText('retry: none')).toBeInTheDocument();
    });

    it('aborts the running stream on loadConversation and keeps the loaded conversation id', async () => {
      const stream = openStream();
      global.fetch.mockResolvedValue(stream.response);
      api.get.mockResolvedValue({
        data: { id: 'conv-2', messages: [{ id: 'm1', role: 'user', content: 'Histórica', toolCalls: null }] },
      });
      renderProvider();
      await send();

      await act(async () => { await chat.current.loadConversation('conv-2'); });

      expect(signalOf(0).aborted).toBe(true);
      stream.push([doneEvent('conv-old', 'Resposta antiga')]);
      stream.close();
      await flush();

      expect(screen.getByText('conversation: conv-2')).toBeInTheDocument();
      expect(screen.getByText('user: Histórica')).toBeInTheDocument();
      expect(screen.queryByText(/Resposta antiga/)).not.toBeInTheDocument();
      expect(screen.getByText('loading: false')).toBeInTheDocument();
    });

    it('aborts the running stream when the authenticated user changes', async () => {
      const stream = openStream();
      global.fetch.mockResolvedValue(stream.response);
      const { rerender } = renderProvider();
      await send();

      vi.mocked(useAuth).mockReturnValue({ accessToken: 'token-2', user: USER_2 });
      rerender(<AiChatProvider><Probe /></AiChatProvider>);

      expect(signalOf(0).aborted).toBe(true);
      stream.push([{ event: 'text_delta', data: { content: 'Vazamento' } }, doneEvent('conv-user-1', 'Resposta do usuário 1')]);
      stream.close();
      await flush();

      expect(screen.getByText('messages: 0')).toBeInTheDocument();
      expect(screen.queryByText(/Resposta do usuário 1|Vazamento/)).not.toBeInTheDocument();
      expect(screen.getByText('conversation: none')).toBeInTheDocument();
    });

    it('aborts the running stream on logout (user becomes null)', async () => {
      const stream = openStream();
      global.fetch.mockResolvedValue(stream.response);
      const { rerender } = renderProvider();
      await send();

      vi.mocked(useAuth).mockReturnValue({ accessToken: null, user: null });
      rerender(<AiChatProvider><Probe /></AiChatProvider>);

      expect(signalOf(0).aborted).toBe(true);
      stream.push([doneEvent('conv-user-1', 'Resposta do usuário 1')]);
      await flush();

      expect(screen.queryByText(/Resposta do usuário 1/)).not.toBeInTheDocument();
    });

    it('does not show the previous user reply to the next user after re-login', async () => {
      const stream = openStream();
      global.fetch.mockResolvedValue(stream.response);
      const { rerender } = renderProvider();
      await send();
      vi.mocked(useAuth).mockReturnValue({ accessToken: null, user: null });
      rerender(<AiChatProvider><Probe /></AiChatProvider>);
      vi.mocked(useAuth).mockReturnValue({ accessToken: 'token-2', user: USER_2 });
      rerender(<AiChatProvider><Probe /></AiChatProvider>);

      stream.push([doneEvent('conv-user-1', 'Resposta do usuário 1')]);
      await flush();

      expect(screen.getByText('messages: 0')).toBeInTheDocument();
      expect(screen.getByText('conversation: none')).toBeInTheDocument();
    });

    it('aborts the running stream when the provider unmounts', async () => {
      global.fetch.mockResolvedValue(openStream().response);
      const { unmount } = renderProvider();
      await send();

      unmount();

      expect(signalOf(0).aborted).toBe(true);
    });
  });

  describe('AC 30: startConversation({ studentId })', () => {
    it('starts a NEW conversation (no conversationId) and sends studentId with the prompt', async () => {
      global.fetch
        .mockResolvedValueOnce(closedStream([doneEvent('conv-A', 'Primeira resposta')]))
        .mockResolvedValueOnce(closedStream([doneEvent('conv-B', 'Resposta sobre o aluno')]));
      renderProvider();
      await send('Pergunta antiga');
      await waitFor(() => expect(screen.getByText('conversation: conv-A')).toBeInTheDocument());

      await act(async () => { await chat.current.startConversation('Analise o aluno Ana', { studentId: 'student-9' }); });

      expect(bodyOf(1)).toEqual({ message: 'Analise o aluno Ana', studentId: 'student-9' });
      await waitFor(() => expect(screen.getByText('conversation: conv-B')).toBeInTheDocument());
      expect(screen.queryByText(/Pergunta antiga|Primeira resposta/)).not.toBeInTheDocument();
      expect(screen.getByText('user: Analise o aluno Ana')).toBeInTheDocument();
    });

    it('aborts a running stream first and still sends the new request', async () => {
      const running = openStream();
      global.fetch
        .mockResolvedValueOnce(running.response)
        .mockResolvedValueOnce(closedStream([doneEvent('conv-B', 'Resposta nova')]));
      renderProvider();
      await send('Pergunta em andamento');

      await act(async () => { await chat.current.startConversation('Analise a sessão', { studentId: 'student-9' }); });

      expect(signalOf(0).aborted).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(bodyOf(1)).toEqual({ message: 'Analise a sessão', studentId: 'student-9' });
      running.push([doneEvent('conv-old', 'Resposta antiga')]);
      await flush();
      expect(screen.queryByText(/Resposta antiga|Pergunta em andamento/)).not.toBeInTheDocument();
      await waitFor(() => expect(screen.getByText('conversation: conv-B')).toBeInTheDocument());
    });

    it('plain sendMessage keeps the body free of studentId', async () => {
      global.fetch.mockResolvedValue(closedStream([doneEvent('conv-A')]));
      renderProvider();

      await send('Sem aluno');

      expect(bodyOf(0)).toEqual({ message: 'Sem aluno' });
      expect(bodyOf(0)).not.toHaveProperty('studentId');
    });

    it('is ignored when there is no authenticated user', async () => {
      vi.mocked(useAuth).mockReturnValue({ accessToken: null, user: null });
      renderProvider();

      await act(async () => { await chat.current.startConversation('Analise', { studentId: 'student-9' }); });

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('AC 31: non-OK responses before SSE', () => {
    const cases = [
      [403, 'platformPlan.aiNotAvailable'],
      [403, 'platformPlan.aiActionsExceeded'],
      [429, 'ai.rateLimited'],
      [503, 'ai.unavailable'],
      [503, 'ai.overloaded'],
    ];

    it.each(cases)('HTTP %i %s shows the translated messageCode text in the error state only', async (status, messageCode) => {
      global.fetch.mockResolvedValue(
        httpError(status, { error: 'SERVER_CODE', messageCode, message: 'RAW SERVER MESSAGE' })
      );
      renderProvider();

      await send('Quero ajuda');

      const expected = getTranslations().messageCodes[messageCode];
      expect(expected).toBeTruthy();
      await waitFor(() => expect(screen.getByText(`error: ${expected}`)).toBeInTheDocument());
      expect(screen.getByText(`code: ${messageCode}`)).toBeInTheDocument();
      expect(showToast).not.toHaveBeenCalled();
      expect(screen.queryByText(/RAW SERVER MESSAGE/)).not.toBeInTheDocument();
      expect(screen.getByText('loading: false')).toBeInTheDocument();
    });

    it('HTTP 500 without messageCode falls back to the httpStatus translation', async () => {
      global.fetch.mockResolvedValue(httpError(500, { error: 'INTERNAL' }));
      renderProvider();

      await send();

      const expected = getTranslations().httpStatus[500];
      await waitFor(() => expect(screen.getByText(`error: ${expected}`)).toBeInTheDocument());
      expect(showToast).not.toHaveBeenCalled();
    });

    it('a non-JSON error body still yields a translated message (no throw, no raw text)', async () => {
      global.fetch.mockResolvedValue(httpError(502, null, { rejectJson: true }));
      renderProvider();

      await send();

      const expected = getTranslations().httpStatus[502] ?? getTranslations().fallback;
      await waitFor(() => expect(screen.getByText(`error: ${expected}`)).toBeInTheDocument());
      expect(showToast).not.toHaveBeenCalled();
    });

    it('removes the streaming placeholder and keeps the retry text', async () => {
      global.fetch.mockResolvedValue(
        httpError(503, { error: 'AI_UNAVAILABLE', messageCode: 'ai.unavailable', message: 'x' })
      );
      renderProvider();

      await send('Texto para repetir');

      await waitFor(() => expect(screen.getByText('retry: Texto para repetir')).toBeInTheDocument());
      expect(chat.current.messages.some((m) => m.isStreaming)).toBe(false);
    });

    it('SSE error event shows the translated messageCode text, single surface (no toast)', async () => {
      global.fetch.mockResolvedValue(
        closedStream([{ event: 'error', data: { messageCode: 'ai.responseTooLong', message: 'RAW SERVER MESSAGE' } }])
      );
      renderProvider();

      await send('Pedido enorme');

      const expected = getTranslations().messageCodes['ai.responseTooLong'];
      expect(expected).toBeTruthy();
      await waitFor(() => expect(screen.getByText(`error: ${expected}`)).toBeInTheDocument());
      expect(screen.getByText('code: ai.responseTooLong')).toBeInTheDocument();
      expect(screen.getByText('retry: Pedido enorme')).toBeInTheDocument();
      expect(showToast).not.toHaveBeenCalled();
    });

    it('SSE error event with an unknown messageCode falls back to the server-translated message', async () => {
      global.fetch.mockResolvedValue(
        closedStream([{ event: 'error', data: { messageCode: 'ai.somethingNew', message: 'Mensagem do servidor' } }])
      );
      renderProvider();

      await send();

      await waitFor(() => expect(screen.getByText('error: Mensagem do servidor')).toBeInTheDocument());
      expect(showToast).not.toHaveBeenCalled();
    });

    it('network failure is a single error surface too (no toast)', async () => {
      global.fetch.mockRejectedValue(new TypeError('Failed to fetch'));
      renderProvider();

      await send('Texto');

      await waitFor(() => expect(screen.getByText('retry: Texto')).toBeInTheDocument());
      expect(screen.getByText(`error: ${getTranslations().network.offline}`)).toBeInTheDocument();
      expect(showToast).not.toHaveBeenCalled();
    });

    it('clears the error when the next message is sent', async () => {
      global.fetch
        .mockResolvedValueOnce(httpError(503, { messageCode: 'ai.unavailable' }))
        .mockResolvedValueOnce(closedStream([doneEvent('conv-A')]));
      renderProvider();
      await send('Um');
      await waitFor(() => expect(screen.getByText(/^error: (?!none)/)).toBeInTheDocument());

      await send('Dois');

      await waitFor(() => expect(screen.getByText('error: none')).toBeInTheDocument());
      expect(screen.getByText('code: none')).toBeInTheDocument();
    });
  });

  describe('AC 32: 401 on the stream refreshes via axios.refreshAccessToken', () => {
    it('refreshes once and retries the stream with the new token', async () => {
      vi.mocked(refreshAccessToken).mockResolvedValue('fresh-token');
      global.fetch
        .mockResolvedValueOnce(httpError(401, { messageCode: 'auth.unauthorized' }))
        .mockResolvedValueOnce(closedStream([doneEvent('conv-A', 'Funcionou')]));
      renderProvider();

      await send('Olá');

      await waitFor(() => expect(screen.getByText('assistant: Funcionou')).toBeInTheDocument());
      expect(refreshAccessToken).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer test-token');
      expect(global.fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer fresh-token');
      expect(global.fetch.mock.calls.every(([url]) => String(url).includes('/trainer/ai/chat/stream'))).toBe(true);
    });

    it('never reads tokens from localStorage (uses the AuthContext token and the shared helper)', async () => {
      localStorage.setItem('accessToken', 'stale-local-token');
      localStorage.setItem('refreshToken', 'local-refresh');
      const getItem = vi.spyOn(Storage.prototype, 'getItem');
      vi.mocked(refreshAccessToken).mockResolvedValue('fresh-token');
      global.fetch
        .mockResolvedValueOnce(httpError(401, {}))
        .mockResolvedValueOnce(closedStream([doneEvent('conv-A')]));
      renderProvider();

      await send('Olá');

      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
      expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer test-token');
      const tokenReads = getItem.mock.calls.filter(([key]) => key === 'accessToken' || key === 'refreshToken');
      expect(tokenReads).toEqual([]);
    });

    it('retries only once: a second 401 surfaces the translated auth error', async () => {
      vi.mocked(refreshAccessToken).mockResolvedValue('fresh-token');
      global.fetch.mockResolvedValue(httpError(401, { error: 'X', messageCode: 'auth.unauthorized' }));
      renderProvider();

      await send('Olá');

      await waitFor(() =>
        expect(screen.getByText(`error: ${getTranslations().messageCodes['auth.unauthorized']}`)).toBeInTheDocument()
      );
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(refreshAccessToken).toHaveBeenCalledTimes(1);
      expect(showToast).not.toHaveBeenCalled();
    });

    it('does not retry when the refresh yields no token', async () => {
      vi.mocked(refreshAccessToken).mockResolvedValue(null);
      global.fetch.mockResolvedValue(httpError(401, { messageCode: 'auth.unauthorized' }));
      renderProvider();

      await send('Olá');

      await waitFor(() => expect(screen.getByText(/^error: (?!none)/)).toBeInTheDocument());
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('does not retry when the refresh itself fails', async () => {
      vi.mocked(refreshAccessToken).mockRejectedValue(new Error('refresh failed'));
      global.fetch.mockResolvedValue(httpError(401, { messageCode: 'auth.unauthorized' }));
      renderProvider();

      await send('Olá');

      await waitFor(() => expect(screen.getByText(/^error: (?!none)/)).toBeInTheDocument());
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(screen.getByText('loading: false')).toBeInTheDocument();
    });
  });

  describe('AC 33: SSE framing handled by the provider', () => {
    it('assembles an event split across reads', async () => {
      const stream = openStream();
      global.fetch.mockResolvedValue(stream.response);
      renderProvider();
      await send();
      const full = toSse([doneEvent('conv-A', 'Resposta dividida')]);
      const cut = full.indexOf('dividida') - 4;

      stream.pushRaw(full.slice(0, cut));
      await flush();
      stream.pushRaw(full.slice(cut));
      stream.close();

      await waitFor(() => expect(screen.getByText('assistant: Resposta dividida')).toBeInTheDocument());
    });

    it('accepts CRLF-delimited events', async () => {
      const stream = openStream();
      global.fetch.mockResolvedValue(stream.response);
      renderProvider();
      await send();

      stream.pushRaw(toSse([doneEvent('conv-A', 'Com CRLF')]).replace(/\n/g, '\r\n'));
      stream.close();

      await waitFor(() => expect(screen.getByText('assistant: Com CRLF')).toBeInTheDocument());
    });

    it('flushes a final done event that has no terminating blank line', async () => {
      const stream = openStream();
      global.fetch.mockResolvedValue(stream.response);
      renderProvider();
      await send();

      stream.pushRaw('event: done\ndata: {"conversationId":"conv-A","message":"Sem newline final","actionsExecuted":[]}');
      stream.close();

      await waitFor(() => expect(screen.getByText('assistant: Sem newline final')).toBeInTheDocument());
      expect(screen.getByText('conversation: conv-A')).toBeInTheDocument();
    });

    it('does not log with console.info while streaming', async () => {
      const info = vi.spyOn(console, 'info').mockImplementation(() => {});
      global.fetch.mockResolvedValue(closedStream([doneEvent('conv-A')]));
      renderProvider();

      await send();
      await waitFor(() => expect(screen.getByText('conversation: conv-A')).toBeInTheDocument());

      expect(info).not.toHaveBeenCalled();
    });

    it('no longer exposes the unused streamingText value', () => {
      renderProvider();

      expect(Object.keys(chat.current)).not.toContain('streamingText');
    });
  });

  describe('AC 34: retry', () => {
    it('after a failed send, retry shows the user message exactly once', async () => {
      global.fetch
        .mockResolvedValueOnce(httpError(503, { messageCode: 'ai.unavailable' }))
        .mockResolvedValueOnce(closedStream([doneEvent('conv-A', 'Agora foi')]));
      renderProvider();
      await send('Crie um treino');
      await waitFor(() => expect(screen.getByText('retry: Crie um treino')).toBeInTheDocument());

      await act(async () => { await chat.current.retryLastMessage(); });

      await waitFor(() => expect(screen.getByText('assistant: Agora foi')).toBeInTheDocument());
      expect(screen.getAllByText('user: Crie um treino')).toHaveLength(1);
      expect(screen.getByText('messages: 2')).toBeInTheDocument();
      expect(screen.getByText('error: none')).toBeInTheDocument();
    });

    it('after an SSE error event, retry shows the user message exactly once', async () => {
      global.fetch
        .mockResolvedValueOnce(closedStream([{ event: 'error', data: { messageCode: 'ai.overloaded', message: 'x' } }]))
        .mockResolvedValueOnce(closedStream([doneEvent('conv-A', 'Agora foi')]));
      renderProvider();
      await send('Crie um treino');
      await waitFor(() => expect(screen.getByText('retry: Crie um treino')).toBeInTheDocument());

      await act(async () => { await chat.current.retryLastMessage(); });

      await waitFor(() => expect(screen.getByText('assistant: Agora foi')).toBeInTheDocument());
      expect(screen.getAllByText('user: Crie um treino')).toHaveLength(1);
    });

    it('retry resends the same studentId', async () => {
      global.fetch
        .mockResolvedValueOnce(httpError(503, { messageCode: 'ai.unavailable' }))
        .mockResolvedValueOnce(closedStream([doneEvent('conv-A')]));
      renderProvider();
      await act(async () => { await chat.current.startConversation('Analise Ana', { studentId: 'student-9' }); });
      await waitFor(() => expect(screen.getByText('retry: Analise Ana')).toBeInTheDocument());

      await act(async () => { await chat.current.retryLastMessage(); });

      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
      expect(bodyOf(1)).toEqual({ message: 'Analise Ana', studentId: 'student-9' });
    });
  });

  describe('AC 35: loadConversation', () => {
    const notFound = () => {
      const error = new Error('Request failed');
      error.response = { status: 404, data: { error: 'NOT_FOUND', messageCode: 'ai.conversationNotFound', message: 'x' } };
      return error;
    };

    it('on failure shows the translated error and keeps the previous conversation untouched', async () => {
      global.fetch.mockResolvedValue(closedStream([doneEvent('conv-A', 'Resposta A')]));
      renderProvider();
      await send('Pergunta A');
      await waitFor(() => expect(screen.getByText('conversation: conv-A')).toBeInTheDocument());
      api.get.mockRejectedValue(notFound());

      await act(async () => { await chat.current.loadConversation('conv-missing'); });

      expect(screen.getByText('conversation: conv-A')).toBeInTheDocument();
      expect(screen.getByText('user: Pergunta A')).toBeInTheDocument();
      expect(screen.getByText('assistant: Resposta A')).toBeInTheDocument();
      expect(screen.getByText(`error: ${getTranslations().messageCodes['ai.conversationNotFound']}`)).toBeInTheDocument();
      expect(screen.getByText('loading: false')).toBeInTheDocument();
    });

    it('ignores a stale response when a newer selection already finished', async () => {
      let resolveSlow;
      api.get.mockImplementation((url) => {
        if (url.endsWith('/conv-1')) {
          return new Promise((resolve) => { resolveSlow = resolve; });
        }
        return Promise.resolve({ data: { id: 'conv-2', messages: [{ id: 'b', role: 'user', content: 'Segunda', toolCalls: null }] } });
      });
      renderProvider();

      act(() => { chat.current.loadConversation('conv-1'); });
      await act(async () => { await chat.current.loadConversation('conv-2'); });
      await act(async () => {
        resolveSlow({ data: { id: 'conv-1', messages: [{ id: 'a', role: 'user', content: 'Primeira', toolCalls: null }] } });
      });

      expect(screen.getByText('conversation: conv-2')).toBeInTheDocument();
      expect(screen.getByText('user: Segunda')).toBeInTheDocument();
      expect(screen.queryByText('user: Primeira')).not.toBeInTheDocument();
      expect(screen.getByText('loading: false')).toBeInTheDocument();
    });

    it('ignores a pending load when the user starts a new conversation meanwhile', async () => {
      let resolveLoad;
      api.get.mockReturnValue(new Promise((resolve) => { resolveLoad = resolve; }));
      renderProvider();

      act(() => { chat.current.loadConversation('conv-1'); });
      act(() => chat.current.startNewConversation());
      await act(async () => {
        resolveLoad({ data: { id: 'conv-1', messages: [{ id: 'a', role: 'user', content: 'Antiga', toolCalls: null }] } });
      });

      expect(screen.getByText('messages: 0')).toBeInTheDocument();
      expect(screen.getByText('conversation: none')).toBeInTheDocument();
      expect(screen.getByText('loading: false')).toBeInTheDocument();
    });

    it('does not apply a conversation loaded after the user logged out', async () => {
      let resolveLoad;
      api.get.mockReturnValue(new Promise((resolve) => { resolveLoad = resolve; }));
      const { rerender } = renderProvider();
      act(() => { chat.current.loadConversation('conv-1'); });

      vi.mocked(useAuth).mockReturnValue({ accessToken: null, user: null });
      rerender(<AiChatProvider><Probe /></AiChatProvider>);
      await act(async () => {
        resolveLoad({ data: { id: 'conv-1', messages: [{ id: 'a', role: 'user', content: 'Do usuário 1', toolCalls: null }] } });
      });

      expect(screen.queryByText(/Do usuário 1/)).not.toBeInTheDocument();
    });
  });
});
