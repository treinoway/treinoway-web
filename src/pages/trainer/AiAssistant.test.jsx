import { screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { renderWithRouter } from '../../test/test-utils';
import AiAssistant from './AiAssistant';
import { groupConversationsByDate } from '../../utils/conversationGroups';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAiChat } from '../../contexts/AiChatContext';
import api from '../../api/axios';
import * as useStickToBottomModule from '../../hooks/useStickToBottom';

vi.mock('../../contexts/ToastContext', () => ({
  useToast: vi.fn(),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
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

vi.mock('../../hooks/useStickToBottom', () => ({
  default: vi.fn(),
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

  let mockScrollToBottom;

  beforeEach(() => {
    showToast = vi.fn();
    vi.mocked(useToast).mockReturnValue({ showToast });
    vi.mocked(useAuth).mockReturnValue({
      user: { firstName: 'João', lastName: 'Silva', email: 'joao@test.com' },
    });
    mockContextValue = createDefaultContextValue();
    vi.mocked(useAiChat).mockReturnValue(mockContextValue);
    api.get.mockReset();
    api.delete.mockReset();

    mockScrollToBottom = vi.fn();
    vi.mocked(useStickToBottomModule.default).mockReturnValue({
      isNearBottom: true,
      shouldFollow: true,
      scrollToBottom: mockScrollToBottom,
      onScroll: vi.fn(),
      bottomRef: { current: null },
    });
  });

  // ---------------------------------------------------------------------------
  // Empty state — layout structure
  // ---------------------------------------------------------------------------

  it('renders empty state with header and briefing in normal page flow', () => {
    renderWithRouter(<AiAssistant />);

    expect(screen.getByRole('heading', { name: 'iArnold', level: 1 })).toBeInTheDocument();

    // No scroll-area wrapper — page scroll is used instead
    expect(document.querySelector('.ai-chat__scroll-area')).not.toBeInTheDocument();

    // Briefing, create cards and prompts render directly
    expect(screen.getByLabelText('Briefing de alunos')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Criar rotina completa' })).toBeInTheDocument();
    expect(screen.getByText('Atenção')).toBeInTheDocument();
  });

  it('renders messages view with .ai-chat__messages when messages are present', () => {
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({
        messages: [
          { role: 'user', content: 'Olá' },
          { role: 'assistant', content: 'Oi!', actionsExecuted: [] },
        ],
      })
    );

    renderWithRouter(<AiAssistant />);

    expect(document.querySelector('.ai-chat__scroll-area')).not.toBeInTheDocument();
    expect(document.querySelector('.ai-chat__messages')).toBeInTheDocument();
  });

  it('header is always rendered regardless of messages state', () => {
    // Empty state
    const { unmount } = renderWithRouter(<AiAssistant />);
    expect(screen.getByRole('heading', { name: 'iArnold', level: 1 })).toBeInTheDocument();
    unmount();

    // Messages state
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({
        messages: [{ role: 'user', content: 'Oi' }],
      })
    );
    renderWithRouter(<AiAssistant />);
    expect(screen.getByRole('heading', { name: 'iArnold', level: 1 })).toBeInTheDocument();
  });

  it('renders briefing strip placeholders', () => {
    renderWithRouter(<AiAssistant />);

    expect(screen.getByLabelText('Briefing de alunos')).toBeInTheDocument();
    expect(screen.getByText('Alunos ativos')).toBeInTheDocument();
    expect(screen.getByText('Progresso estagnado')).toBeInTheDocument();
    expect(screen.getByText('Inativos')).toBeInTheDocument();
    expect(screen.getByText('Adesão geral')).toBeInTheDocument();
  });

  it('renders create cards with correct titles', () => {
    renderWithRouter(<AiAssistant />);

    expect(screen.getByRole('heading', { name: 'Criar rotina completa' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Montar treino' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Plano alimentar' })).toBeInTheDocument();
  });

  it('fills input when clicking a create card', async () => {
    const user = userEvent.setup();
    renderWithRouter(<AiAssistant />);

    await user.click(screen.getByRole('heading', { name: 'Criar rotina completa' }).closest('button'));

    expect(screen.getByRole('textbox', { name: /mensagem para o assistente/i })).toHaveValue(
      'Crie uma rotina de hipertrofia de 8 semanas para um aluno intermediário com 4 treinos por semana'
    );
  });

  it('fills input when clicking a contextual prompt row', async () => {
    const user = userEvent.setup();
    renderWithRouter(<AiAssistant />);

    // Click the first prompt row (Atenção / Reativar Aluno A)
    const promptRows = screen.getAllByRole('button', { name: /aluno a/i });
    await user.click(promptRows[0]);

    expect(screen.getByRole('textbox', { name: /mensagem para o assistente/i })).toHaveValue(
      'Sugira uma mensagem de reengajamento e ajuste de rotina para um aluno que não treina há 9 dias'
    );
  });

  it('renders contextual prompts with correct tags', () => {
    renderWithRouter(<AiAssistant />);

    expect(screen.getByText('Atenção')).toBeInTheDocument();
    // Two rows with "Progresso" tag
    expect(screen.getAllByText('Progresso').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Dieta')).toBeInTheDocument();
    expect(screen.getByText('Análise')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Composer toolbar
  // ---------------------------------------------------------------------------

  it('renders composer toolbar buttons', () => {
    renderWithRouter(<AiAssistant />);

    expect(screen.getByRole('button', { name: /anexar arquivo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /selecionar aluno/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /abrir biblioteca/i })).toBeInTheDocument();
  });

  it('shows toast when clicking the attach button', async () => {
    const user = userEvent.setup();
    renderWithRouter(<AiAssistant />);

    await user.click(screen.getByRole('button', { name: /anexar arquivo/i }));

    expect(showToast).toHaveBeenCalledWith('Em breve!', 'info');
  });

  it('shows toast when clicking the student selector button', async () => {
    const user = userEvent.setup();
    renderWithRouter(<AiAssistant />);

    await user.click(screen.getByRole('button', { name: /selecionar aluno/i }));

    expect(showToast).toHaveBeenCalledWith('Em breve!', 'info');
  });

  it('shows toast when clicking the biblioteca button', async () => {
    const user = userEvent.setup();
    renderWithRouter(<AiAssistant />);

    await user.click(screen.getByRole('button', { name: /abrir biblioteca/i }));

    expect(showToast).toHaveBeenCalledWith('Em breve!', 'info');
  });

  it('renders composer meta line with context chip', () => {
    renderWithRouter(<AiAssistant />);

    expect(screen.getByText(/contexto ativo: 24 alunos/i)).toBeInTheDocument();
    expect(screen.getByText(/iArnold tem acesso aos dados/i)).toBeInTheDocument();
    expect(screen.getByText('Powered by Claude')).toBeInTheDocument();
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

  it('shows messages from context with avatars', () => {
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
    // User avatar with initials
    expect(screen.getByText('JS')).toBeInTheDocument();
    // Message labels
    expect(screen.getByText('Você')).toBeInTheDocument();
    expect(screen.getByText('iArnold', { selector: '.ai-chat__message-label' })).toBeInTheDocument();
  });

  it('shows skeleton when streaming (no raw text rendered)', () => {
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

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByLabelText('Assistente digitando')).not.toBeInTheDocument();
  });

  it('skeleton renders a phrase from the pool when no statusMessage', () => {
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({
        loading: true,
        statusMessage: '',
        messages: [
          { role: 'user', content: 'Olá' },
          { role: 'assistant', content: '', isStreaming: true },
        ],
      })
    );

    renderWithRouter(<AiAssistant />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    // The skeleton rotates through athletic phrases — assert the status
    // element is present rather than pinning to a specific phrase.
    expect(document.querySelector('.streaming-skeleton__status-text')).toBeInTheDocument();
  });

  it('skeleton does not render streaming text tokens as visible content', () => {
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({
        loading: true,
        streamingText: 'Perfeito! Criando o protocolo agora.',
        statusMessage: 'Executando ação...',
        messages: [
          { role: 'user', content: 'Crie um protocolo' },
          { role: 'assistant', content: 'Perfeito! Criando o protocolo agora.', isStreaming: true },
        ],
      })
    );

    renderWithRouter(<AiAssistant />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Perfeito! Criando o protocolo agora.')).not.toBeInTheDocument();
  });

  it('skeleton shows statusMessage from context when streaming', () => {
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

    expect(screen.getByRole('status')).toBeInTheDocument();
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
  // Header action buttons
  // ---------------------------------------------------------------------------

  it('renders history button in empty state', () => {
    renderWithRouter(<AiAssistant />);

    expect(screen.getByRole('button', { name: /^histórico$/i })).toBeInTheDocument();
  });



  it('renders nova conversa button in empty state', () => {
    renderWithRouter(<AiAssistant />);

    expect(screen.getByRole('button', { name: /^nova conversa$/i })).toBeInTheDocument();
  });

  it('calls startNewConversation when clicking nova conversa button in messages view', async () => {
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
      expect(screen.getByText(/901\/1000/)).toBeInTheDocument();
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

  // ---------------------------------------------------------------------------
  // Conversation history panel
  // ---------------------------------------------------------------------------

  it('opens history panel and loads conversations when clicking history button', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockConversations });

    renderWithRouter(<AiAssistant />);

    await user.click(screen.getByRole('button', { name: /^histórico$/i }));

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

    await user.click(screen.getByRole('button', { name: /^histórico$/i }));

    await waitFor(() => {
      expect(screen.getByText('Nenhuma conversa ainda.')).toBeInTheDocument();
    });
  });

  it('closes history panel when clicking the close button', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockConversations });

    renderWithRouter(<AiAssistant />);

    await user.click(screen.getByRole('button', { name: /^histórico$/i }));

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

    await user.click(screen.getByRole('button', { name: /^histórico$/i }));

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

    await user.click(screen.getByRole('button', { name: /^histórico$/i }));

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

    await user.click(screen.getByRole('button', { name: /^histórico$/i }));

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

    await user.click(screen.getByRole('button', { name: /^histórico$/i }));

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

    await user.click(screen.getByRole('button', { name: /^histórico$/i }));

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

    await user.click(screen.getByRole('button', { name: /^histórico$/i }));

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
    api.get
      .mockResolvedValueOnce({ data: mockConversations })
      .mockResolvedValueOnce({ data: [mockConversations[1]] });
    api.delete.mockResolvedValue({});

    renderWithRouter(<AiAssistant />);

    await user.click(screen.getByRole('button', { name: /^histórico$/i }));

    await waitFor(() => {
      expect(screen.getByText('Primeira conversa')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /excluir conversa: primeira conversa/i }));
    await user.click(screen.getByRole('button', { name: /^Excluir$/ }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/trainer/ai/conversations/conv-1');
    });

    // Re-open history to verify
    await user.click(screen.getByRole('button', { name: /^histórico$/i }));

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

    await user.click(screen.getByRole('button', { name: /^histórico$/i }));

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

    await user.click(screen.getByRole('button', { name: /^histórico$/i }));

    await waitFor(() => {
      expect(screen.getByText('Primeira conversa')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /excluir conversa: primeira conversa/i }));

    expect(screen.getByText(/Excluir a conversa "Primeira conversa"/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Cancelar$/ }));

    expect(screen.queryByText(/Excluir a conversa "Primeira conversa"/)).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Delete button always visible
  // ---------------------------------------------------------------------------

  it('renders the delete button for each conversation item', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockConversations });

    renderWithRouter(<AiAssistant />);

    await user.click(screen.getByRole('button', { name: /^histórico$/i }));

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

    await user.click(screen.getByRole('button', { name: /^histórico$/i }));

    await waitFor(() => {
      expect(screen.getByText('Prévia da mensagem aqui')).toBeInTheDocument();
    });
  });

  it('does not render preview element when conversation has no preview', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [mockConversations[0]] });

    renderWithRouter(<AiAssistant />);

    await user.click(screen.getByRole('button', { name: /^histórico$/i }));

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

  it('renders skeleton during streaming — no markdown parsed, no raw tokens visible', () => {
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({
        loading: true,
        streamingText: 'Faça **3 séries** de agachamento.',
        messages: [
          { role: 'user', content: 'Treino de pernas?' },
          { role: 'assistant', content: 'Faça **3 séries** de agachamento.', isStreaming: true },
        ],
      })
    );

    renderWithRouter(<AiAssistant />);

    // Skeleton is shown — neither parsed markdown nor raw token text visible
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(document.querySelector('strong')).not.toBeInTheDocument();
    expect(screen.queryByText('Faça **3 séries** de agachamento.')).not.toBeInTheDocument();
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

  // ---------------------------------------------------------------------------
  // Scroll pill — visibility and variant
  // ---------------------------------------------------------------------------

  it('pill is not visible when user is at bottom and not loading', () => {
    vi.mocked(useStickToBottomModule.default).mockReturnValue({
      isNearBottom: true,
      shouldFollow: true,
      scrollToBottom: mockScrollToBottom,
      onScroll: vi.fn(),
      bottomRef: { current: null },
    });

    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({
        messages: [
          { role: 'user', content: 'Olá' },
          { role: 'assistant', content: 'Oi!', actionsExecuted: [] },
        ],
        loading: false,
      })
    );

    renderWithRouter(<AiAssistant />);

    const pill = document.querySelector('.scroll-pill');
    expect(pill).toHaveClass('scroll-pill--hidden');
  });

  it('pill shows "new" variant after done fires while user is scrolled away', async () => {
    // User is scrolled away and shouldFollow is false
    vi.mocked(useStickToBottomModule.default).mockReturnValue({
      isNearBottom: false,
      shouldFollow: false,
      scrollToBottom: mockScrollToBottom,
      onScroll: vi.fn(),
      bottomRef: { current: null },
    });

    // Start: loading = true (streaming in progress)
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({
        messages: [
          { role: 'user', content: 'Olá' },
          { role: 'assistant', content: '', isStreaming: true },
        ],
        loading: true,
      })
    );

    const { rerender } = renderWithRouter(<AiAssistant />);

    // Pill is hidden while streaming — no completed response yet
    expect(document.querySelector('.scroll-pill')).toHaveClass('scroll-pill--hidden');

    // Simulate done: loading flips to false, message is complete
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({
        messages: [
          { role: 'user', content: 'Olá' },
          { role: 'assistant', content: 'Resposta completa.', actionsExecuted: [] },
        ],
        loading: false,
      })
    );

    await act(async () => {
      rerender(
        <MemoryRouter initialEntries={['/']}>
          <AiAssistant />
        </MemoryRouter>
      );
    });

    // Pill is now visible — "new" variant (accent dot, not pulse)
    expect(document.querySelector('.scroll-pill')).not.toHaveClass('scroll-pill--hidden');
    expect(document.querySelector('.scroll-pill__dot--accent')).toBeInTheDocument();
    expect(document.querySelector('.scroll-pill__dot--pulse')).not.toBeInTheDocument();
  });

  it('pill click calls scrollToBottom', async () => {
    const user = userEvent.setup();

    vi.mocked(useStickToBottomModule.default).mockReturnValue({
      isNearBottom: false,
      shouldFollow: false,
      scrollToBottom: mockScrollToBottom,
      onScroll: vi.fn(),
      bottomRef: { current: null },
    });

    // Start loading, then transition to done to make pill visible
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({
        messages: [{ role: 'user', content: 'Olá' }],
        loading: true,
      })
    );

    const { rerender } = renderWithRouter(<AiAssistant />);

    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({
        messages: [
          { role: 'user', content: 'Olá' },
          { role: 'assistant', content: 'Resposta.', actionsExecuted: [] },
        ],
        loading: false,
      })
    );

    await act(async () => {
      rerender(
        <MemoryRouter initialEntries={['/']}>
          <AiAssistant />
        </MemoryRouter>
      );
    });

    await user.click(
      screen.getByRole('button', { name: 'Ir para a resposta mais recente' })
    );

    expect(mockScrollToBottom).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('scrollToBottom is called with smooth when sending a message', async () => {
    const user = userEvent.setup();
    const sendMessage = vi.fn().mockResolvedValue(undefined);

    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({ sendMessage })
    );

    renderWithRouter(<AiAssistant />);

    const input = screen.getByRole('textbox', { name: /mensagem para o assistente/i });
    await user.type(input, 'Olá iArnold');
    await user.click(screen.getByRole('button', { name: /enviar mensagem/i }));

    expect(mockScrollToBottom).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('messages container has aria-live=polite when messages are present', () => {
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({
        messages: [
          { role: 'user', content: 'Olá' },
          { role: 'assistant', content: 'Oi!', actionsExecuted: [] },
        ],
      })
    );

    renderWithRouter(<AiAssistant />);

    const container = document.querySelector('.ai-chat__messages');
    expect(container).toHaveAttribute('aria-live', 'polite');
  });

  it('streaming message bubble has aria-busy=true', () => {
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({
        messages: [
          { role: 'user', content: 'Olá' },
          { role: 'assistant', content: '', isStreaming: true },
        ],
        loading: true,
      })
    );

    renderWithRouter(<AiAssistant />);

    const streamingBubble = document.querySelector('[aria-busy="true"]');
    expect(streamingBubble).toBeInTheDocument();
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
  });
});
