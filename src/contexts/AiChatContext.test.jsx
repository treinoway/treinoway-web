import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/test-utils';
import { AiChatProvider, useAiChat } from './AiChatContext';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import api from '../api/axios';

vi.mock('./AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('./ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const CONVERSATION_ID = 'conv-uuid-1234';
const DEFAULT_USER = { id: 'user-1', email: 'test@test.com' };

function createMockSSEStream(events) {
  const text = events
    .map((e) => `event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`)
    .join('');

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });

  return {
    ok: true,
    body: { getReader: () => stream.getReader() },
  };
}

function createDefaultSSEEvents(overrides = {}) {
  return [
    { event: 'status', data: { message: overrides.status || 'Analisando seu pedido...' } },
    { event: 'text_delta', data: { content: overrides.textPart1 || 'Pronto! ' } },
    { event: 'text_delta', data: { content: overrides.textPart2 || 'Criei o protocolo.' } },
    {
      event: 'done',
      data: {
        conversationId: overrides.conversationId || CONVERSATION_ID,
        message: overrides.message || 'Pronto! Criei o protocolo.',
        actionsExecuted: overrides.actionsExecuted || [],
      },
    },
  ];
}

// Test component that exposes context values
const TestConsumer = () => {
  const {
    messages,
    loading,
    hasNewResponse,
    streamingText,
    statusMessage,
    errorRetry,
    sendMessage,
    startNewConversation,
    loadConversation,
    clearNewResponse,
    retryLastMessage,
  } = useAiChat();

  return (
    <div>
      <span data-info="loading">{loading ? 'true' : 'false'}</span>
      <span data-info="hasNewResponse">{hasNewResponse ? 'true' : 'false'}</span>
      <span data-info="streamingText">{streamingText}</span>
      <span data-info="statusMessage">{statusMessage}</span>
      <span data-info="errorRetry">{errorRetry || ''}</span>
      <span data-info="messageCount">{messages.length}</span>
      {messages.map((msg, i) => (
        <div key={i} data-info={`message-${i}`}>
          {msg.role}: {msg.content}
        </div>
      ))}
      <button onClick={() => sendMessage('Test message')} aria-label="Enviar">Enviar</button>
      <button onClick={startNewConversation} aria-label="Nova conversa">Nova conversa</button>
      <button onClick={() => loadConversation('conv-1')} aria-label="Carregar conversa">Carregar conversa</button>
      <button onClick={clearNewResponse} aria-label="Limpar badge">Limpar badge</button>
      <button onClick={retryLastMessage} aria-label="Tentar novamente">Tentar novamente</button>
    </div>
  );
};

const renderWithProvider = () => {
  return renderWithRouter(
    <AiChatProvider>
      <TestConsumer />
    </AiChatProvider>
  );
};

