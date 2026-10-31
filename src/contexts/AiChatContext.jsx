import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from './AuthContext';
import api from '../api/axios';
import { openChatStream, readChatEvents } from '../api/aiChatStream';
import { t, translateError } from '../i18n';
import { isNative } from '../platform';

const AiChatContext = createContext(null);

let messageSequence = 0;

// A stream whose app stayed in the background this long is treated as lost: the OS may have frozen the connection without an error.
const BACKGROUND_STREAM_LOSS_MS = 5000;

// Returns the next stable key for a locally created message.
const nextMessageId = () => {
  messageSequence += 1;
  return `local-${messageSequence}`;
};

// Builds a chat message with a stable key.
const buildMessage = (role, content, extra = {}) => ({ id: nextMessageId(), role, content, ...extra });

// True for an assistant row that only carries tool calls (no text of its own).
const isToolOnlyRow = (message) => message.role === 'assistant' && !message.content?.trim();

// Maps persisted messages to UI messages, folding tool-only assistant rows into the next assistant reply.
const toUiMessages = (storedMessages) => {
  const uiMessages = [];
  let carriedActions = [];
  storedMessages.forEach((message) => {
    const actions = message.toolCalls || [];
    if (isToolOnlyRow(message)) {
      carriedActions = [...carriedActions, ...actions];
      return;
    }
    const isReply = message.role === 'assistant';
    uiMessages.push({
      id: message.id ?? nextMessageId(),
      role: message.role,
      content: message.content,
      actionsExecuted: isReply ? [...carriedActions, ...actions] : actions,
    });
    if (isReply) carriedActions = [];
  });
  if (carriedActions.length > 0) {
    uiMessages.push({ id: nextMessageId(), role: 'assistant', content: t('iArnold.chat.actionDone'), actionsExecuted: carriedActions });
  }
  return uiMessages;
};

// Builds the error state shown by the single error surface.
const buildChatError = (error, retryText) => ({
  message: error.userMessage || translateError(error),
  code: error.response?.data?.messageCode ?? null,
  retryText,
});

// Creates the handlers of one chat turn; every handler is a no-op once the turn is no longer current.
const createTurnHandlers = ({ text, isCurrent, finish, setters }) => {
  const { setMessages, setStatusMessage, setChatError, setConversationId, setHasNewResponse } = setters;

  const fail = (error) => {
    const orphanConversationId = error.response?.data?.conversationId;
    if (orphanConversationId) setConversationId(orphanConversationId);
    setMessages((prev) => prev.filter((message) => !message.isStreaming));
    setChatError(buildChatError(error, text));
    finish();
  };

  const complete = (data) => {
    const fallback = data.actionsExecuted?.length > 0 ? t('iArnold.chat.actionDone') : t('iArnold.chat.emptyReply');
    const reply = buildMessage('assistant', data.message || fallback, { actionsExecuted: data.actionsExecuted || [] });
    setMessages((prev) => prev.map((message) => (message.isStreaming ? reply : message)));
    setConversationId(data.conversationId);
    setHasNewResponse(true);
    finish();
  };

  const appendDelta = (content) => {
    setStatusMessage('');
    setMessages((prev) =>
      prev.map((message) => (message.isStreaming ? { ...message, content: message.content + content } : message))
    );
  };

  const handleEvent = ({ event, data }) => {
    if (!isCurrent()) return;
    if (event === 'status') setStatusMessage(data.message);
    if (event === 'heartbeat') setStatusMessage((prev) => prev || t('iArnold.chat.processing'));
    if (event === 'text_delta') appendDelta(data.content);
    if (event === 'error') fail({ response: { data } });
    if (event === 'done') complete(data);
  };

  const interrupted = () => {
    if (isCurrent()) fail({ userMessage: t('iArnold.chat.connectionLost') });
  };

  return { handleEvent, fail, interrupted };
};

export const useAiChat = () => {
  const context = useContext(AiChatContext);
  if (!context) {
    throw new Error('useAiChat must be used within AiChatProvider');
  }
  return context;
};

