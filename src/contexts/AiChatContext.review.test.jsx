import { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '../test/test-utils';
import { AiChatProvider, useAiChat } from './AiChatContext';
import { useAuth } from './AuthContext';
import api from '../api/axios';

vi.mock('./AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('./ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../api/axios', () => ({
  default: { get: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
  refreshAccessToken: vi.fn(),
  clearAuthAndRedirect: vi.fn(),
}));

const encoder = new TextEncoder();

// Builds a fetch response that delivers the events and ends.
const closedStream = (events) => {
  const text = events.map((e) => `event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`).join('');
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
  return { ok: true, status: 200, body: { getReader: () => stream.getReader() } };
};

// Builds a terminal done event.
const done = (conversationId) => ({ event: 'done', data: { conversationId, message: 'Ok', actionsExecuted: [] } });
// Builds an SSE error event, optionally carrying the conversation the server already created.
const sseError = (conversationId) => ({
  event: 'error',
  data: { error: 'AI_OVERLOADED', messageCode: 'ai.overloaded', message: 'x', ...(conversationId && { conversationId }) },
});

const chat = { current: null };

// Renders the bits of context state the tests assert on.
const Probe = () => {
  const ctx = useAiChat();
  useEffect(() => {
    chat.current = ctx;
  });
  return (
    <div>
      <p>{`conversation: ${ctx.conversationId ?? 'none'}`}</p>
      <p>{`retry: ${ctx.errorRetry ?? 'none'}`}</p>
    </div>
  );
};

// Returns the parsed JSON body of the nth fetch call.
const bodyOf = (index) => JSON.parse(global.fetch.mock.calls[index][1].body);

