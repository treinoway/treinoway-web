import { useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowUp,
  Paperclip,
  UserRound,
  BookOpen,
  Check,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  UtensilsCrossed,
  Zap,
  Circle,
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

// ---------------------------------------------------------------------------
// Constants — empty state data (placeholders until data integration)
// ---------------------------------------------------------------------------

const CREATE_CARDS = [
  {
    Icon: ClipboardList,
    eyebrow: 'Rotina',
    title: 'Criar rotina completa',
    desc: 'Periodização, progressão e divisão semanal com base no histórico do aluno.',
    hint: '4–12 semanas',
    prompt: 'Crie uma rotina de hipertrofia de 8 semanas para um aluno intermediário com 4 treinos por semana',
  },
  {
    Icon: Dumbbell,
    eyebrow: 'Treino avulso',
    title: 'Montar treino',
    desc: 'Um treino específico — grupo muscular, tempo disponível, equipamento e objetivo.',
    hint: '30–90 min',
    prompt: 'Monte um treino de pernas focado em quadríceps com 6 exercícios em 60 minutos',
  },
  {
    Icon: UtensilsCrossed,
    eyebrow: 'Nutrição',
    title: 'Plano alimentar',
    desc: 'Macros e refeições ajustados ao peso, objetivo e restrições do aluno.',
    hint: 'Cutting · Bulk · Manutenção',
    prompt: 'Crie uma dieta de cutting de 1800kcal com 5 refeições para uma aluna com intolerância à lactose',
  },
];

const CONTEXTUAL_PROMPTS = [
  // TODO(data-integration): nomes/métricas de alunos reais
  {
    tag: 'alert',
    label: 'Atenção',
    text: (
      <>
        Reativar <strong>Aluno A</strong> — sem treino há 9 dias, mandar mensagem + ajuste
      </>
    ),
    prompt: 'Sugira uma mensagem de reengajamento e ajuste de rotina para um aluno que não treina há 9 dias',
  },
  {
    tag: 'progress',
    label: 'Progresso',
    text: (
      <>
        Nova progressão de <strong>peito</strong> para <strong>Aluno B</strong> — estagnada há 3 semanas
      </>
    ),
    prompt: 'Sugira uma nova progressão de peito para um aluno estagnado há 3 semanas',
  },
  {
    tag: 'nutrition',
    label: 'Dieta',
    text: (
      <>
        Revisar macros de <strong>Aluno C</strong> — perdeu 2,3kg nas últimas 2 semanas
      </>
    ),
    prompt: 'Revise os macros de um aluno que perdeu 2,3kg em 2 semanas, avaliando se é saudável',
  },
  {
    tag: 'progress',
    label: 'Análise',
    text: (
      <>
        Comparar evolução de <strong>supino</strong> entre todos os alunos no último trimestre
      </>
    ),
    prompt: 'Compare a evolução do supino entre todos os alunos no último trimestre',
  },
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
// Message avatars
// ---------------------------------------------------------------------------

const UserAvatar = ({ initials }) => (
  <div className="ai-chat__avatar ai-chat__avatar--user" aria-hidden="true">
    {initials}
  </div>
);

UserAvatar.propTypes = { initials: PropTypes.string.isRequired };

const ArnoldAvatar = () => (
  <div className="ai-chat__avatar ai-chat__avatar--arnold" aria-hidden="true">
    <Sparkles size={16} strokeWidth={2} />
  </div>
);

// ---------------------------------------------------------------------------
// Empty state sub-components
// ---------------------------------------------------------------------------

const CreateCard = ({ Icon, eyebrow, title, desc, hint, prompt, onClick }) => (
  <button className="ai-chat__create-card" onClick={() => onClick(prompt)}>
    <div className="ai-chat__create-card-icon">
      <Icon size={20} strokeWidth={2} />
    </div>
    <span className="ai-chat__create-card-eyebrow">{eyebrow}</span>
    <h3 className="ai-chat__create-card-title">{title}</h3>
    <p className="ai-chat__create-card-desc">{desc}</p>
    <div className="ai-chat__create-card-hint">
      <Zap size={10} strokeWidth={2} />
      {hint}
    </div>
  </button>
);

CreateCard.propTypes = {
  Icon: PropTypes.elementType.isRequired,
  eyebrow: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  desc: PropTypes.string.isRequired,
  hint: PropTypes.string.isRequired,
  prompt: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
};

const PromptRow = ({ tag, label, text, prompt, onClick }) => (
  <button className="ai-chat__prompt-row" onClick={() => onClick(prompt)}>
    <span className={`ai-chat__prompt-tag ai-chat__prompt-tag--${tag}`}>{label}</span>
    <span className="ai-chat__prompt-text">{text}</span>
    <ChevronRight size={16} strokeWidth={2} className="ai-chat__prompt-arrow" />
  </button>
);

PromptRow.propTypes = {
  tag: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  text: PropTypes.node.isRequired,
  prompt: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
};

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

  // History panel state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [loadingConversationId, setLoadingConversationId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const userInitials = getUserInitials(user);

  useEffect(() => {
    if (hasNewResponse) clearNewResponse();
  }, [hasNewResponse, clearNewResponse]);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, streamingText, statusMessage, scrollToBottom]);

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

  return (
    <div className="ai-chat">
      {/* Header — always rendered, never duplicated */}
      <div className="page-header">
        <div className="page-header-title-row">
          <Sparkles size={24} strokeWidth={1.6} className="page-header-title-icon" />
          <h1 className="page-title">iArnold</h1>
        </div>
        <div className="page-header-actions">
          <button className="btn-secondary" onClick={handleOpenHistory}>
            <History size={16} strokeWidth={1.6} />
            Histórico
          </button>
          <button className="btn-primary" onClick={handleNewConversation}>
            <Plus size={16} strokeWidth={2} />
            Nova conversa
          </button>
        </div>
      </div>

      {!hasMessages ? (
        /* Empty state: content flows naturally in page scroll */
        <>
          {/* Briefing strip */}
          <section className="ai-chat__briefing" aria-label="Briefing de alunos">
            <header className="ai-chat__briefing-header">
              <span className="ai-chat__briefing-label">
                <span className="ai-chat__live-dot" />
                Briefing · Seus alunos agora
              </span>
              {/* TODO(data-integration): replace with real timestamp */}
              <span className="ai-chat__briefing-timestamp">Atualizado 22:00</span>
            </header>
            <div className="ai-chat__briefing-grid">
              {/* TODO(data-integration): replace all values below with real API data */}
              <div className="ai-chat__briefing-stat">
                <span className="ai-chat__briefing-stat-value">24</span>
                <span className="ai-chat__briefing-stat-label">Alunos ativos</span>
                <span className="ai-chat__briefing-stat-trend ai-chat__briefing-stat-trend--up">
                  +2 esta semana
                </span>
              </div>
              <div className="ai-chat__briefing-stat">
                <span className="ai-chat__briefing-stat-value ai-chat__briefing-stat-value--accent">3</span>
                <span className="ai-chat__briefing-stat-label">Progresso estagnado</span>
                <span className="ai-chat__briefing-stat-trend">Sem evolução 14+ dias</span>
              </div>
              <div className="ai-chat__briefing-stat">
                <span className="ai-chat__briefing-stat-value ai-chat__briefing-stat-value--warning">2</span>
                <span className="ai-chat__briefing-stat-label">Inativos</span>
                <span className="ai-chat__briefing-stat-trend">Sem treino há 7+ dias</span>
              </div>
              <div className="ai-chat__briefing-stat">
                <span className="ai-chat__briefing-stat-value">87%</span>
                <span className="ai-chat__briefing-stat-label">Adesão geral</span>
                <span className="ai-chat__briefing-stat-trend ai-chat__briefing-stat-trend--up">
                  +4pp vs mês ant.
                </span>
              </div>
            </div>
          </section>

          {/* Create cards */}
          <div className="ai-chat__section-header">
            <h2 className="ai-chat__section-title">Criar do zero</h2>
            <span className="ai-chat__section-subtitle">iArnold monta para você</span>
          </div>
          <div className="ai-chat__create-grid">
            {CREATE_CARDS.map((card) => (
              <CreateCard key={card.title} {...card} onClick={handlePromptClick} />
            ))}
          </div>

          {/* Contextual prompts */}
          <div className="ai-chat__section-header">
            <h2 className="ai-chat__section-title">Sugestões para agora</h2>
            <span className="ai-chat__section-subtitle">Baseado nos dados dos seus alunos</span>
          </div>
          <div className="ai-chat__prompts-list">
            {CONTEXTUAL_PROMPTS.map((p) => (
              <PromptRow key={p.prompt} {...p} onClick={handlePromptClick} />
            ))}
          </div>
        </>
      ) : (
        /* Messages view: page scroll handles overflow — no internal scroll container */
        <div className="ai-chat__messages">
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
          </div>
      )}

      {/* Composer — sticky bottom, always rendered as last flex child */}
      <div className="ai-chat__composer-wrap">
        <form onSubmit={handleSend}>
          <div className="ai-chat__composer">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              placeholder="Pergunte ao iArnold…"
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
            <div className="ai-chat__composer-toolbar">
              <div className="ai-chat__composer-tools">
                <button
                  type="button"
                  className="ai-chat__tool-btn"
                  onClick={handlePlaceholderAction}
                  aria-label="Anexar arquivo"
                >
                  <Paperclip size={14} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  className="ai-chat__tool-btn ai-chat__tool-btn--active"
                  onClick={handlePlaceholderAction}
                  aria-label="Selecionar aluno"
                >
                  <UserRound size={14} strokeWidth={2} />
                  Aluno
                </button>
                <button
                  type="button"
                  className="ai-chat__tool-btn"
                  onClick={handlePlaceholderAction}
                  aria-label="Abrir biblioteca"
                >
                  <BookOpen size={14} strokeWidth={2} />
                  Biblioteca
                </button>
              </div>
              <div className="ai-chat__composer-right">
                {showCharCount && (
                  <span className={isCharCountWarn ? 'ai-chat__char-count--warn' : ''}>
                    {input.length}/{MAX_INPUT_LENGTH}
                  </span>
                )}
                <span className="ai-chat__composer-hint">Enter para enviar</span>
                <button
                  type="submit"
                  disabled={isSendDisabled}
                  className="ai-chat__send-btn"
                  aria-label="Enviar mensagem"
                >
                  <ArrowUp size={14} strokeWidth={2.4} />
                </button>
              </div>
            </div>
          </div>
        </form>
        <div className="ai-chat__composer-meta">
          <div className="ai-chat__composer-meta-left">
            {/* TODO(data-integration): replace 24 with real student count */}
            <span className="ai-chat__meta-chip">
              <Circle size={8} strokeWidth={0} fill="currentColor" style={{ color: 'var(--md-success)' }} />
              Contexto ativo: 24 alunos
            </span>
            <span>iArnold tem acesso aos dados dos seus alunos, treinos e dietas</span>
          </div>
          <span>Powered by Claude</span>
        </div>
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
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <div className="bottom-sheet-body">
              <div className="ai-history__new-conversation-btn">
                <button
                  className="btn-secondary btn-secondary-full"
                  onClick={handleNewConversationFromSheet}
                  aria-label="Iniciar nova conversa"
                >
                  <Plus size={14} strokeWidth={2} />
                  Nova conversa
                </button>
              </div>

              {conversationsLoading ? (
                <p style={{ textAlign: 'center', color: 'var(--brand-steel)' }}>
                  Carregando...
                </p>
              ) : conversations.length === 0 ? (
                <div className="ai-history__empty-state">
                  <MessageSquare size={32} strokeWidth={1.6} />
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
        <div className="overlay" onClick={() => setConfirmDialog(null)}>
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
