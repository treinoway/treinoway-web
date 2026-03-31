import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import AiAssistant from './AiAssistant';
import { useToast } from '../../contexts/ToastContext';
import { useAiChat } from '../../contexts/AiChatContext';
import api from '../../api/axios';

vi.mock('../../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../contexts/AiChatContext', () => ({
  useAiChat: vi.fn(),
}));

vi.mock('../../api/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const mockConversations = [
  {
    id: 'conv-1',
    title: 'Primeira conversa',
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:05:00.000Z',
  },
  {
    id: 'conv-2',
    title: 'Segunda conversa',
    createdAt: '2026-03-02T10:00:00.000Z',
    updatedAt: '2026-03-02T10:05:00.000Z',
  },
];

function createDefaultContextValue(overrides = {}) {
  return {
    messages: [],
    conversationId: null,
    loading: false,
    streamingText: '',
    statusMessage: '',
    hasNewResponse: false,
    errorRetry: null,
    sendMessage: vi.fn(),
    startNewConversation: vi.fn(),
    loadConversation: vi.fn(),
    clearNewResponse: vi.fn(),
    retryLastMessage: vi.fn(),
    ...overrides,
  };
}

describe('AiAssistant', () => {
  let showToast;
  let mockContextValue;

  beforeEach(() => {
    showToast = vi.fn();
    vi.mocked(useToast).mockReturnValue({ showToast });
    mockContextValue = createDefaultContextValue();
    vi.mocked(useAiChat).mockReturnValue(mockContextValue);
    api.get.mockReset();
    api.delete.mockReset();
  });

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  it('renders empty state with example prompts', () => {
    renderWithRouter(<AiAssistant />);

    expect(screen.getByText('Seu assistente de treinos com IA')).toBeInTheDocument();
    expect(screen.getByText(/Use linguagem natural/)).toBeInTheDocument();
    expect(screen.getByText('Crie um protocolo de hipertrofia para o aluno João')).toBeInTheDocument();
    expect(screen.getByText('Monte um treino de pernas com 6 exercícios')).toBeInTheDocument();
    expect(screen.getByText('Adicione um treino de costas ao protocolo do aluno Maria')).toBeInTheDocument();
  });

  it('renders header with Assistente IA title', () => {
    renderWithRouter(<AiAssistant />);

    expect(screen.getByRole('heading', { name: /assistente ia/i })).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Sending messages via context
  // ---------------------------------------------------------------------------

  it('calls sendMessage from context when submitting', async () => {
    const user = userEvent.setup();
    const sendMessage = vi.fn();
    vi.mocked(useAiChat).mockReturnValue(createDefaultContextValue({ sendMessage }));

    renderWithRouter(<AiAssistant />);

    const input = screen.getByRole('textbox', { name: /mensagem para o assistente/i });
    await user.type(input, 'Olá assistente');
    await user.click(screen.getByRole('button', { name: /enviar mensagem/i }));

    expect(sendMessage).toHaveBeenCalledWith('Olá assistente');
  });

  it('clears input after sending', async () => {
    const user = userEvent.setup();
    vi.mocked(useAiChat).mockReturnValue(createDefaultContextValue({ sendMessage: vi.fn() }));

    renderWithRouter(<AiAssistant />);

    const input = screen.getByRole('textbox', { name: /mensagem para o assistente/i });
    await user.type(input, 'Olá');
    await user.click(screen.getByRole('button', { name: /enviar mensagem/i }));

    expect(input).toHaveValue('');
  });

  it('shows messages from context', () => {
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({
        messages: [
          { role: 'user', content: 'Olá' },
          { role: 'assistant', content: 'Como posso ajudar?', actionsExecuted: [] },
        ],
      })
    );

    renderWithRouter(<AiAssistant />);

    expect(screen.getByText('Olá')).toBeInTheDocument();
    expect(screen.getByText('Como posso ajudar?')).toBeInTheDocument();
  });

  it('shows typing indicator when streaming with no text yet', () => {
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({
        loading: true,
        messages: [
          { role: 'user', content: 'Olá' },
          { role: 'assistant', content: '', isStreaming: true },
        ],
      })
    );

    renderWithRouter(<AiAssistant />);

    expect(screen.getByLabelText('Assistente digitando')).toBeInTheDocument();
  });

  it('shows streaming text when available', () => {
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({
        loading: true,
        streamingText: 'Parcial...',
        messages: [
          { role: 'user', content: 'Olá' },
          { role: 'assistant', content: 'Parcial...', isStreaming: true },
        ],
      })
    );

    renderWithRouter(<AiAssistant />);

    expect(screen.getByText('Parcial...')).toBeInTheDocument();
  });

  it('shows status message when available during streaming', () => {
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({
        loading: true,
        statusMessage: 'Analisando...',
        messages: [
          { role: 'user', content: 'Olá' },
          { role: 'assistant', content: '', isStreaming: true },
        ],
      })
    );

    renderWithRouter(<AiAssistant />);

    expect(screen.getByText('Analisando...')).toBeInTheDocument();
  });

  it('disables input and send button while loading', () => {
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({
        loading: true,
        messages: [
          { role: 'user', content: 'Olá' },
          { role: 'assistant', content: '', isStreaming: true },
        ],
      })
    );

    renderWithRouter(<AiAssistant />);

    expect(screen.getByRole('textbox', { name: /mensagem para o assistente/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /enviar mensagem/i })).toBeDisabled();
  });

  // ---------------------------------------------------------------------------
  // Error handling via context
  // ---------------------------------------------------------------------------

  it('shows error card and retry button when errorRetry is set', () => {
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({
        errorRetry: 'Failed message',
        messages: [{ role: 'user', content: 'Failed message' }],
      })
    );

    renderWithRouter(<AiAssistant />);

    expect(screen.getByText('Não foi possível processar sua mensagem.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
  });

  it('calls retryLastMessage when clicking retry', async () => {
    const user = userEvent.setup();
    const retryLastMessage = vi.fn();
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({
        errorRetry: 'Failed message',
        retryLastMessage,
        messages: [{ role: 'user', content: 'Failed message' }],
      })
    );

    renderWithRouter(<AiAssistant />);

    await user.click(screen.getByRole('button', { name: /tentar novamente/i }));

    expect(retryLastMessage).toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // clearNewResponse on mount
  // ---------------------------------------------------------------------------

  it('calls clearNewResponse when hasNewResponse is true on mount', () => {
    const clearNewResponse = vi.fn();
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({ hasNewResponse: true, clearNewResponse })
    );

    renderWithRouter(<AiAssistant />);

    expect(clearNewResponse).toHaveBeenCalled();
  });

  it('does not call clearNewResponse when hasNewResponse is false', () => {
    const clearNewResponse = vi.fn();
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({ hasNewResponse: false, clearNewResponse })
    );

    renderWithRouter(<AiAssistant />);

    expect(clearNewResponse).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // New conversation
  // ---------------------------------------------------------------------------

  it('calls startNewConversation on "Nova conversa" click', async () => {
    const user = userEvent.setup();
    const startNewConversation = vi.fn();
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({
        startNewConversation,
        messages: [
          { role: 'user', content: 'Olá' },
          { role: 'assistant', content: 'Resposta', actionsExecuted: [] },
        ],
      })
    );

    renderWithRouter(<AiAssistant />);

    await user.click(screen.getByRole('button', { name: /nova conversa/i }));

    expect(startNewConversation).toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // UI helpers
  // ---------------------------------------------------------------------------

  it('does not send empty messages', async () => {
    const user = userEvent.setup();
    renderWithRouter(<AiAssistant />);

    const sendBtn = screen.getByRole('button', { name: /enviar mensagem/i });
    expect(sendBtn).toBeDisabled();

    const input = screen.getByRole('textbox', { name: /mensagem para o assistente/i });
    await user.type(input, '   ');

    expect(sendBtn).toBeDisabled();
  });

  it('shows character counter when input exceeds 900 chars', async () => {
    const user = userEvent.setup();
    renderWithRouter(<AiAssistant />);

    const input = screen.getByRole('textbox', { name: /mensagem para o assistente/i });

    expect(screen.queryByText(/\/1000/)).not.toBeInTheDocument();

    const longText = 'a'.repeat(901);
    await user.click(input);
    await user.paste(longText);

    await waitFor(() => {
      expect(screen.getByText('901/1000')).toBeInTheDocument();
    });
  });

  it('shows action badge when actionsExecuted has successful items', () => {
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({
        messages: [
          { role: 'user', content: 'Crie um protocolo' },
          {
            role: 'assistant',
            content: 'Protocolo criado!',
            actionsExecuted: [{ tool: 'import_from_template', success: true, data: {} }],
          },
        ],
      })
    );

    renderWithRouter(<AiAssistant />);

    expect(screen.getByText('Protocolo criado')).toBeInTheDocument();
  });

  it('fills input when clicking an example prompt', async () => {
    const user = userEvent.setup();
    renderWithRouter(<AiAssistant />);

    await user.click(screen.getByText('Monte um treino de pernas com 6 exercícios'));

    expect(screen.getByRole('textbox', { name: /mensagem para o assistente/i })).toHaveValue(
      'Monte um treino de pernas com 6 exercícios'
    );
  });

  it('does not show "Nova conversa" button when there are no messages', () => {
    renderWithRouter(<AiAssistant />);

    expect(screen.queryByRole('button', { name: /nova conversa/i })).not.toBeInTheDocument();
  });

  it('shows "Nova conversa" button when there are messages', () => {
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({
        messages: [
          { role: 'user', content: 'Olá' },
          { role: 'assistant', content: 'Resposta', actionsExecuted: [] },
        ],
      })
    );

    renderWithRouter(<AiAssistant />);

    expect(screen.getByRole('button', { name: /nova conversa/i })).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Conversation history panel
  // ---------------------------------------------------------------------------

  it('shows "Histórico" button always', () => {
    renderWithRouter(<AiAssistant />);

    expect(screen.getByRole('button', { name: /histórico de conversas/i })).toBeInTheDocument();
  });

  it('opens history panel and loads conversations when clicking "Histórico"', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockConversations });

    renderWithRouter(<AiAssistant />);

    await user.click(screen.getByRole('button', { name: /histórico de conversas/i }));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/trainer/ai/conversations');
    });

    await waitFor(() => {
      expect(screen.getByText('Histórico de conversas')).toBeInTheDocument();
      expect(screen.getByText('Primeira conversa')).toBeInTheDocument();
      expect(screen.getByText('Segunda conversa')).toBeInTheDocument();
    });
  });

  it('shows "Nenhuma conversa encontrada." when history is empty', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [] });

    renderWithRouter(<AiAssistant />);

    await user.click(screen.getByRole('button', { name: /histórico de conversas/i }));

    await waitFor(() => {
      expect(screen.getByText('Nenhuma conversa encontrada.')).toBeInTheDocument();
    });
  });

  it('closes history panel when clicking the close button', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockConversations });

    renderWithRouter(<AiAssistant />);

    await user.click(screen.getByRole('button', { name: /histórico de conversas/i }));

    await waitFor(() => {
      expect(screen.getByText('Histórico de conversas')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /fechar histórico/i }));

    expect(screen.queryByText('Histórico de conversas')).not.toBeInTheDocument();
  });

  it('calls loadConversation when selecting from history', async () => {
    const user = userEvent.setup();
    const loadConversation = vi.fn();
    vi.mocked(useAiChat).mockReturnValue(createDefaultContextValue({ loadConversation }));

    api.get.mockResolvedValue({ data: mockConversations });

    renderWithRouter(<AiAssistant />);

    await user.click(screen.getByRole('button', { name: /histórico de conversas/i }));

    await waitFor(() => {
      expect(screen.getByText('Primeira conversa')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /abrir conversa: primeira conversa/i }));

    expect(loadConversation).toHaveBeenCalledWith('conv-1');
  });

  it('shows confirmation dialog when deleting a conversation', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockConversations });

    renderWithRouter(<AiAssistant />);

    await user.click(screen.getByRole('button', { name: /histórico de conversas/i }));

    await waitFor(() => {
      expect(screen.getByText('Primeira conversa')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /excluir conversa: primeira conversa/i }));

    expect(screen.getByText(/Excluir a conversa "Primeira conversa"/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Excluir$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Cancelar$/ })).toBeInTheDocument();
  });

  it('deletes conversation and removes from list on confirm', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockConversations });
    api.delete.mockResolvedValue({});

    renderWithRouter(<AiAssistant />);

    await user.click(screen.getByRole('button', { name: /histórico de conversas/i }));

    await waitFor(() => {
      expect(screen.getByText('Primeira conversa')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /excluir conversa: primeira conversa/i }));
    await user.click(screen.getByRole('button', { name: /^Excluir$/ }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/trainer/ai/conversations/conv-1');
    });

    await waitFor(() => {
      expect(screen.queryByText('Primeira conversa')).not.toBeInTheDocument();
      expect(screen.getByText('Segunda conversa')).toBeInTheDocument();
    });
  });

  it('dismisses confirmation dialog on cancel', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockConversations });

    renderWithRouter(<AiAssistant />);

    await user.click(screen.getByRole('button', { name: /histórico de conversas/i }));

    await waitFor(() => {
      expect(screen.getByText('Primeira conversa')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /excluir conversa: primeira conversa/i }));
    await user.click(screen.getByRole('button', { name: /^Cancelar$/ }));

    expect(screen.queryByText(/Excluir a conversa "Primeira conversa"/)).not.toBeInTheDocument();

    expect(screen.getByText('Primeira conversa')).toBeInTheDocument();
    expect(screen.getByText('Segunda conversa')).toBeInTheDocument();
  });
});