describe('AiChatContext: review fixes', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ accessToken: 'token', user: { id: 'user-1' } });
    api.get.mockReset();
    global.fetch = vi.fn();
    render(
      <AiChatProvider>
        <Probe />
      </AiChatProvider>
    );
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('failed first turn keeps the conversation the server created', () => {
    it('adopts the conversationId from the SSE error and retry continues that conversation', async () => {
      global.fetch
        .mockResolvedValueOnce(closedStream([sseError('conv-orphan')]))
        .mockResolvedValueOnce(closedStream([done('conv-orphan')]));

      await act(async () => { await chat.current.sendMessage('Crie um treino'); });
      await waitFor(() => expect(screen.getByText('conversation: conv-orphan')).toBeInTheDocument());
      await act(async () => { await chat.current.retryLastMessage(); });

      expect(bodyOf(1)).toEqual({ message: 'Crie um treino', conversationId: 'conv-orphan' });
    });

    it('works with an old server that sends no conversationId: retry starts without one', async () => {
      global.fetch
        .mockResolvedValueOnce(closedStream([sseError()]))
        .mockResolvedValueOnce(closedStream([done('conv-new')]));

      await act(async () => { await chat.current.sendMessage('Crie um treino'); });
      await waitFor(() => expect(screen.getByText('retry: Crie um treino')).toBeInTheDocument());
      expect(screen.getByText('conversation: none')).toBeInTheDocument();
      await act(async () => { await chat.current.retryLastMessage(); });

      expect(bodyOf(1)).toEqual({ message: 'Crie um treino' });
    });
  });

  describe('studentId lives with the conversation', () => {
    it('is sent on every turn after startConversation, with the conversationId', async () => {
      global.fetch
        .mockResolvedValueOnce(closedStream([done('conv-A')]))
        .mockResolvedValueOnce(closedStream([done('conv-A')]));

      await act(async () => { await chat.current.startConversation('Analise Ana', { studentId: 'student-9' }); });
      await act(async () => { await chat.current.sendMessage('E a carga?'); });

      expect(bodyOf(1)).toEqual({ message: 'E a carga?', conversationId: 'conv-A', studentId: 'student-9' });
    });

    it('is sent again on retry of a later turn', async () => {
      global.fetch
        .mockResolvedValueOnce(closedStream([done('conv-A')]))
        .mockResolvedValueOnce(closedStream([sseError()]))
        .mockResolvedValueOnce(closedStream([done('conv-A')]));

      await act(async () => { await chat.current.startConversation('Analise Ana', { studentId: 'student-9' }); });
      await act(async () => { await chat.current.sendMessage('Segunda'); });
      await waitFor(() => expect(screen.getByText('retry: Segunda')).toBeInTheDocument());
      await act(async () => { await chat.current.retryLastMessage(); });

      expect(bodyOf(2)).toEqual({ message: 'Segunda', conversationId: 'conv-A', studentId: 'student-9' });
    });

    it('is cleared by startNewConversation', async () => {
      global.fetch
        .mockResolvedValueOnce(closedStream([done('conv-A')]))
        .mockResolvedValueOnce(closedStream([done('conv-B')]));
      await act(async () => { await chat.current.startConversation('Analise Ana', { studentId: 'student-9' }); });

      act(() => chat.current.startNewConversation());
      await act(async () => { await chat.current.sendMessage('Livre'); });

      expect(bodyOf(1)).toEqual({ message: 'Livre' });
    });

    it('is cleared when another conversation is loaded', async () => {
      global.fetch
        .mockResolvedValueOnce(closedStream([done('conv-A')]))
        .mockResolvedValueOnce(closedStream([done('conv-2')]));
      api.get.mockResolvedValue({ data: { id: 'conv-2', messages: [] } });
      await act(async () => { await chat.current.startConversation('Analise Ana', { studentId: 'student-9' }); });

      await act(async () => { await chat.current.loadConversation('conv-2'); });
      await act(async () => { await chat.current.sendMessage('Continuar'); });

      expect(bodyOf(1)).toEqual({ message: 'Continuar', conversationId: 'conv-2' });
    });

    it('survives a failed conversation load', async () => {
      global.fetch
        .mockResolvedValueOnce(closedStream([done('conv-A')]))
        .mockResolvedValueOnce(closedStream([done('conv-A')]));
      api.get.mockRejectedValue(new Error('boom'));
      await act(async () => { await chat.current.startConversation('Analise Ana', { studentId: 'student-9' }); });

      await act(async () => { await chat.current.loadConversation('conv-x'); });
      await act(async () => { await chat.current.sendMessage('Continuar'); });

      expect(bodyOf(1).studentId).toBe('student-9');
    });
  });

  describe('reloaded tool turns', () => {
    const toolCalls = [{ tool: 'create_training_template', success: true }];

    it('folds a tool-only assistant row into the next reply instead of an empty bubble', async () => {
      api.get.mockResolvedValue({
        data: {
          id: 'conv-1',
          messages: [
            { id: 'm1', role: 'user', content: 'Crie um treino' },
            { id: 'm2', role: 'assistant', content: '', toolCalls },
            { id: 'm3', role: 'assistant', content: 'Treino criado!', toolCalls: null },
          ],
        },
      });

      await act(async () => { await chat.current.loadConversation('conv-1'); });

      const { messages } = chat.current;
      expect(messages.map((m) => m.content)).toEqual(['Crie um treino', 'Treino criado!']);
      expect(messages[1].actionsExecuted).toEqual(toolCalls);
    });

    it('keeps the badge on a trailing tool-only row with a fallback reply', async () => {
      api.get.mockResolvedValue({
        data: {
          id: 'conv-1',
          messages: [
            { id: 'm1', role: 'user', content: 'Crie um treino' },
            { id: 'm2', role: 'assistant', content: '  ', toolCalls },
          ],
        },
      });

      await act(async () => { await chat.current.loadConversation('conv-1'); });

      const { messages } = chat.current;
      expect(messages).toHaveLength(2);
      expect(messages[1].content).toBe('Ação executada com sucesso.');
      expect(messages[1].actionsExecuted).toEqual(toolCalls);
    });

    it('leaves ordinary replies untouched and gives every message a unique key', async () => {
      api.get.mockResolvedValue({
        data: {
          id: 'conv-1',
          messages: [
            { role: 'user', content: 'Oi' },
            { role: 'assistant', content: 'Olá', toolCalls: null },
          ],
        },
      });

      await act(async () => { await chat.current.loadConversation('conv-1'); });

      const ids = chat.current.messages.map((m) => m.id);
      expect(new Set(ids).size).toBe(2);
      expect(chat.current.messages[1].actionsExecuted).toEqual([]);
    });
  });
});
