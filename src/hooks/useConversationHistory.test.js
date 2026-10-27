import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import useConversationHistory from './useConversationHistory';
import { useToast } from '../contexts/ToastContext';
import api from '../api/axios';

vi.mock('../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));

const NOW = Date.now();
const MINUTE_MS = 60_000;
const conversations = [
  { id: 'c1', title: 'Primeira', updatedAt: new Date(NOW - MINUTE_MS).toISOString() },
  { id: 'c2', title: 'Segunda', updatedAt: new Date(NOW - 2 * MINUTE_MS).toISOString() },
];

// Renders the hook with spy callbacks.
const setup = (overrides = {}) => {
  const options = {
    conversationId: null,
    loadConversation: vi.fn().mockResolvedValue(undefined),
    startNewConversation: vi.fn(),
    onConversationOpened: vi.fn(),
    ...overrides,
  };
  const hook = renderHook(() => useConversationHistory(options));
  return { ...hook, options };
};

// Flattens the grouped conversations to their ids.
const idsOf = (groups) => groups.flatMap((group) => group.conversations.map((item) => item.id));

describe('useConversationHistory', () => {
  let showToast;

  beforeEach(() => {
    showToast = vi.fn();
    vi.mocked(useToast).mockReturnValue({ showToast });
    api.get.mockReset();
    api.delete.mockReset();
    api.get.mockResolvedValue({ data: conversations });
  });

  it('starts closed and empty', () => {
    const { result } = setup();

    expect(result.current.isOpen).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.groups).toEqual([]);
    expect(result.current.confirmDialogProps).toBeNull();
  });

  it('opens, shows loading while fetching, then lists the conversations', async () => {
    let resolveGet;
    api.get.mockReturnValue(new Promise((resolve) => { resolveGet = resolve; }));
    const { result } = setup();

    act(() => { result.current.open(); });

    expect(result.current.isOpen).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(true));
    expect(api.get).toHaveBeenCalledWith('/trainer/ai/conversations');

    await act(async () => { resolveGet({ data: conversations }); });

    expect(result.current.loading).toBe(false);
    expect(idsOf(result.current.groups)).toEqual(['c1', 'c2']);
  });

  it('closes without discarding the loaded list', async () => {
    const { result } = setup();
    await act(async () => { await result.current.open(); });

    act(() => result.current.close());

    expect(result.current.isOpen).toBe(false);
    expect(idsOf(result.current.groups)).toHaveLength(2);
  });

  it('toasts the error when loading the list fails and stops loading', async () => {
    api.get.mockRejectedValue({ userMessage: 'Falha ao listar' });
    const { result } = setup();

    await act(async () => { await result.current.open(); });

    expect(showToast).toHaveBeenCalledWith('Falha ao listar', 'error');
    expect(result.current.loading).toBe(false);
    expect(result.current.groups).toEqual([]);
  });

  it('opens a conversation, closes the modal and notifies', async () => {
    const { result, options } = setup();
    await act(async () => { await result.current.open(); });

    await act(async () => { await result.current.select(conversations[0]); });

    expect(options.loadConversation).toHaveBeenCalledWith('c1');
    expect(result.current.isOpen).toBe(false);
    expect(options.onConversationOpened).toHaveBeenCalled();
    expect(result.current.loadingId).toBeNull();
  });

  it('keeps the modal open and toasts when opening a conversation rejects', async () => {
    const { result, options } = setup({ loadConversation: vi.fn().mockRejectedValue({ userMessage: 'Erro' }) });
    await act(async () => { await result.current.open(); });

    await act(async () => { await result.current.select(conversations[0]); });

    expect(showToast).toHaveBeenCalledWith('Erro', 'error');
    expect(result.current.isOpen).toBe(true);
    expect(options.onConversationOpened).not.toHaveBeenCalled();
  });

  describe('delete', () => {
    it('closes the modal and asks for confirmation naming the conversation, without deleting yet', async () => {
      const { result } = setup();
      await act(async () => { await result.current.open(); });

      act(() => result.current.remove(conversations[0]));

      expect(result.current.isOpen).toBe(false);
      expect(result.current.confirmDialogProps.message).toBe('Excluir a conversa "Primeira"? Esta ação não pode ser desfeita.');
      expect(api.delete).not.toHaveBeenCalled();
    });

    it('is busy while DELETE runs, then removes the item and closes the confirmation', async () => {
      let resolveDelete;
      api.delete.mockReturnValue(new Promise((resolve) => { resolveDelete = resolve; }));
      const { result } = setup();
      await act(async () => { await result.current.open(); });
      act(() => result.current.remove(conversations[0]));

      act(() => { result.current.confirmDialogProps.onConfirm(); });

      await waitFor(() => expect(result.current.confirmDialogProps.busy).toBe(true));
      expect(api.delete).toHaveBeenCalledWith('/trainer/ai/conversations/c1');
      expect(idsOf(result.current.groups)).toContain('c1');

      await act(async () => { resolveDelete({}); });

      expect(result.current.confirmDialogProps).toBeNull();
      expect(idsOf(result.current.groups)).toEqual(['c2']);
    });

    it('starts a new conversation when the deleted one is active', async () => {
      api.delete.mockResolvedValue({});
      const { result, options } = setup({ conversationId: 'c1' });
      await act(async () => { await result.current.open(); });
      act(() => result.current.remove(conversations[0]));

      await act(async () => { await result.current.confirmDialogProps.onConfirm(); });

      expect(options.startNewConversation).toHaveBeenCalled();
    });

    it('does not reset the chat when another conversation is deleted', async () => {
      api.delete.mockResolvedValue({});
      const { result, options } = setup({ conversationId: 'c2' });
      await act(async () => { await result.current.open(); });
      act(() => result.current.remove(conversations[0]));

      await act(async () => { await result.current.confirmDialogProps.onConfirm(); });

      expect(options.startNewConversation).not.toHaveBeenCalled();
    });

    it('keeps the item and shows an error toast when DELETE fails', async () => {
      api.delete.mockRejectedValue({ userMessage: 'Não foi possível excluir.' });
      const { result, options } = setup({ conversationId: 'c1' });
      await act(async () => { await result.current.open(); });
      act(() => result.current.remove(conversations[0]));

      await act(async () => { await result.current.confirmDialogProps.onConfirm(); });

      expect(showToast).toHaveBeenCalledWith('Não foi possível excluir.', 'error');
      expect(idsOf(result.current.groups)).toEqual(['c1', 'c2']);
      expect(options.startNewConversation).not.toHaveBeenCalled();
      expect(result.current.confirmDialogProps).toBeNull();
    });

    it('cancelling the confirmation leaves everything untouched', async () => {
      const { result } = setup();
      await act(async () => { await result.current.open(); });
      act(() => result.current.remove(conversations[0]));

      act(() => result.current.confirmDialogProps.onCancel());

      expect(result.current.confirmDialogProps).toBeNull();
      expect(api.delete).not.toHaveBeenCalled();
      expect(idsOf(result.current.groups)).toHaveLength(2);
    });
  });
});