describe('AiChatContext', () => {
  let showToast;
  const originalFetch = global.fetch;

  beforeEach(() => {
    showToast = vi.fn();
    vi.mocked(useToast).mockReturnValue({ showToast });
    vi.mocked(useAuth).mockReturnValue({ accessToken: 'test-token', user: DEFAULT_USER });
    api.get.mockReset();
    api.delete.mockReset();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('starts with empty state', () => {
    renderWithProvider();

    expect(screen.getByText('0')).toBeInTheDocument(); // messageCount
    expect(screen.getByText((_, el) => el?.getAttribute('data-info') === 'loading' && el?.textContent === 'false')).toBeInTheDocument();
    expect(screen.getByText((_, el) => el?.getAttribute('data-info') === 'hasNewResponse' && el?.textContent === 'false')).toBeInTheDocument();
  });

  it('sendMessage adds user message and starts stream', async () => {
    const user = userEvent.setup();
    global.fetch.mockResolvedValue(createMockSSEStream(createDefaultSSEEvents()));

    renderWithProvider();

    await user.click(screen.getByRole('button', { name: /enviar/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/trainer/ai/chat/stream'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ message: 'Test message' }),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/user: Test message/)).toBeInTheDocument();
      expect(screen.getByText(/assistant: Pronto! Criei o protocolo./)).toBeInTheDocument();
    });
  });

  it('sets hasNewResponse to true on done event', async () => {
    const user = userEvent.setup();
    global.fetch.mockResolvedValue(createMockSSEStream(createDefaultSSEEvents()));

    renderWithProvider();

    await user.click(screen.getByRole('button', { name: /enviar/i }));

    await waitFor(() => {
      const el = document.querySelector('[data-info="hasNewResponse"]');
      expect(el.textContent).toBe('true');
    });
  });

  it('clearNewResponse resets the flag', async () => {
    const user = userEvent.setup();
    global.fetch.mockResolvedValue(createMockSSEStream(createDefaultSSEEvents()));

    renderWithProvider();

    await user.click(screen.getByRole('button', { name: /enviar/i }));

    await waitFor(() => {
      const el = document.querySelector('[data-info="hasNewResponse"]');
      expect(el.textContent).toBe('true');
    });

    await user.click(screen.getByRole('button', { name: /limpar badge/i }));

    await waitFor(() => {
      const el = document.querySelector('[data-info="hasNewResponse"]');
      expect(el.textContent).toBe('false');
    });
  });

  it('startNewConversation resets all state', async () => {
    const user = userEvent.setup();
    global.fetch.mockResolvedValue(createMockSSEStream(createDefaultSSEEvents()));

    renderWithProvider();

    await user.click(screen.getByRole('button', { name: /enviar/i }));

    await waitFor(() => {
      expect(screen.getByText(/assistant: Pronto! Criei o protocolo./)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /nova conversa/i }));

    expect(screen.getByText('0')).toBeInTheDocument(); // messageCount = 0
    const hasNew = document.querySelector('[data-info="hasNewResponse"]');
    expect(hasNew.textContent).toBe('false');
  });

  it('loadConversation fetches and sets messages', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({
      data: {
        id: 'conv-1',
        messages: [
          { id: 'msg-1', role: 'user', content: 'Olá', toolCalls: null },
          { id: 'msg-2', role: 'assistant', content: 'Oi!', toolCalls: [] },
        ],
      },
    });

    renderWithProvider();

    await user.click(screen.getByRole('button', { name: /carregar conversa/i }));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/trainer/ai/conversations/conv-1');
    });

    await waitFor(() => {
      expect(screen.getByText(/user: Olá/)).toBeInTheDocument();
      expect(screen.getByText(/assistant: Oi!/)).toBeInTheDocument();
    });
  });

  it('loading state is true during streaming', async () => {
    const user = userEvent.setup();
    let resolveStream;
    global.fetch.mockImplementation(
      () => new Promise((resolve) => { resolveStream = resolve; })
    );

    renderWithProvider();

    await user.click(screen.getByRole('button', { name: /enviar/i }));

    const loadingEl = document.querySelector('[data-info="loading"]');
    expect(loadingEl.textContent).toBe('true');

    await act(async () => {
      resolveStream(createMockSSEStream(createDefaultSSEEvents()));
    });

    await waitFor(() => {
      expect(loadingEl.textContent).toBe('false');
    });
  });

  it('shows error toast on fetch failure and sets errorRetry', async () => {
    const user = userEvent.setup();
    global.fetch.mockRejectedValue(new Error('Network error'));

    renderWithProvider();

    await user.click(screen.getByRole('button', { name: /enviar/i }));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        'Não foi possível conectar ao assistente. Tente novamente.',
        'error'
      );
    });

    const errorRetryEl = document.querySelector('[data-info="errorRetry"]');
    expect(errorRetryEl.textContent).toBe('Test message');
  });

  it('retryLastMessage resends the failed message', async () => {
    const user = userEvent.setup();
    global.fetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(createMockSSEStream(createDefaultSSEEvents()));

    renderWithProvider();

    await user.click(screen.getByRole('button', { name: /enviar/i }));

    await waitFor(() => {
      const errorRetryEl = document.querySelector('[data-info="errorRetry"]');
      expect(errorRetryEl.textContent).toBe('Test message');
    });

    await user.click(screen.getByRole('button', { name: /tentar novamente/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(screen.getByText(/assistant: Pronto! Criei o protocolo./)).toBeInTheDocument();
    });
  });

  it('sends auth token in fetch headers', async () => {
    const user = userEvent.setup();
    global.fetch.mockResolvedValue(createMockSSEStream(createDefaultSSEEvents()));

    renderWithProvider();

    await user.click(screen.getByRole('button', { name: /enviar/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });
  });

  it('sendMessage is blocked when user is null', async () => {
    vi.mocked(useAuth).mockReturnValue({ accessToken: 'test-token', user: null });
    const user = userEvent.setup();

    renderWithProvider();

    await user.click(screen.getByRole('button', { name: /enviar/i }));

    expect(global.fetch).not.toHaveBeenCalled();
    const messageCount = document.querySelector('[data-info="messageCount"]');
    expect(messageCount.textContent).toBe('0');
  });

  it('loadConversation is blocked when user is null', async () => {
    vi.mocked(useAuth).mockReturnValue({ accessToken: 'test-token', user: null });
    const user = userEvent.setup();

    renderWithProvider();

    await user.click(screen.getByRole('button', { name: /carregar conversa/i }));

    expect(api.get).not.toHaveBeenCalled();
  });

  it('exposes empty state when user is null (ownership check)', () => {
    vi.mocked(useAuth).mockReturnValue({ accessToken: 'test-token', user: null });

    renderWithProvider();

    const messageCount = document.querySelector('[data-info="messageCount"]');
    expect(messageCount.textContent).toBe('0');
    const loadingEl = document.querySelector('[data-info="loading"]');
    expect(loadingEl.textContent).toBe('false');
  });

  it('clears state when user changes (logout/login scenario)', async () => {
    const user = userEvent.setup();
    global.fetch.mockResolvedValue(createMockSSEStream(createDefaultSSEEvents()));

    const { rerender } = renderWithRouter(
      <AiChatProvider>
        <TestConsumer />
      </AiChatProvider>
    );

    await user.click(screen.getByRole('button', { name: /enviar/i }));

    await waitFor(() => {
      expect(screen.getByText(/assistant: Pronto! Criei o protocolo./)).toBeInTheDocument();
    });

    // Simulate user change (logout then login as different user)
    const newUser = { id: 'user-2', email: 'other@test.com' };
    vi.mocked(useAuth).mockReturnValue({ accessToken: 'new-token', user: newUser });

    rerender(
      <AiChatProvider>
        <TestConsumer />
      </AiChatProvider>
    );

    await waitFor(() => {
      const messageCount = document.querySelector('[data-info="messageCount"]');
      expect(messageCount.textContent).toBe('0');
    });
  });
});
