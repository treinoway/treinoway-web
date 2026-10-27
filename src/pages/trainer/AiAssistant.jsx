import { useState, useRef, useEffect, useCallback } from 'react';
import { History, Plus, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useAiChat } from '../../contexts/AiChatContext';
import { t } from '../../i18n';
import { findPlaceholders, hasPlaceholders } from '../../utils/promptPlaceholders';
import useTrainerBriefing from '../../hooks/useTrainerBriefing';
import useStickToBottom from '../../hooks/useStickToBottom';
import useConversationHistory from '../../hooks/useConversationHistory';
import Banner from '../../components/ds/Banner';
import ConfirmDialog from '../../components/ds/ConfirmDialog';
import ScrollToLatestPill from '../../components/ScrollToLatestPill';
import BriefingStrip from '../../components/iarnold/BriefingStrip';
import CreateCards from '../../components/iarnold/CreateCards';
import ChatMessageList from '../../components/iarnold/ChatMessageList';
import ChatComposer from '../../components/iarnold/ChatComposer';
import ConversationHistoryModal from '../../components/iarnold/ConversationHistoryModal';

// Builds the one or two letters shown in the trainer's avatar.
const getUserInitials = (user) => {
  if (!user) return 'V';
  if (user.firstName) {
    return `${user.firstName[0]}${user.lastName?.[0] || ''}`.toUpperCase();
  }
  return (user.email?.[0] || 'V').toUpperCase();
};

// Text read out by the page's single live region: progress while streaming, then a short confirmation.
const useLiveAnnouncement = ({ isStreaming, statusMessage, hasError }) => {
  const [wasStreaming, setWasStreaming] = useState(false);
  const [replied, setReplied] = useState(false);

  if (isStreaming !== wasStreaming) {
    setWasStreaming(isStreaming);
    setReplied(wasStreaming && !hasError);
  }

  if (isStreaming) return statusMessage || t('iArnold.skeleton.aria');
  return replied ? t('iArnold.chat.replied') : '';
};

// Follows the stream to the bottom, or flags a pill when a reply lands while the trainer scrolled up.
const useReplyScroll = ({ loading }) => {
  const { isNearBottom, shouldFollow, scrollToBottom, bottomRef } = useStickToBottom({ threshold: 80 });
  const [hasUnseenReply, setHasUnseenReply] = useState(false);
  const [wasLoading, setWasLoading] = useState(false);

  if (loading !== wasLoading) {
    setWasLoading(loading);
    if (wasLoading) setHasUnseenReply(!shouldFollow);
  }
  if (isNearBottom && hasUnseenReply) setHasUnseenReply(false);

  const previousLoadingRef = useRef(false);
  useEffect(() => {
    const finishedLoading = previousLoadingRef.current && !loading;
    previousLoadingRef.current = loading;
    if (finishedLoading && shouldFollow) scrollToBottom({ behavior: 'smooth' });
  }, [loading, shouldFollow, scrollToBottom]);

  const jumpToLatest = useCallback(() => {
    scrollToBottom({ behavior: 'smooth' });
    setHasUnseenReply(false);
  }, [scrollToBottom]);

  return { scrollToBottom, bottomRef, jumpToLatest, setHasUnseenReply, pillVisible: !isNearBottom && hasUnseenReply };
};

