import { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Star,
  ArrowUp,
  Paperclip,
  UserRound,
  Check,
  ChevronDown,
  ClipboardList,
  Dumbbell,
  UtensilsCrossed,
  TrendingUp,
  RefreshCw,
  Calendar,
  Clock,
  Plus,
  History,
  X,
  Trash2,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAiChat } from '../../contexts/AiChatContext';
import { translateError } from '../../i18n';
import api from '../../api/axios';
import { groupConversationsByDate } from '../../utils/conversationGroups';

const MAX_INPUT_LENGTH = 1000;
const CHAR_COUNT_THRESHOLD = 900;
const SCROLL_THRESHOLD = 150;

const CAPABILITY_CARDS = [
  {
    Icon: ClipboardList,
    title: 'Criar protocolo',
    description: 'Monte protocolos completos de treino com periodização',
    prompt: 'Crie um protocolo de hipertrofia para o aluno João com 4 treinos por semana',
  },
  {
    Icon: Dumbbell,
    title: 'Montar treino',
    description: 'Treinos avulsos personalizados com exercícios e séries',
    prompt: 'Monte um treino de pernas focado em quadríceps com 6 exercícios',
  },
  {
    Icon: UtensilsCrossed,
    title: 'Plano alimentar',
    description: 'Dietas completas com macros e refeições detalhadas',
    prompt: 'Crie uma dieta de cutting de 1800kcal com 5 refeições para a aluna Marina',
  },
];

const QUICK_PROMPTS = [
  { Icon: TrendingUp, label: 'Analisar progresso', prompt: 'Analise o progresso dos meus alunos esta semana' },
  { Icon: RefreshCw, label: 'Substituir exercícios', prompt: 'Sugira substituições de exercícios para alunos com lesão no ombro' },
  { Icon: Calendar, label: 'Periodização', prompt: 'Me ajude a montar a periodização mensal do aluno Rafael' },
  { Icon: Clock, label: 'Alunos inativos', prompt: 'Quais alunos não treinaram nos últimos 3 dias?' },
];

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

const formatConversationDate = (dateStr) => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (isNaN(date)) return '—';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const getUserInitials = (user) => {
  if (!user) return 'V';
  if (user.firstName) {
    return `${user.firstName[0]}${user.lastName?.[0] || ''}`.toUpperCase();
  }
  return (user.email?.[0] || 'V').toUpperCase();
};

// ---------------------------------------------------------------------------
// Markdown rendering
// ---------------------------------------------------------------------------

const markdownComponents = {
  p: ({ children }) => <p className="ai-chat__md-p">{children}</p>,
  h1: ({ children }) => <p className="ai-chat__md-heading">{children}</p>,
  h2: ({ children }) => <p className="ai-chat__md-heading">{children}</p>,
  h3: ({ children }) => <p className="ai-chat__md-heading">{children}</p>,
  code: ({ children }) => <code className="ai-chat__md-code-inline">{children}</code>,
  pre: ({ children }) => <pre className="ai-chat__md-pre">{children}</pre>,
  ul: ({ children }) => <ul className="ai-chat__md-list">{children}</ul>,
  ol: ({ children }) => <ol className="ai-chat__md-list">{children}</ol>,
  table: ({ children }) => (
    <div className="ai-chat__md-table-wrapper">
      <table className="ai-chat__md-table">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => <th className="ai-chat__md-th">{children}</th>,
  td: ({ children }) => <td className="ai-chat__md-td">{children}</td>,
};

const MarkdownMessage = ({ content }) => (
  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{content}</ReactMarkdown>
);

MarkdownMessage.propTypes = {
  content: PropTypes.string.isRequired,
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const TypingIndicator = () => (
  <div className="ai-chat__typing" aria-label="Assistente digitando">
    <span className="ai-chat__typing-dot" />
    <span className="ai-chat__typing-dot" />
    <span className="ai-chat__typing-dot" />
  </div>
);

const getActionLabel = (tool) => {
  const labels = {
    import_from_template: 'Protocolo criado',
    add_training_to_protocol: 'Treino adicionado',
    create_exercise_template: 'Exercício criado',
    create_training_template: 'Treino criado',
    create_protocol_template: 'Rotina criada',
  };
  return labels[tool] || 'Ação executada';
};

const ActionBadge = ({ actions }) => {
  const successActions = actions.filter((a) => a.success);
  if (successActions.length === 0) return null;

  const label =
    successActions.length === 1
      ? getActionLabel(successActions[0].tool)
      : `${successActions.length} ações executadas`;

  return (
    <div className="ai-chat__action-badge">
      <Check size={12} strokeWidth={2} />
      <span>{label}</span>
    </div>
  );
};

ActionBadge.propTypes = {
  actions: PropTypes.arrayOf(
    PropTypes.shape({
      tool: PropTypes.string,
      success: PropTypes.bool,
    })
  ).isRequired,
};

const ConversationItem = ({ conversation, isActive, isLoading, onSelect, onDelete }) => {
  const title = conversation.title || null;
  const preview = conversation.preview || conversation.firstMessage || null;

  const itemClass = [
    'ai-history__item',
    isActive ? 'ai-history__item--active' : '',
    isLoading ? 'ai-history__item--loading' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={itemClass}>
      <button
        className="ai-history__item-btn"
        onClick={() => onSelect(conversation)}
        aria-label={`Abrir conversa: ${title || 'Sem título'}`}
      >
        <div className="ai-history__item-btn-row">
          {isLoading ? (
            <MessageSquare size={14} strokeWidth={1.6} className="ai-history__item-spinner" />
          ) : (
            <MessageSquare size={14} strokeWidth={1.6} className="ai-history__item-icon" />
          )}
          <span className={`ai-history__item-title${!title ? ' ai-history__item-title--untitled' : ''}`}>
            {title || 'Sem título'}
          </span>
          <span className="ai-history__item-date">
            {formatConversationDate(conversation.updatedAt || conversation.createdAt)}
          </span>
        </div>
        {preview && <span className="ai-history__item-preview">{preview}</span>}
      </button>
      <button
        className="ai-history__item-delete"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(conversation);
        }}
        aria-label={`Excluir conversa: ${title || 'Sem título'}`}
      >
        <Trash2 size={13} strokeWidth={1.6} />
      </button>
    </div>
  );
};