export const AiChatProvider = ({ children }) => {
  const { accessToken, user } = useAuth();

  const userIdRef = useRef(user?.id ?? null);
  userIdRef.current = user?.id ?? null;
  const ownerIdRef = useRef(userIdRef.current);
  const accessTokenRef = useRef(accessToken);
  accessTokenRef.current = accessToken;

  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationIdState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [hasNewResponse, setHasNewResponse] = useState(false);
  const [chatError, setChatError] = useState(null);

  const conversationIdRef = useRef(null);
  const streamControllerRef = useRef(null);
  const loadSequenceRef = useRef(0);
  const lastTurnRef = useRef(null);
  const conversationStudentIdRef = useRef(null);
  const interruptTurnRef = useRef(null);

  const setConversationId = useCallback((id) => {
    conversationIdRef.current = id;
    setConversationIdState(id);
  }, []);

  const isOwnedByCurrentUser = useCallback(
    () => userIdRef.current != null && userIdRef.current === ownerIdRef.current,
    []
  );

  const abortStream = useCallback(() => {
    if (!streamControllerRef.current) return;
    streamControllerRef.current.abort();
    streamControllerRef.current = null;
    setMessages((prev) => prev.filter((message) => !message.isStreaming));
    setStatusMessage('');
  }, []);

  const startNewConversation = useCallback(() => {
    abortStream();
    loadSequenceRef.current += 1;
    lastTurnRef.current = null;
    conversationStudentIdRef.current = null;
    setMessages([]);
    setConversationId(null);
    setChatError(null);
    setStatusMessage('');
    setHasNewResponse(false);
    setLoading(false);
  }, [abortStream, setConversationId]);

  useEffect(() => {
    if (ownerIdRef.current === (user?.id ?? null)) return;
    startNewConversation();
    ownerIdRef.current = user?.id ?? null;
  }, [user?.id, startNewConversation]);

  useEffect(() => {
    const controllerRef = streamControllerRef;
    return () => controllerRef.current?.abort();
  }, []);

  // why: native only; after a long background stay with a turn still streaming, the connection may be frozen, so the half answer is dropped and a retry offered.
  useEffect(() => {
    if (!isNative()) return undefined;
    let hiddenAt = null;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = streamControllerRef.current ? Date.now() : null;
        return;
      }
      const wasLost = hiddenAt !== null && Date.now() - hiddenAt >= BACKGROUND_STREAM_LOSS_MS;
      hiddenAt = null;
      if (wasLost && streamControllerRef.current) interruptTurnRef.current?.();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const runTurn = useCallback(async (text, { studentId: requestedStudentId, appendUser }) => {
    const studentId = requestedStudentId ?? conversationStudentIdRef.current;
    conversationStudentIdRef.current = studentId ?? null;
    const controller = new AbortController();
    streamControllerRef.current = controller;
    lastTurnRef.current = { text, studentId };
    const isCurrent = () => streamControllerRef.current === controller;
    const finish = () => {
      streamControllerRef.current = null;
      setLoading(false);
      setStatusMessage('');
    };
    const setters = { setMessages, setStatusMessage, setChatError, setConversationId, setHasNewResponse };
    const { handleEvent, fail, interrupted } = createTurnHandlers({ text, isCurrent, finish, setters });
    interruptTurnRef.current = () => {
      controller.abort();
      interrupted();
    };
    const payload = {
      message: text,
      ...(conversationIdRef.current && { conversationId: conversationIdRef.current }),
      ...(studentId && { studentId }),
    };

    setChatError(null);
    setLoading(true);
    setStatusMessage('');
    const placeholder = buildMessage('assistant', '', { isStreaming: true });
    setMessages((prev) => [...prev, ...(appendUser ? [buildMessage('user', text)] : []), placeholder]);

    try {
      const response = await openChatStream({ payload, token: accessTokenRef.current, signal: controller.signal });
      if (!isCurrent()) return;
      await readChatEvents(response, controller.signal, handleEvent);
      interrupted();
    } catch (error) {
      if (isCurrent()) fail(error);
    }
  }, [setConversationId]);

  const sendMessage = useCallback(async (messageText, { studentId } = {}) => {
    const trimmedInput = messageText.trim();
    if (!isOwnedByCurrentUser() || !trimmedInput || streamControllerRef.current) return;
    await runTurn(trimmedInput, { studentId, appendUser: true });
  }, [isOwnedByCurrentUser, runTurn]);

  const startConversation = useCallback(async (messageText, { studentId } = {}) => {
    if (!isOwnedByCurrentUser()) return;
    startNewConversation();
    await sendMessage(messageText, { studentId });
  }, [isOwnedByCurrentUser, startNewConversation, sendMessage]);

  const loadConversation = useCallback(async (id) => {
    if (!isOwnedByCurrentUser()) return;
    abortStream();
    loadSequenceRef.current += 1;
    const sequence = loadSequenceRef.current;
    const isLatest = () => loadSequenceRef.current === sequence;
    setLoading(true);
    setChatError(null);

    try {
      const response = await api.get(`/trainer/ai/conversations/${id}`);
      if (!isLatest()) return;
      lastTurnRef.current = null;
      conversationStudentIdRef.current = null;
      setConversationId(response.data.id);
      setMessages(toUiMessages(response.data.messages));
    } catch (error) {
      if (isLatest()) setChatError(buildChatError(error, null));
    } finally {
      if (isLatest()) setLoading(false);
    }
  }, [isOwnedByCurrentUser, abortStream, setConversationId]);

  const clearNewResponse = useCallback(() => setHasNewResponse(false), []);

  const retryLastMessage = useCallback(async () => {
    const lastTurn = lastTurnRef.current;
    if (!lastTurn || !chatError?.retryText || streamControllerRef.current) return;
    await runTurn(lastTurn.text, { studentId: lastTurn.studentId, appendUser: false });
  }, [chatError, runTurn]);

  const isOwner = userIdRef.current != null && userIdRef.current === ownerIdRef.current;

  const value = {
    messages: isOwner ? messages : [],
    conversationId: isOwner ? conversationId : null,
    loading: isOwner ? loading : false,
    statusMessage: isOwner ? statusMessage : '',
    hasNewResponse: isOwner ? hasNewResponse : false,
    errorRetry: isOwner ? (chatError?.retryText ?? null) : null,
    errorCode: isOwner ? (chatError?.code ?? null) : null,
    errorMessage: isOwner ? (chatError?.message ?? null) : null,
    sendMessage,
    startConversation,
    startNewConversation,
    loadConversation,
    clearNewResponse,
    retryLastMessage,
  };

  return <AiChatContext.Provider value={value}>{children}</AiChatContext.Provider>;
};

AiChatProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
