import { screen, waitFor, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { renderWithRouter } from '../../test/test-utils';
import AiAssistant from './AiAssistant';
import { groupConversationsByDate } from '../../utils/conversationGroups';
import { getTranslations } from '../../i18n';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAiChat } from '../../contexts/AiChatContext';
import api from '../../api/axios';
import * as useStickToBottomModule from '../../hooks/useStickToBottom';
import * as useTrainerBriefingModule from '../../hooks/useTrainerBriefing';

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

vi.mock('../../hooks/useTrainerBriefing', () => ({
  default: vi.fn(),
}));

const mockBriefingData = {
  activeStudents: 24,
  returningThisWeek: 2,
  stagnantProgress: 3,
  inactiveStudents: 2,
  overallAdherence: '87.00',
  adherenceDeltaPp: '4.00',
  computedAt: '2026-05-15T22:00:00.000Z',
};

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
    statusMessage: '',
    hasNewResponse: false,
    errorRetry: null,
    errorCode: null,
    errorMessage: null,
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

    // Default: briefing loaded successfully
    vi.mocked(useTrainerBriefingModule.default).mockReturnValue({
      data: mockBriefingData,
      loading: false,
      error: null,
    });

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

    // Briefing, create cards and prompts render directly
    expect(screen.getByLabelText('Briefing de alunos')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Criar rotina completa' })).toBeInTheDocument();
  });

  it('renders the conversation list when messages are present', () => {
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({
        messages: [
          { role: 'user', content: 'Olá' },
          { role: 'assistant', content: 'Oi!', actionsExecuted: [] },
        ],
      })
    );

    renderWithRouter(<AiAssistant />);

    expect(screen.getByRole('list', { name: 'Conversa com iArnold' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Briefing de alunos')).not.toBeInTheDocument();
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

  // ---------------------------------------------------------------------------
  // Briefing strip — success state
  // ---------------------------------------------------------------------------

  it('renders briefing strip with stat labels on success', () => {
    renderWithRouter(<AiAssistant />);

    expect(screen.getByLabelText('Briefing de alunos')).toBeInTheDocument();
    expect(screen.getByText('Alunos ativos')).toBeInTheDocument();
    expect(screen.getByText('Progresso estagnado')).toBeInTheDocument();
    expect(screen.getByText('Inativos')).toBeInTheDocument();
    expect(screen.getByText('Adesão geral')).toBeInTheDocument();
  });

  it('renders real stat values in briefing strip on success', () => {
    renderWithRouter(<AiAssistant />);

    // activeStudents = 24
    expect(screen.getByText('24')).toBeInTheDocument();
    // stagnantProgress = 3
    expect(screen.getByText('3')).toBeInTheDocument();
    // inactiveStudents = 2
    expect(screen.getByText('2')).toBeInTheDocument();
    // overallAdherence = 87%
    expect(screen.getByText('87%')).toBeInTheDocument();
  });

  it('renders trend lines for active and adherence stats', () => {
    renderWithRouter(<AiAssistant />);

    expect(screen.getByText('+2 esta semana')).toBeInTheDocument();
    expect(screen.getByText('+4pp vs mês ant.')).toBeInTheDocument();
  });

  it('renders static trend lines for stagnant and inactive stats', () => {
    renderWithRouter(<AiAssistant />);

    expect(screen.getByText('Sem evolução 14+ dias')).toBeInTheDocument();
    expect(screen.getByText('Sem treino há 7+ dias')).toBeInTheDocument();
  });

  it('renders timestamp from computedAt in briefing strip', () => {
    renderWithRouter(<AiAssistant />);

    // computedAt = '2026-05-15T22:00:00.000Z' — rendered as "Atualizado HH:MM"
    expect(screen.getByText(/^Atualizado \d{2}:\d{2}$/)).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Briefing strip — loading state
  // ---------------------------------------------------------------------------

  it('renders 4 skeleton tiles while briefing is loading', () => {
    vi.mocked(useTrainerBriefingModule.default).mockReturnValue({
      data: null,
      loading: true,
      error: null,
    });

    renderWithRouter(<AiAssistant />);

    // Labels still visible during skeleton
    expect(screen.getByText('Alunos ativos')).toBeInTheDocument();
    expect(screen.getByText('Progresso estagnado')).toBeInTheDocument();
    expect(screen.getByText('Inativos')).toBeInTheDocument();
    expect(screen.getByText('Adesão geral')).toBeInTheDocument();

    // No numeric values rendered while loading
    expect(screen.queryByText('24')).not.toBeInTheDocument();
    expect(screen.queryByText('87%')).not.toBeInTheDocument();

    const tiles = within(screen.getByLabelText('Briefing de alunos')).getAllByRole('listitem');
    expect(tiles).toHaveLength(4);
  });

  it('shows loading text in timestamp while briefing is loading', () => {
    vi.mocked(useTrainerBriefingModule.default).mockReturnValue({
      data: null,
      loading: true,
      error: null,
    });

    renderWithRouter(<AiAssistant />);

    expect(screen.getByText('Carregando...')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Briefing strip — error state
  // ---------------------------------------------------------------------------

  it('renders inline error message when briefing fetch fails', () => {
    vi.mocked(useTrainerBriefingModule.default).mockReturnValue({
      data: null,
      loading: false,
      error: 'Não foi possível carregar o briefing',
    });

    renderWithRouter(<AiAssistant />);

    expect(screen.getByText('Não foi possível carregar o briefing')).toBeInTheDocument();
    // Stat labels should not be rendered in error state
    expect(screen.queryByText('Alunos ativos')).not.toBeInTheDocument();
    // Header itself stays visible
    expect(screen.getByRole('heading', { name: 'iArnold', level: 1 })).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Briefing strip — zero / empty data
  // ---------------------------------------------------------------------------

  it('renders zero values normally (no special empty state)', () => {
    vi.mocked(useTrainerBriefingModule.default).mockReturnValue({
      data: {
        activeStudents: 0,
        returningThisWeek: 0,
        stagnantProgress: 0,
        inactiveStudents: 0,
        overallAdherence: '0.00',
        adherenceDeltaPp: '0.00',
        computedAt: '2026-05-15T22:00:00.000Z',
      },
      loading: false,
      error: null,
    });

    renderWithRouter(<AiAssistant />);

    expect(screen.getAllByText('0')).toHaveLength(3); // activeStudents, stagnantProgress, inactiveStudents
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('0pp vs mês ant.')).toBeInTheDocument();
    expect(screen.queryByText('Não foi possível carregar o briefing')).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Header action buttons
  // ---------------------------------------------------------------------------

  it('renders Histórico and Nova conversa buttons in page header', () => {
    renderWithRouter(<AiAssistant />);

    expect(screen.getByRole('button', { name: /^histórico$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^nova conversa$/i })).toBeInTheDocument();
  });

  it('calls startNewConversation when clicking Nova conversa button', async () => {
    const user = userEvent.setup();
    const startNewConversation = vi.fn();
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({ startNewConversation })
    );

    renderWithRouter(<AiAssistant />);

    await user.click(screen.getByRole('button', { name: /^nova conversa$/i }));

    expect(startNewConversation).toHaveBeenCalled();
  });

  it('calls startNewConversation when clicking Nova conversa button in messages view', async () => {
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
  // Composer meta line
  // ---------------------------------------------------------------------------

  it('shows "Contexto ativo: 24 alunos" in meta line with real data', () => {
    renderWithRouter(<AiAssistant />);

    expect(screen.getByText(/contexto ativo: 24 alunos/i)).toBeInTheDocument();
  });

  it('shows "Contexto ativo" without count when briefing not yet loaded', () => {
    vi.mocked(useTrainerBriefingModule.default).mockReturnValue({
      data: null,
      loading: true,
      error: null,
    });

    renderWithRouter(<AiAssistant />);

    expect(screen.getByText('Contexto ativo')).toBeInTheDocument();
    expect(screen.queryByText(/contexto ativo: \d+ alunos/i)).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Create cards
  // ---------------------------------------------------------------------------

  it('renders create cards with correct titles', () => {
    renderWithRouter(<AiAssistant />);

    expect(screen.getByRole('heading', { name: 'Criar rotina completa' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Montar treino' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cadastrar exercício' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Aplicar rotina a um aluno' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ajustar treino de um aluno' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Analisar desempenho' })).toBeInTheDocument();
  });

  it('shows nothing about nutrition or diets anywhere on the page', () => {
    const { container } = renderWithRouter(<AiAssistant />);

    expect(container.textContent).not.toMatch(/dieta|nutri|alimentar|cutting/i);
    expect(screen.queryByRole('heading', { name: /plano alimentar/i })).not.toBeInTheDocument();
  });

  it('fills input when clicking a create card', async () => {
    const user = userEvent.setup();
    const sendMessage = vi.fn();
    vi.mocked(useAiChat).mockReturnValue(createDefaultContextValue({ sendMessage }));
    renderWithRouter(<AiAssistant />);

    await user.click(screen.getByRole('button', { name: 'Aplicar rotina a um aluno' }));

    expect(screen.getByRole('textbox', { name: /mensagem para o assistente/i })).toHaveValue(
      'Aplique a rotina {nome da rotina} para o aluno {nome do aluno} a partir de {data de início}'
    );
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('selects the first placeholder so the trainer can type over it', async () => {
    const user = userEvent.setup();
    renderWithRouter(<AiAssistant />);

    await user.click(screen.getByRole('button', { name: 'Aplicar rotina a um aluno' }));

    const textbox = screen.getByRole('textbox', { name: /mensagem para o assistente/i });
    expect(textbox).toHaveFocus();
    expect(textbox.value.slice(textbox.selectionStart, textbox.selectionEnd)).toBe('{nome da rotina}');
  });

  it('keeps sending blocked until every placeholder is replaced', async () => {
    const user = userEvent.setup();
    const sendMessage = vi.fn();
    vi.mocked(useAiChat).mockReturnValue(createDefaultContextValue({ sendMessage }));
    renderWithRouter(<AiAssistant />);

    await user.click(screen.getByRole('button', { name: 'Analisar desempenho' }));
    const textbox = screen.getByRole('textbox', { name: /mensagem para o assistente/i });
    await user.keyboard('{Enter}');

    expect(screen.getByRole('button', { name: /enviar mensagem/i })).toBeDisabled();
    expect(sendMessage).not.toHaveBeenCalled();
    expect(textbox).toHaveAccessibleDescription('Preencha os campos entre chaves antes de enviar');

    await user.keyboard('Ana');
    await user.keyboard('{Enter}');

    expect(sendMessage).toHaveBeenCalledWith(expect.stringMatching(/^Analise o desempenho do aluno Ana:/));
  });

  it('renders composer meta line with context chip', () => {
    renderWithRouter(<AiAssistant />);

    expect(screen.getByText(/contexto ativo: 24 alunos/i)).toBeInTheDocument();
    expect(screen.getByText(/iArnold tem acesso aos seus alunos, rotinas, treinos, exercícios e desempenho/i)).toBeInTheDocument();
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
    expect(screen.getByText('JS')).toBeInTheDocument();
    expect(screen.getByText('Você')).toBeInTheDocument();
    const conversation = screen.getByRole('list', { name: 'Conversa com iArnold' });
    expect(within(conversation).getByText('iArnold')).toBeInTheDocument();
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

    const { phrases } = getTranslations().iArnold.skeleton;
    expect(phrases.some((phrase) => screen.queryByText(phrase))).toBe(true);
    expect(screen.getByRole('status')).toHaveTextContent('iArnold está processando sua pergunta');
  });

  it('skeleton does not render streaming text tokens as visible content', () => {
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({
        loading: true,
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

    expect(screen.getByRole('status')).toHaveTextContent('Analisando...');
    expect(screen.getAllByText('Analisando...').length).toBeGreaterThanOrEqual(1);
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
        errorMessage: 'Mensagem de erro traduzida.',
        messages: [{ role: 'user', content: 'Failed message' }],
      })
    );

    renderWithRouter(<AiAssistant />);

    expect(screen.getByText('Mensagem de erro traduzida.')).toBeInTheDocument();
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

    expect(screen.getByText('Rotina aplicada')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Conversation history panel
  // ---------------------------------------------------------------------------

  it('opens history panel and loads conversations when clicking history button', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockConversations });

    renderWithRouter(<AiAssistant />);

    const historyBtns = screen.getAllByRole('button', { name: /^histórico$/i });
    await user.click(historyBtns[0]);

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

    const historyBtns = screen.getAllByRole('button', { name: /^histórico$/i });
    await user.click(historyBtns[0]);

    await waitFor(() => {
      expect(screen.getByText('Nenhuma conversa ainda.')).toBeInTheDocument();
    });
  });

  it('closes history panel when clicking the close button', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockConversations });

    renderWithRouter(<AiAssistant />);

    const historyBtns = screen.getAllByRole('button', { name: /^histórico$/i });
    await user.click(historyBtns[0]);

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

    const historyBtns = screen.getAllByRole('button', { name: /^histórico$/i });
    await user.click(historyBtns[0]);

    expect(screen.getByRole('status', { name: 'Carregando conversas' })).toBeInTheDocument();

    resolveGet({ data: mockConversations });

    await waitFor(() => {
      expect(screen.queryByRole('status', { name: 'Carregando conversas' })).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // "Nova conversa" button inside the sheet
  // ---------------------------------------------------------------------------

  it('shows "Nova conversa" button inside the history sheet', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: mockConversations });

    renderWithRouter(<AiAssistant />);

    const historyBtns = screen.getAllByRole('button', { name: /^histórico$/i });
    await user.click(historyBtns[0]);

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

    const historyBtns = screen.getAllByRole('button', { name: /^histórico$/i });
    await user.click(historyBtns[0]);

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

    const historyBtns = screen.getAllByRole('button', { name: /^histórico$/i });
    await user.click(historyBtns[0]);

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

    const historyBtns = screen.getAllByRole('button', { name: /^histórico$/i });
    await user.click(historyBtns[0]);

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

    const historyBtns = screen.getAllByRole('button', { name: /^histórico$/i });
    await user.click(historyBtns[0]);

    await waitFor(() => {
      expect(screen.getByText('Primeira conversa')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /excluir conversa: primeira conversa/i }));

    expect(screen.queryByText('Histórico de conversas')).not.toBeInTheDocument();
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

    const historyBtns = screen.getAllByRole('button', { name: /^histórico$/i });
    await user.click(historyBtns[0]);

    await waitFor(() => {
      expect(screen.getByText('Primeira conversa')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /excluir conversa: primeira conversa/i }));
    await user.click(screen.getByRole('button', { name: /^Excluir$/ }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/trainer/ai/conversations/conv-1');
    });

    // Re-open history to verify removal
    const historyBtns2 = screen.getAllByRole('button', { name: /^histórico$/i });
    await user.click(historyBtns2[0]);

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

    const historyBtns = screen.getAllByRole('button', { name: /^histórico$/i });
    await user.click(historyBtns[0]);

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

    const historyBtns = screen.getAllByRole('button', { name: /^histórico$/i });
    await user.click(historyBtns[0]);

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

    const historyBtns = screen.getAllByRole('button', { name: /^histórico$/i });
    await user.click(historyBtns[0]);

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

    const historyBtns = screen.getAllByRole('button', { name: /^histórico$/i });
    await user.click(historyBtns[0]);

    await waitFor(() => {
      expect(screen.getByText('Prévia da mensagem aqui')).toBeInTheDocument();
    });
  });

  it('does not render preview element when conversation has no preview', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue({ data: [mockConversations[0]] });

    renderWithRouter(<AiAssistant />);

    const historyBtns = screen.getAllByRole('button', { name: /^histórico$/i });
    await user.click(historyBtns[0]);

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

    expect(screen.getByText('agachamento').tagName).toBe('STRONG');
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

    expect(screen.getByText('Devo fazer **agachamento**?').querySelector('strong')).toBeNull();
  });

  it('renders skeleton during streaming — no markdown parsed, no raw tokens visible', () => {
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({
        loading: true,
        messages: [
          { role: 'user', content: 'Treino de pernas?' },
          { role: 'assistant', content: 'Faça **3 séries** de agachamento.', isStreaming: true },
        ],
      })
    );

    renderWithRouter(<AiAssistant />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('agachamento')).not.toBeInTheDocument();
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

    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(2);
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

    expect(screen.queryByRole('button', { name: 'Ir para a resposta mais recente' })).not.toBeInTheDocument();
  });

  it('pill shows "new" variant after done fires while user is scrolled away', async () => {
    vi.mocked(useStickToBottomModule.default).mockReturnValue({
      isNearBottom: false,
      shouldFollow: false,
      scrollToBottom: mockScrollToBottom,
      onScroll: vi.fn(),
      bottomRef: { current: null },
    });

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

    expect(screen.queryByRole('button', { name: 'Ir para a resposta mais recente' })).not.toBeInTheDocument();

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

    expect(screen.getByRole('button', { name: 'Ir para a resposta mais recente' })).toBeInTheDocument();
    expect(screen.getByText('Ver nova resposta')).toBeInTheDocument();
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

  it('exposes a single polite live region and keeps the message list out of it', () => {
    vi.mocked(useAiChat).mockReturnValue(
      createDefaultContextValue({
        messages: [
          { role: 'user', content: 'Olá' },
          { role: 'assistant', content: 'Oi!', actionsExecuted: [] },
        ],
      })
    );

    renderWithRouter(<AiAssistant />);

    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('list', { name: 'Conversa com iArnold' })).not.toHaveAttribute('aria-live');
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

    const [, streamingMessage] = within(screen.getByRole('list', { name: 'Conversa com iArnold' })).getAllByRole('listitem');
    expect(streamingMessage).toHaveAttribute('aria-busy', 'true');
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