ConversationItem.propTypes = {
  conversation: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string,
    createdAt: PropTypes.string,
    updatedAt: PropTypes.string,
    preview: PropTypes.string,
    firstMessage: PropTypes.string,
  }).isRequired,
  isActive: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

// ---------------------------------------------------------------------------
// Message Avatar
// ---------------------------------------------------------------------------

const UserAvatar = ({ initials }) => (
  <div className="ai-chat__avatar ai-chat__avatar--user" aria-hidden="true">
    {initials}
  </div>
);

UserAvatar.propTypes = { initials: PropTypes.string.isRequired };

const ArnoldAvatar = () => (
  <div className="ai-chat__avatar ai-chat__avatar--arnold" aria-hidden="true">
    <Star size={16} strokeWidth={1.8} />
  </div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const AiAssistant = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const {
    messages,
    conversationId,
    loading,
    streamingText,
    statusMessage,
    hasNewResponse,
    errorRetry,
    errorCode,
    sendMessage,
    startNewConversation,
    loadConversation,
    clearNewResponse,
    retryLastMessage,
  } = useAiChat();

  const [input, setInput] = useState('');
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [inputFocused, setInputFocused] = useState(false);

  // History panel state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [loadingConversationId, setLoadingConversationId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  const userInitials = getUserInitials(user);

  useEffect(() => {
    if (hasNewResponse) clearNewResponse();
  }, [hasNewResponse, clearNewResponse]);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const checkScrollPosition = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const nearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < SCROLL_THRESHOLD;
    setIsNearBottom(nearBottom);
  }, []);

  useEffect(() => {
    if (isNearBottom) {
      scrollToBottom();
    }
  }, [messages, loading, streamingText, statusMessage, isNearBottom, scrollToBottom]);

  const loadConversations = useCallback(async () => {
    setConversationsLoading(true);
    try {
      const response = await api.get('/trainer/ai/conversations');
      setConversations(response.data);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setConversationsLoading(false);
    }
  }, [showToast]);

  const handleOpenHistory = async () => {
    setHistoryOpen(true);
    await loadConversations();
  };

  const handleSelectConversation = async (conversation) => {
    setLoadingConversationId(conversation.id);
    try {
      await loadConversation(conversation.id);
      setHistoryOpen(false);
      inputRef.current?.focus();
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoadingConversationId(null);
    }
  };

  const handleDeleteConversation = (conversation) => {
    setHistoryOpen(false);
    setConfirmDialog({
      message: `Excluir a conversa "${conversation.title || 'Sem título'}"? Esta ação não pode ser desfeita.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await api.delete(`/trainer/ai/conversations/${conversation.id}`);
          setConversations((prev) => prev.filter((c) => c.id !== conversation.id));
          if (conversationId === conversation.id) {
            startNewConversation();
          }
        } catch (error) {
          showToast(error.userMessage || translateError(error), 'error');
        }
      },
    });
  };

  const handleNewConversationFromSheet = () => {
    setHistoryOpen(false);
    startNewConversation();
    setInput('');
    inputRef.current?.focus();
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || loading) return;
    setInput('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    await sendMessage(trimmedInput);
    inputRef.current?.focus();
  };

  const handleRetry = async () => {
    await retryLastMessage();
    inputRef.current?.focus();
  };

  const handleNewConversation = () => {
    startNewConversation();
    setInput('');
    inputRef.current?.focus();
  };

  const handlePromptClick = (prompt) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const handlePlaceholderAction = () => {
    showToast('Em breve!', 'info');
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    if (value.length <= MAX_INPUT_LENGTH) {
      setInput(value);
    }

    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  const hasMessages = messages.length > 0;
  const isSendDisabled = !input.trim() || loading;
  const showCharCount = input.length > CHAR_COUNT_THRESHOLD;
  const isCharCountWarn = input.length >= MAX_INPUT_LENGTH;
  const groupedConversations = groupConversationsByDate(conversations);

  const inputContainerClass = [
    'ai-chat__input-container',
    inputFocused ? 'ai-chat__input-container--focused' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="ai-chat">
      {/* Top bar */}
      <div className="ai-chat__header">
        <div className="ai-chat__header-left">
          <span className="ai-chat__header-icon">
            <Sparkles size={22} strokeWidth={1.6} />
          </span>
          <div className="ai-chat__header-text">
            <h1 className="ai-chat__header-title">iArnold</h1>
            <p className="ai-chat__header-subtitle">Seu assistente inteligente de treinos e nutrição</p>
          </div>
        </div>
        <div className="ai-chat__header-actions">
          <button
            onClick={handleOpenHistory}
            className="ai-chat__header-btn"
            aria-label="Histórico de conversas"
          >
            <History size={14} strokeWidth={1.6} />
            <span className="ai-chat__header-btn-label">Histórico</span>
          </button>
          <button
            onClick={handleNewConversation}
            className="ai-chat__header-btn"
            aria-label="Nova conversa"
          >
            <Plus size={14} strokeWidth={1.6} />
            <span className="ai-chat__header-btn-label">Nova conversa</span>
          </button>
        </div>
      </div>

      {!hasMessages ? (
        <div className="ai-chat__empty">
          {/* Animated logo */}
          <div className="ai-chat__logo">
            <Sparkles size={32} strokeWidth={1.4} />
          </div>

          {/* Title */}
          <h2 className="ai-chat__empty-title">
            Olá! Eu sou o <span className="ai-chat__gradient-text">iArnold</span>
          </h2>
          <p className="ai-chat__empty-description">
            Seu assistente inteligente para criar treinos, protocolos e planos alimentares personalizados.
          </p>

          {/* Capability cards */}
          <div className="ai-chat__capability-cards">
            {CAPABILITY_CARDS.map(({ Icon, title, description, prompt }) => (
              <button
                key={title}
                className="ai-chat__capability-card"
                onClick={() => handlePromptClick(prompt)}
              >
                <span className="ai-chat__capability-icon">
                  <Icon size={20} strokeWidth={1.6} />
                </span>
                <span className="ai-chat__capability-title">{title}</span>
                <span className="ai-chat__capability-desc">{description}</span>
              </button>
            ))}
          </div>

          {/* Quick prompt pills */}
          <div className="ai-chat__quick-pills">
            {QUICK_PROMPTS.map(({ Icon, label, prompt }) => (
              <button
                key={label}
                className="ai-chat__quick-pill"
                onClick={() => handlePromptClick(prompt)}
              >
                <Icon size={14} strokeWidth={1.6} />
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div
          className="ai-chat__messages"
          ref={messagesContainerRef}
          onScroll={checkScrollPosition}
        >
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`ai-chat__message ai-chat__message--${msg.role} ai-chat__message--animate`}
            >
              {msg.role === 'user' ? (
                <UserAvatar initials={userInitials} />
              ) : (
                <ArnoldAvatar />
              )}
              <div className="ai-chat__message-body">
                <span className="ai-chat__message-label">
                  {msg.role === 'user' ? 'Você' : 'iArnold'}
                </span>
                {msg.isStreaming ? (
                  streamingText ? (
                    <>
                      <div className="ai-chat__message-content">
                        {msg.role === 'assistant' ? (
                          <MarkdownMessage content={streamingText} />
                        ) : (
                          streamingText
                        )}
                      </div>
                      {statusMessage ? (
                        <p className="ai-chat__status-text">{statusMessage}</p>
                      ) : (
                        <TypingIndicator />
                      )}
                    </>
                  ) : statusMessage ? (
                    <p className="ai-chat__status-text">{statusMessage}</p>
                  ) : (
                    <TypingIndicator />
                  )
                ) : (
                  <>
                    <div className="ai-chat__message-content">
                      {msg.role === 'assistant' ? (
                        <MarkdownMessage content={msg.content} />
                      ) : (
                        msg.content
                      )}
                    </div>
                    {msg.actionsExecuted?.length > 0 && (
                      <ActionBadge actions={msg.actionsExecuted} />
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          {errorRetry && !loading && (
            <div className="ai-chat__error-card">
              <p className="ai-chat__error-text">
                {errorCode === 'AI_OVERLOADED'
                  ? 'O assistente está sobrecarregado no momento. Tente novamente em instantes.'
                  : 'Não foi possível processar sua mensagem.'}
              </p>
              <button
                onClick={handleRetry}
                className="ai-chat__error-retry"
                aria-label="Tentar novamente"
              >
                Tentar novamente
              </button>
            </div>
          )}
          <div ref={messagesEndRef} />

          {!isNearBottom && hasMessages && (
            <button
              className="ai-chat__scroll-btn"
              onClick={scrollToBottom}
              aria-label="Rolar para o final"
            >
              <ChevronDown size={18} strokeWidth={2} />
            </button>
          )}
        </div>
      )}

      {/* Input area */}
      <div className="ai-chat__input-area">
        <form onSubmit={handleSend} className="ai-chat__input-form">
          <div className={inputContainerClass}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder="Pergunte ao iArnold..."
              className="ai-chat__input"
              disabled={loading}
              rows={1}
              aria-label="Mensagem para o assistente"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
            />
            <div className="ai-chat__input-actions">
              <button
                type="button"
                className="ai-chat__input-action-btn"
                onClick={handlePlaceholderAction}
                aria-label="Anexar contexto"
              >
                <Paperclip size={16} strokeWidth={1.6} />
              </button>
              <button
                type="button"
                className="ai-chat__input-action-btn"
                onClick={handlePlaceholderAction}
                aria-label="Selecionar aluno"
              >
                <UserRound size={16} strokeWidth={1.6} />
              </button>
              <button
                type="submit"
                disabled={isSendDisabled}
                className="ai-chat__send-btn"
                aria-label="Enviar mensagem"
              >
                <ArrowUp size={18} strokeWidth={2} />
              </button>
            </div>
          </div>
          <div className="ai-chat__input-hints">
            <span className="ai-chat__input-hint">
              iArnold tem acesso aos dados dos seus alunos, treinos e dietas
            </span>
            <span className="ai-chat__input-hint">
              {showCharCount && (
                <span className={isCharCountWarn ? 'ai-chat__char-count--warn' : ''}>
                  {input.length}/{MAX_INPUT_LENGTH} ·{' '}
                </span>
              )}
              Enter para enviar
            </span>
          </div>
        </form>
      </div>

      {/* History panel */}
      {historyOpen && (
        <div className="overlay">
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="bottom-sheet-header">
              <h2 className="bottom-sheet-title">Histórico de conversas</h2>
              <button
                className="bottom-sheet-close"
                onClick={() => setHistoryOpen(false)}
                aria-label="Fechar histórico"
              >
                <X size={18} strokeWidth={1.6} />
              </button>
            </div>
            <div className="bottom-sheet-body">
              <div className="ai-history__new-conversation-btn">
                <button
                  className="btn-secondary btn-secondary-full"
                  onClick={handleNewConversationFromSheet}
                  aria-label="Iniciar nova conversa"
                >
                  <Plus size={14} strokeWidth={1.6} />
                  Nova conversa
                </button>
              </div>

              {conversationsLoading ? (
                <p style={{ textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
                  Carregando...
                </p>
              ) : conversations.length === 0 ? (
                <div className="ai-history__empty-state">
                  <MessageSquare size={32} strokeWidth={1.2} />
                  <p className="ai-history__empty-state-text">Nenhuma conversa ainda.</p>
                </div>
              ) : (
                <div className="ai-history__list">
                  {groupedConversations.map((group) => (
                    <div key={group.label}>
                      <p className="ai-history__group-label">{group.label}</p>
                      {group.conversations.map((conv) => (
                        <ConversationItem
                          key={conv.id}
                          conversation={conv}
                          isActive={conv.id === conversationId}
                          isLoading={conv.id === loadingConversationId}
                          onSelect={handleSelectConversation}
                          onDelete={handleDeleteConversation}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {confirmDialog && (
        <div className="overlay">
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <p className="confirm-dialog-message">{confirmDialog.message}</p>
            <div className="btn-group">
              <button onClick={confirmDialog.onConfirm} className="btn-danger" style={{ flex: 1 }}>
                Excluir
              </button>
              <button
                onClick={() => setConfirmDialog(null)}
                className="btn-secondary"
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiAssistant;
