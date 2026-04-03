import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import AiAssistant from './AiAssistant';
import { groupConversationsByDate } from '../../utils/conversationGroups';
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

// Fixed reference date: 2026-03-31 (Tuesday)
const FIXED_NOW = new Date('2026-03-31T12:00:00.000Z');

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
    errorCode: null,
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
    expect(screen.getByLabelText('Assistente digitando')).toBeInTheDocument();
  });

  it('shows streaming text and status message together when both are set', () => {
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({
        loading: true,
        streamingText: 'Perfeito! Criando o protocolo agora.',
        statusMessage: 'Executando ação...',
        messages: [
          { role: 'user', content: 'Crie um protocolo' },
          { role: 'assistant', content: '', isStreaming: true },
        ],
      })
    );

    renderWithRouter(<AiAssistant />);

    expect(screen.getByText('Perfeito! Criando o protocolo agora.')).toBeInTheDocument();
    expect(screen.getByText('Executando ação...')).toBeInTheDocument();
  });

  it('shows streaming text and typing indicator when streaming with no status message', () => {
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({
        loading: true,
        streamingText: 'Processando...',
        statusMessage: '',
        messages: [
          { role: 'user', content: 'Olá' },
          { role: 'assistant', content: '', isStreaming: true },
        ],
      })
    );

    renderWithRouter(<AiAssistant />);

    expect(screen.getByText('Processando...')).toBeInTheDocument();
    expect(screen.getByLabelText('Assistente digitando')).toBeInTheDocument();
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

  it('shows distinct overloaded message when errorCode is AI_OVERLOADED', () => {
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({
        errorRetry: 'Minha mensagem',
        errorCode: 'AI_OVERLOADED',
        messages: [{ role: 'user', content: 'Minha mensagem' }],
      })
    );

    renderWithRouter(<AiAssistant />);

    expect(
      screen.getByText('O assistente está sobrecarregado no momento. Tente novamente em instantes.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Não foi possível processar sua mensagem.')).not.toBeInTheDocument();
  });

  it('shows generic error message when errorCode is not AI_OVERLOADED', () => {
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({
        errorRetry: 'Minha mensagem',
        errorCode: null,
        messages: [{ role: 'user', content: 'Minha mensagem' }],
      })
    );

    renderWithRouter(<AiAssistant />);

    expect(screen.getByText('Não foi possível processar sua mensagem.')).toBeInTheDocument();
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
  // New conversation (header button)
  // ---------------------------------------------------------------------------

  it('calls startNewConversation on "Nova conversa" click (header button)', async () => {
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

    await user.click(screen.getByRole('button', { name: /^nova conversa$/i }));

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

  it('does not show "Nova conversa" button in header when there are no messages', () => {
    renderWithRouter(<AiAssistant />);

    expect(screen.queryByRole('button', { name: /^nova conversa$/i })).not.toBeInTheDocument();
  });

  it('shows "Nova conversa" button in header when there are messages', () => {
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({
        messages: [
          { role: 'user', content: 'Olá' },
          { role: 'assistant', content: 'Resposta', actionsExecuted: [] },
        ],
      })
    );

    renderWithRouter(<AiAssistant />);

    expect(screen.getByRole('button', { name: /^nova conversa$/i })).toBeInTheDocument();
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

  it('shows empty state with icon and text when history is empty', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [] });

    renderWithRouter(<AiAssistant />);

    await user.click(screen.getByRole('button', { name: /histórico de conversas/i }));

    await waitFor(() => {
      expect(screen.getByText('Nenhuma conversa ainda.')).toBeInTheDocument();
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

  it('shows loading state while fetching conversations', async () => {
    let resolveGet;
    api.get.mockReturnValue(new Promise((resolve) => { resolveGet = resolve; }));

    const user = userEvent.setup();
    renderWithRouter(<AiAssistant />);

    await user.click(screen.getByRole('button', { name: /histórico de conversas/i }));

    expect(screen.getByText('Carregando...')).toBeInTheDocument();

    resolveGet({ data: mockConversations });

    await waitFor(() => {
      expect(screen.queryByText('Carregando...')).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // "Nova conversa" button inside the sheet
  // ---------------------------------------------------------------------------

  it('shows "Nova conversa" button inside the history sheet', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockConversations });

    renderWithRouter(<AiAssistant />);

    await user.click(screen.getByRole('button', { name: /histórico de conversas/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /iniciar nova conversa/i })).toBeInTheDocument();
    });
  });

  it('closes history and starts new conversation when clicking "Nova conversa" in sheet', async () => {
    const user = userEvent.setup();
    const startNewConversation = vi.fn();
    vi.mocked(useAiChat).mockReturnValue(createDefaultContextValue({ startNewConversation }));
    api.get.mockResolvedValue({ data: mockConversations });

    renderWithRouter(<AiAssistant />);

    await user.click(screen.getByRole('button', { name: /histórico de conversas/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /iniciar nova conversa/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /iniciar nova conversa/i }));

    expect(startNewConversation).toHaveBeenCalled();
    expect(screen.queryByText('Histórico de conversas')).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Loading state when selecting a conversation
  // ---------------------------------------------------------------------------

  it('calls loadConversation and closes sheet when selecting from history', async () => {
    const user = userEvent.setup();
    const loadConversation = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useAiChat).mockReturnValue(createDefaultContextValue({ loadConversation }));

    api.get.mockResolvedValue({ data: mockConversations });

    renderWithRouter(<AiAssistant />);

    await user.click(screen.getByRole('button', { name: /histórico de conversas/i }));

    await waitFor(() => {
      expect(screen.getByText('Primeira conversa')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /abrir conversa: primeira conversa/i }));

    expect(loadConversation).toHaveBeenCalledWith('conv-1');

    await waitFor(() => {
      expect(screen.queryByText('Histórico de conversas')).not.toBeInTheDocument();
    });
  });

  it('shows toast error and keeps sheet open when loadConversation fails', async () => {
    const user = userEvent.setup();
    const loadConversation = vi.fn().mockRejectedValue({ userMessage: 'Erro ao carregar' });
    vi.mocked(useAiChat).mockReturnValue(createDefaultContextValue({ loadConversation }));

    api.get.mockResolvedValue({ data: mockConversations });

    renderWithRouter(<AiAssistant />);

    await user.click(screen.getByRole('button', { name: /histórico de conversas/i }));

    await waitFor(() => {
      expect(screen.getByText('Primeira conversa')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /abrir conversa: primeira conversa/i }));

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Erro ao carregar', 'error');
    });

    expect(screen.getByText('Histórico de conversas')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Delete flow: close history first, then show confirm dialog
  // ---------------------------------------------------------------------------

  it('closes history and shows confirmation dialog when deleting a conversation', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockConversations });

    renderWithRouter(<AiAssistant />);

    await user.click(screen.getByRole('button', { name: /histórico de conversas/i }));

    await waitFor(() => {
      expect(screen.getByText('Primeira conversa')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /excluir conversa: primeira conversa/i }));

    // History panel should be closed
    expect(screen.queryByText('Histórico de conversas')).not.toBeInTheDocument();

    // Confirm dialog should be shown
    expect(screen.getByText(/Excluir a conversa "Primeira conversa"/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Excluir$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Cancelar$/ })).toBeInTheDocument();
  });

  it('deletes conversation and removes from list on confirm', async () => {
    const user = userEvent.setup();
    // First call returns both; second call (on re-open) returns only the remaining one
    api.get
      .mockResolvedValueOnce({ data: mockConversations })
      .mockResolvedValueOnce({ data: [mockConversations[1]] });
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

    // Re-open history to verify
    await user.click(screen.getByRole('button', { name: /histórico de conversas/i }));

    await waitFor(() => {
      expect(screen.queryByText('Primeira conversa')).not.toBeInTheDocument();
      expect(screen.getByText('Segunda conversa')).toBeInTheDocument();
    });
  });

  it('calls startNewConversation when deleting the active conversation', async () => {
    const user = userEvent.setup();
    const startNewConversation = vi.fn();
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({ startNewConversation, conversationId: 'conv-1' })
    );
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
      expect(startNewConversation).toHaveBeenCalled();
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

    // Confirm dialog is shown, history is closed
    expect(screen.getByText(/Excluir a conversa "Primeira conversa"/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Cancelar$/ }));

    expect(screen.queryByText(/Excluir a conversa "Primeira conversa"/)).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Delete button always visible (no hover dependency)
  // ---------------------------------------------------------------------------

  it('renders the delete button for each conversation item', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockConversations });

    renderWithRouter(<AiAssistant />);

    await user.click(screen.getByRole('button', { name: /histórico de conversas/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /excluir conversa: primeira conversa/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /excluir conversa: segunda conversa/i })).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Conversation preview
  // ---------------------------------------------------------------------------

  it('renders preview when conversation has preview field', async () => {
    const user = userEvent.setup();
    const conversationsWithPreview = [
      {
        id: 'conv-preview',
        title: 'Com preview',
        createdAt: '2026-03-01T10:00:00.000Z',
        updatedAt: '2026-03-01T10:05:00.000Z',
        preview: 'Prévia da mensagem aqui',
      },
    ];
    api.get.mockResolvedValue({ data: conversationsWithPreview });

    renderWithRouter(<AiAssistant />);

    await user.click(screen.getByRole('button', { name: /histórico de conversas/i }));

    await waitFor(() => {
      expect(screen.getByText('Prévia da mensagem aqui')).toBeInTheDocument();
    });
  });

  it('does not render preview element when conversation has no preview', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [mockConversations[0]] });

    renderWithRouter(<AiAssistant />);

    await user.click(screen.getByRole('button', { name: /histórico de conversas/i }));

    await waitFor(() => {
      expect(screen.getByText('Primeira conversa')).toBeInTheDocument();
    });

    expect(screen.queryByText('Prévia da mensagem aqui')).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Markdown rendering
  // ---------------------------------------------------------------------------

  it('renders bold markdown in assistant messages as <strong> element', () => {
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({
        messages: [
          { role: 'user', content: 'Quais os exercícios?' },
          {
            role: 'assistant',
            content: 'Use **agachamento** para pernas.',
            actionsExecuted: [],
          },
        ],
      })
    );

    renderWithRouter(<AiAssistant />);

    const strong = document.querySelector('strong');
    expect(strong).toBeInTheDocument();
    expect(strong.textContent).toBe('agachamento');
  });

  it('does not render markdown in user messages', () => {
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({
        messages: [
          { role: 'user', content: 'Devo fazer **agachamento**?' },
        ],
      })
    );

    renderWithRouter(<AiAssistant />);

    expect(document.querySelector('strong')).not.toBeInTheDocument();
    expect(screen.getByText('Devo fazer **agachamento**?')).toBeInTheDocument();
  });

  it('renders streaming assistant message with markdown', () => {
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({
        loading: true,
        streamingText: 'Faça **3 séries** de agachamento.',
        messages: [
          { role: 'user', content: 'Treino de pernas?' },
          { role: 'assistant', content: '', isStreaming: true },
        ],
      })
    );

    renderWithRouter(<AiAssistant />);

    const strong = document.querySelector('strong');
    expect(strong).toBeInTheDocument();
    expect(strong.textContent).toBe('3 séries');
  });

  it('renders GFM table in assistant messages as an HTML table', () => {
    const tableContent = '| Exercício | Séries |\n| --- | --- |\n| Agachamento | 3 |\n| Leg press | 4 |';
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({
        messages: [
          { role: 'user', content: 'Monte um treino de pernas' },
          { role: 'assistant', content: tableContent, actionsExecuted: [] },
        ],
      })
    );

    renderWithRouter(<AiAssistant />);

    expect(document.querySelector('table')).toBeInTheDocument();
    expect(document.querySelector('th')).toBeInTheDocument();
    expect(screen.getByText('Exercício')).toBeInTheDocument();
    expect(screen.getByText('Agachamento')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// groupConversationsByDate — unit tests with fixed date
// ---------------------------------------------------------------------------

describe('groupConversationsByDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty array for empty input', () => {
    expect(groupConversationsByDate([])).toEqual([]);
  });

  it('groups today conversations correctly', () => {
    const conversations = [
      { id: '1', updatedAt: '2026-03-31T08:00:00.000Z' },
    ];
    const groups = groupConversationsByDate(conversations);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('Hoje');
    expect(groups[0].conversations).toHaveLength(1);
  });

  it('groups yesterday conversations correctly', () => {
    const conversations = [
      { id: '1', updatedAt: '2026-03-30T15:00:00.000Z' },
    ];
    const groups = groupConversationsByDate(conversations);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('Ontem');
  });

  it('groups this week conversations correctly (not today or yesterday)', () => {
    // 2026-03-31 is Tuesday. Monday 2026-03-30 is yesterday.
    // So "Esta semana" would be from Monday to Sunday. Anything before yesterday in the same week:
    // 2026-03-30 is Monday (yesterday), 2026-03-31 is Tuesday (today).
    // Let's pick Saturday of the same week (past): there are none before Monday.
    // Use previous Sunday if week starts Monday: that falls outside.
    // Actually this week (Mon 30 - Sun 5 Apr). Yesterday (Mon 30) = "Ontem". So no "Esta semana" slot fits here.
    // Use a date from same week but 2+ days ago: Mon is the week start = yesterday.
    // Let's test with Sunday being in the previous week (out of scope) and just confirm:
    // A date from current week (Mon-Tue) where Mon = yesterday, Tue = today. Nothing fits "Esta semana".
    // Instead use a different reference day to get a meaningful "Esta semana" test.
    vi.setSystemTime(new Date('2026-04-03T12:00:00.000Z')); // Friday
    const conversations = [
      { id: '1', updatedAt: '2026-04-01T10:00:00.000Z' }, // Wednesday same week
    ];
    const groups = groupConversationsByDate(conversations);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('Esta semana');
  });

  it('groups older conversations correctly', () => {
    const conversations = [
      { id: '1', updatedAt: '2026-03-01T10:00:00.000Z' },
    ];
    const groups = groupConversationsByDate(conversations);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('Anteriores');
  });

  it('does not include empty groups', () => {
    const conversations = [
      { id: '1', updatedAt: '2026-03-31T08:00:00.000Z' }, // today
    ];
    const groups = groupConversationsByDate(conversations);
    const labels = groups.map((g) => g.label);
    expect(labels).toContain('Hoje');
    expect(labels).not.toContain('Ontem');
    expect(labels).not.toContain('Esta semana');
    expect(labels).not.toContain('Anteriores');
  });

  it('sorts conversations within each group by updatedAt desc', () => {
    const conversations = [
      { id: 'older', updatedAt: '2026-03-31T06:00:00.000Z' },
      { id: 'newer', updatedAt: '2026-03-31T10:00:00.000Z' },
    ];
    const groups = groupConversationsByDate(conversations);
    expect(groups[0].conversations[0].id).toBe('newer');
    expect(groups[0].conversations[1].id).toBe('older');
  });

  it('falls back to createdAt when updatedAt is missing', () => {
    const conversations = [
      { id: '1', createdAt: '2026-03-31T08:00:00.000Z' },
    ];
    const groups = groupConversationsByDate(conversations);
    expect(groups[0].label).toBe('Hoje');
  });

  it('puts conversations with invalid dates in "Anteriores"', () => {
    const conversations = [
      { id: '1', updatedAt: 'invalid-date' },
    ];
    const groups = groupConversationsByDate(conversations);
    expect(groups[0].label).toBe('Anteriores');
  });

  it('puts conversations with no date in "Anteriores"', () => {
    const conversations = [
      { id: '1' },
    ];
    const groups = groupConversationsByDate(conversations);
    expect(groups[0].label).toBe('Anteriores');
  });

  it('produces all four groups when data spans all ranges', () => {
    vi.setSystemTime(new Date('2026-04-03T12:00:00.000Z')); // Friday
    const conversations = [
      { id: 'today', updatedAt: '2026-04-03T08:00:00.000Z' },
      { id: 'yesterday', updatedAt: '2026-04-02T08:00:00.000Z' },
      { id: 'week', updatedAt: '2026-04-01T08:00:00.000Z' },
      { id: 'older', updatedAt: '2026-03-01T08:00:00.000Z' },
    ];
    const groups = groupConversationsByDate(conversations);
    const labels = groups.map((g) => g.label);
    expect(labels).toEqual(['Hoje', 'Ontem', 'Esta semana', 'Anteriores']);
  });

  it('sorts across groups: today before older', () => {
    vi.setSystemTime(new Date('2026-04-03T12:00:00.000Z'));
    const conversations = [
      { id: 'older', updatedAt: '2026-03-01T08:00:00.000Z' },
      { id: 'today', updatedAt: '2026-04-03T08:00:00.000Z' },
    ];
    const groups = groupConversationsByDate(conversations);
    expect(groups[0].label).toBe('Hoje');
    expect(groups[0].conversations[0].id).toBe('today');
    expect(groups[1].label).toBe('Anteriores');
    expect(groups[1].conversations[0].id).toBe('older');
  });
});