const AiAssistant = () => {
  const { user } = useAuth();
  const {
    messages,
    conversationId,
    loading,
    statusMessage,
    hasNewResponse,
    errorRetry,
    errorMessage,
    sendMessage,
    startNewConversation,
    loadConversation,
    clearNewResponse,
    retryLastMessage,
  } = useAiChat();

  const [input, setInput] = useState('');
  const inputRef = useRef(null);
  const pendingSelectionRef = useRef(null);
  const { data: briefing, loading: briefingLoading, error: briefingError } = useTrainerBriefing();
  const { scrollToBottom, bottomRef, jumpToLatest, setHasUnseenReply, pillVisible } = useReplyScroll({ loading });
  const isStreaming = messages.some((message) => message.isStreaming);
  const announcement = useLiveAnnouncement({ isStreaming, statusMessage, hasError: Boolean(errorMessage || errorRetry) });

  useEffect(() => {
    if (hasNewResponse) clearNewResponse();
  }, [hasNewResponse, clearNewResponse]);

  const focusInput = () => inputRef.current?.focus();

  const history = useConversationHistory({
    conversationId,
    loadConversation,
    startNewConversation,
    onConversationOpened: focusInput,
  });

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || loading || hasPlaceholders(trimmedInput)) return;
    setInput('');
    setHasUnseenReply(false);
    scrollToBottom({ behavior: 'smooth' });
    await sendMessage(trimmedInput);
    focusInput();
  };

  const handleNewConversation = () => {
    startNewConversation();
    setInput('');
    focusInput();
  };

  const handleNewFromHistory = () => {
    history.close();
    handleNewConversation();
  };

  const handleRetry = async () => {
    await retryLastMessage();
    focusInput();
  };

  const handlePromptSelect = (prompt) => {
    const [firstPlaceholder] = findPlaceholders(prompt);
    pendingSelectionRef.current = firstPlaceholder ?? null;
    setInput(prompt);
    focusInput();
  };

  useEffect(() => {
    const selection = pendingSelectionRef.current;
    const textarea = inputRef.current;
    if (!selection || !textarea || textarea.value !== input) return;
    pendingSelectionRef.current = null;
    textarea.focus();
    textarea.setSelectionRange(selection.start, selection.end);
  }, [input]);

  const hasMessages = messages.length > 0;
  const showError = !loading && Boolean(errorMessage || errorRetry);
  const retryButton = errorRetry ? (
    <button type="button" className="btn btn--secondary" onClick={handleRetry}>
      {t('iArnold.chat.retry')}
    </button>
  ) : null;

  return (
    <div className="ai-chat">
      <p className="visually-hidden" role="status">{announcement}</p>

      <header className="ds-page-header">
        <div className="ds-page-header__heading">
          <Sparkles size={24} strokeWidth={2} aria-hidden="true" />
          <h1 className="ds-page-header__title type-h1">{t('iArnold.chat.title')}</h1>
        </div>
        <div className="ds-page-header__actions">
          <button type="button" className="btn btn--secondary" onClick={history.open}>
            <History size={16} strokeWidth={2} aria-hidden="true" />
            {t('iArnold.chat.history')}
          </button>
          <button type="button" className="btn btn--primary" onClick={handleNewConversation}>
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            {t('iArnold.chat.newConversation')}
          </button>
        </div>
      </header>

      {hasMessages ? (
        <>
          <ChatMessageList messages={messages} userInitials={getUserInitials(user)} statusMessage={statusMessage} />
          <div ref={bottomRef} />
        </>
      ) : (
        <>
          <BriefingStrip briefing={briefing} loading={briefingLoading} error={briefingError} />
          <CreateCards onSelect={handlePromptSelect} />
        </>
      )}

      {showError && (
        <div className="ai-chat__error">
          <Banner tone="error" action={retryButton}>{errorMessage || t('iArnold.chat.genericError')}</Banner>
        </div>
      )}

      <ChatComposer
        value={input}
        onValueChange={setInput}
        onSubmit={handleSend}
        disabled={loading}
        textareaRef={inputRef}
        activeStudents={briefing?.activeStudents}
      >
        <ScrollToLatestPill visible={pillVisible} onClick={jumpToLatest} />
      </ChatComposer>

      {history.isOpen && (
        <ConversationHistoryModal
          groups={history.groups}
          loading={history.loading}
          activeId={conversationId}
          loadingId={history.loadingId}
          onClose={history.close}
          onNew={handleNewFromHistory}
          onSelect={history.select}
          onDelete={history.remove}
        />
      )}

      {history.confirmDialogProps && <ConfirmDialog {...history.confirmDialogProps} />}
    </div>
  );
};

export default AiAssistant;
