import { useState, useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';
import { tf, t, translateError } from '../i18n';
import { groupConversationsByDate } from '../utils/conversationGroups';
import useConfirmDialog from './useConfirmDialog';

/**
 * State and handlers of the iArnold history modal: list, open and delete behind a confirm dialog.
 *
 * @param {object} options
 * @param {string|null} options.conversationId Active conversation id.
 * @param {(id: string) => Promise<void>} options.loadConversation Opens a stored conversation.
 * @param {() => void} options.startNewConversation Clears the active conversation.
 * @param {() => void} options.onConversationOpened Runs after a conversation was opened.
 */
const useConversationHistory = ({ conversationId, loadConversation, startNewConversation, onConversationOpened }) => {
  const { showToast } = useToast();
  const { dialogProps, requestConfirm } = useConfirmDialog();
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingId, setLoadingId] = useState(null);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/trainer/ai/conversations');
      setConversations(response.data);
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const open = async () => {
    setIsOpen(true);
    await fetchConversations();
  };

  const close = () => setIsOpen(false);

  const select = async (conversation) => {
    setLoadingId(conversation.id);
    try {
      await loadConversation(conversation.id);
      setIsOpen(false);
      onConversationOpened();
    } catch (error) {
      showToast(error.userMessage || translateError(error), 'error');
    } finally {
      setLoadingId(null);
    }
  };

  const remove = (conversation) => {
    setIsOpen(false);
    requestConfirm({
      message: tf('iArnold.history.confirmRemove', { title: conversation.title || t('iArnold.history.untitled') }),
      onConfirm: async () => {
        await api.delete(`/trainer/ai/conversations/${conversation.id}`);
        setConversations((prev) => prev.filter((item) => item.id !== conversation.id));
        if (conversationId === conversation.id) startNewConversation();
      },
    });
  };

  return {
    isOpen,
    loading,
    loadingId,
    groups: groupConversationsByDate(conversations),
    confirmDialogProps: dialogProps,
    open,
    close,
    select,
    remove,
  };
};

export default useConversationHistory;
