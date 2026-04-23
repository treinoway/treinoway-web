import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import api from '../api/axios';
import { translateError } from '../i18n';

const AiChatContext = createContext(null);

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const parseSSELines = (lines) => {
  const events = [];
  let currentEvent = null;
  for (const line of lines) {
    if (line.startsWith('event: ')) {
      currentEvent = line.slice(7);
    } else if (line.startsWith('data: ') && currentEvent) {
      try {
        const data = JSON.parse(line.slice(6));
        events.push({ event: currentEvent, data });
      } catch {
        // Skip malformed data lines
      }
      currentEvent = null;
    }
  }
  return events;
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
  const { showToast } = useToast();

  const ownerIdRef = useRef(user?.id ?? null);

  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationIdState] = useState(null);
  const conversationIdRef = useRef(null);
  const [loading, setLoading] = useState(false);

  const setConversationId = useCallback((id) => {
    conversationIdRef.current = id;
    setConversationIdState(id);
  }, []);
  const [streamingText, setStreamingText] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [hasNewResponse, setHasNewResponse] = useState(false);
  const [errorRetry, setErrorRetry] = useState(null);
  const [errorCode, setErrorCode] = useState(null);

  const accessTokenRef = useRef(accessToken);
  accessTokenRef.current = accessToken;

  const loadingRef = useRef(false);
  const pendingMessageRef = useRef(null);

  const handleStreamEvent = useCallback((event, data, accumulated) => {
    if (event === 'status') {
      setStatusMessage(data.message);
      return accumulated;
    }

    if (event === 'text_delta') {
      const updated = accumulated + data.content;
      setStreamingText(updated);
      setStatusMessage('');
      setMessages((prev) => {
        const copy = [...prev];
        const last = copy[copy.length - 1];
        if (last?.isStreaming) {
          copy[copy.length - 1] = { ...last, content: updated };
        }
        return copy;
      });
      return updated;
    }

    if (event === 'done') {
      const hasActions = data.actionsExecuted?.length > 0;
      const fallbackText = hasActions
        ? 'Ação executada com sucesso.'
        : 'Não consegui gerar uma resposta. Tente reformular seu pedido.';
      const finalMessage = {
        role: 'assistant',
        content: data.message || fallbackText,
        actionsExecuted: data.actionsExecuted || [],
      };
      setMessages((prev) => [...prev.slice(0, -1), finalMessage]);
      setConversationId(data.conversationId);
      setStreamingText('');
      setStatusMessage('');
      setLoading(false);
      loadingRef.current = false;
      setHasNewResponse(true);
      return accumulated;
    }

    if (event === 'error') {
      setMessages((prev) => prev.filter((m) => !m.isStreaming));
      setStreamingText('');
      setStatusMessage('');
      setLoading(false);
      loadingRef.current = false;
      setErrorCode(data.error || null);
      if (pendingMessageRef.current) {
        setErrorRetry(pendingMessageRef.current);
      }
      showToast(data.message, 'error');
      return accumulated;
    }

    if (event === 'heartbeat') {
      if (!accumulated) {
        setStatusMessage((prev) => prev || 'Processando...');
      }
      return accumulated;
    }

    return accumulated;
  }, [showToast, setConversationId]);

  const readStream = useCallback(async (reader, decoder) => {
    let buffer = '';
    let accumulated = '';
    let chunkCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.info(`[AiChat] Reader done after ${chunkCount} chunks`);
        break;
      }
      chunkCount++;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      const events = parseSSELines(lines);
      for (const { event, data } of events) {
        accumulated = handleStreamEvent(event, data, accumulated);
      }
    }
  }, [handleStreamEvent]);

  const sendMessage = useCallback(async (messageText) => {
    if (!user?.id || user.id !== ownerIdRef.current) return;
    const trimmedInput = messageText.trim();
    if (!trimmedInput || loadingRef.current) return;

    const userMessage = { role: 'user', content: trimmedInput };
    const streamingPlaceholder = { role: 'assistant', content: '', isStreaming: true };
    setMessages((prev) => [...prev, userMessage, streamingPlaceholder]);
    setErrorRetry(null);
    setErrorCode(null);
    pendingMessageRef.current = trimmedInput;
    setLoading(true);
    loadingRef.current = true;
    setStreamingText('');
    setStatusMessage('');

    const payload = {
      message: trimmedInput,
      ...(conversationIdRef.current && { conversationId: conversationIdRef.current }),
    };

    const doStreamFetch = async (token) => {
      return fetch(`${BASE_URL}/trainer/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
    };

    try {
      let token = localStorage.getItem('accessToken') || accessTokenRef.current;
      let response = await doStreamFetch(token);

      // If 401, try refreshing the token once (mirrors axios interceptor behavior)
      if (response.status === 401) {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          try {
            const refreshResp = await fetch(`${BASE_URL}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
            });
            if (refreshResp.ok) {
              const data = await refreshResp.json();
              const newAccessToken = data.token?.accessToken || data.accessToken;
              const newRefreshToken = data.refreshToken;
              if (newAccessToken) {
                localStorage.setItem('accessToken', newAccessToken);
                if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);
                window.dispatchEvent(new CustomEvent('treinoway:tokensRefreshed', {
                  detail: { newAccessToken, newRefreshToken },
                }));
                token = newAccessToken;
                response = await doStreamFetch(token);
              }
            }
          } catch {
            // Refresh failed, will fall through to the error below
          }
        }
      }

      if (!response.ok) {
        throw new Error('Erro ao conectar com o assistente.');
      }

      console.info('[AiChat] Stream started, reading...');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      await readStream(reader, decoder);
      console.info('[AiChat] Stream ended, loadingRef:', loadingRef.current);

      // If the stream ended without a 'done' or 'error' event, clean up
      if (loadingRef.current) {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.isStreaming && !last.content) {
            return [...prev.slice(0, -1), { role: 'assistant', content: 'A conexão foi interrompida. Tente novamente.' }];
          }
          if (last?.isStreaming) {
            return [...prev.slice(0, -1), { ...last, isStreaming: false }];
          }
          return prev;
        });
        setStreamingText('');
        setStatusMessage('');
        setHasNewResponse(true);
        setLoading(false);
        loadingRef.current = false;
      }
    } catch (err) {
      console.error('[AiChat] Stream error:', err.name, err.message);
      setMessages((prev) => prev.filter((m) => !m.isStreaming));
      setStreamingText('');
      setStatusMessage('');
      setErrorRetry(trimmedInput);
      showToast('Não foi possível conectar ao assistente. Tente novamente.', 'error');
      setLoading(false);
      loadingRef.current = false;
    }
  }, [readStream, showToast, user]);

  const startNewConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setErrorRetry(null);
    setErrorCode(null);
    setStreamingText('');
    setStatusMessage('');
    setHasNewResponse(false);
    pendingMessageRef.current = null;
  }, [setConversationId]);

  useEffect(() => {
    const currentUserId = user?.id ?? null;
    if (ownerIdRef.current !== currentUserId) {
      startNewConversation();
      ownerIdRef.current = currentUserId;
    }
  }, [user?.id, startNewConversation]);

  const loadConversation = useCallback(async (id) => {
    if (!user?.id || user.id !== ownerIdRef.current) return;
    setLoading(true);
    setMessages([]);
    setErrorRetry(null);

    try {
      const response = await api.get(`/trainer/ai/conversations/${id}`);
      const { id: convId, messages: dbMessages } = response.data;

      const uiMessages = dbMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        actionsExecuted: msg.toolCalls || [],
      }));

      setConversationId(convId);
      setMessages(uiMessages);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, user, setConversationId]);

  const clearNewResponse = useCallback(() => {
    setHasNewResponse(false);
  }, []);

  const retryLastMessage = useCallback(async () => {
    if (!errorRetry) return;
    const retryText = errorRetry;
    setErrorRetry(null);
    setErrorCode(null);
    await sendMessage(retryText);
  }, [errorRetry, sendMessage]);

  const isOwner = user?.id != null && user.id === ownerIdRef.current;

  const value = {
    messages: isOwner ? messages : [],
    conversationId: isOwner ? conversationId : null,
    loading: isOwner ? loading : false,
    streamingText: isOwner ? streamingText : '',
    statusMessage: isOwner ? statusMessage : '',
    hasNewResponse: isOwner ? hasNewResponse : false,
    errorRetry: isOwner ? errorRetry : null,
    errorCode: isOwner ? errorCode : null,
    sendMessage,
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
