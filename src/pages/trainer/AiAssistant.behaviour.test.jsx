import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import AiAssistant from './AiAssistant';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAiChat } from '../../contexts/AiChatContext';
import api from '../../api/axios';
import * as useStickToBottomModule from '../../hooks/useStickToBottom';
import * as useTrainerBriefingModule from '../../hooks/useTrainerBriefing';

vi.mock('../../contexts/ToastContext', () => ({ useToast: vi.fn() }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../../contexts/AiChatContext', () => ({ useAiChat: vi.fn() }));
vi.mock('../../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
}));
vi.mock('../../hooks/useStickToBottom', () => ({ default: vi.fn() }));
vi.mock('../../hooks/useTrainerBriefing', () => ({ default: vi.fn() }));

const conversations = [
  { id: 'conv-1', title: 'Primeira conversa', createdAt: '2026-03-01T10:00:00.000Z', updatedAt: '2026-03-01T10:05:00.000Z' },
  { id: 'conv-2', title: 'Segunda conversa', createdAt: '2026-03-02T10:00:00.000Z', updatedAt: '2026-03-02T10:05:00.000Z' },
];

// Builds a mocked AiChat context value.
const contextValue = (overrides = {}) => ({
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
});

// Returns the message textbox.
const composer = () => screen.getByRole('textbox', { name: /mensagem para o assistente/i });
// Opens the history modal and returns the dialog.
const openHistory = async (user) => {
  await user.click(screen.getByRole('button', { name: /^histórico$/i }));
  return screen.findByRole('dialog', { name: 'Histórico de conversas' });
};

describe('AiAssistant — behaviour (Teufit migration, a11y, removed fakes)', () => {
  let showToast;

  beforeEach(() => {
    showToast = vi.fn();
    vi.mocked(useToast).mockReturnValue({ showToast });
    vi.mocked(useAuth).mockReturnValue({ user: { firstName: 'João', lastName: 'Silva', email: 'joao@test.com' } });
    vi.mocked(useAiChat).mockReturnValue(contextValue());
    api.get.mockReset();
    api.delete.mockReset();
    api.get.mockResolvedValue({ data: conversations });
    vi.mocked(useTrainerBriefingModule.default).mockReturnValue({
      data: { activeStudents: 24, returningThisWeek: 2, stagnantProgress: 3, inactiveStudents: 2, overallAdherence: '87.00', adherenceDeltaPp: '4.00', computedAt: '2026-05-15T22:00:00.000Z' },
      loading: false,
      error: null,
    });
    vi.mocked(useStickToBottomModule.default).mockReturnValue({
      isNearBottom: true, shouldFollow: true, scrollToBottom: vi.fn(), onScroll: vi.fn(), bottomRef: { current: null },
    });
  });

  describe('AC 36: fake content removed', () => {
    it('does not render the fake "Aluno A/B/C" contextual suggestions', () => {
      renderWithRouter(<AiAssistant />);

      expect(screen.queryByText(/Aluno A/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Aluno B/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Aluno C/)).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /sugestões para agora/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/baseado nos dados dos seus alunos/i)).not.toBeInTheDocument();
    });

    it('keeps the real create cards', () => {
      renderWithRouter(<AiAssistant />);

      expect(screen.getByRole('heading', { name: 'Criar rotina completa' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Montar treino' })).toBeInTheDocument();
    });

    it('does not render the "Em breve" composer buttons (Anexar / Aluno / Biblioteca)', () => {
      renderWithRouter(<AiAssistant />);

      expect(screen.queryByRole('button', { name: /anexar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /selecionar aluno/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /biblioteca/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/em breve/i)).not.toBeInTheDocument();
    });

    it('still renders the real composer controls', () => {
      renderWithRouter(<AiAssistant />);

      expect(composer()).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /enviar mensagem/i })).toBeInTheDocument();
    });
  });

  describe('AC 37: composer input rules', () => {
    it('truncates a paste longer than 1000 characters to 1000 instead of ignoring it', async () => {
      const user = userEvent.setup();
      renderWithRouter(<AiAssistant />);

      await user.click(composer());
      await user.paste('a'.repeat(1200));

      expect(composer()).toHaveValue('a'.repeat(1000));
      expect(screen.getByText('1000/1000')).toBeInTheDocument();
    });

    it('truncates a paste so that existing text plus pasted text stays within 1000', async () => {
      const user = userEvent.setup();
      renderWithRouter(<AiAssistant />);

      await user.click(composer());
      await user.type(composer(), 'abc');
      await user.paste('b'.repeat(1200));

      expect(composer().value).toHaveLength(1000);
      expect(composer().value.startsWith('abc')).toBe(true);
    });

    it('sends on Enter', async () => {
      const user = userEvent.setup();
      const sendMessage = vi.fn();
      vi.mocked(useAiChat).mockReturnValue(contextValue({ sendMessage }));
      renderWithRouter(<AiAssistant />);

      await user.type(composer(), 'Monte um treino{Enter}');

      expect(sendMessage).toHaveBeenCalledWith('Monte um treino');
    });

    it('does not send on Shift+Enter', async () => {
      const user = userEvent.setup();
      const sendMessage = vi.fn();
      vi.mocked(useAiChat).mockReturnValue(contextValue({ sendMessage }));
      renderWithRouter(<AiAssistant />);

      await user.type(composer(), 'linha 1{Shift>}{Enter}{/Shift}linha 2');

      expect(sendMessage).not.toHaveBeenCalled();
    });

    it('does not send when Enter confirms an IME composition (isComposing)', async () => {
      const user = userEvent.setup();
      const sendMessage = vi.fn();
      vi.mocked(useAiChat).mockReturnValue(contextValue({ sendMessage }));
      renderWithRouter(<AiAssistant />);
      await user.type(composer(), 'こんにちは');

      fireEvent.keyDown(composer(), { key: 'Enter', isComposing: true });

      expect(sendMessage).not.toHaveBeenCalled();
      expect(composer()).toHaveValue('こんにちは');
    });

    it('does not send when the browser reports keyCode 229 (IME processing)', async () => {
      const user = userEvent.setup();
      const sendMessage = vi.fn();
      vi.mocked(useAiChat).mockReturnValue(contextValue({ sendMessage }));
      renderWithRouter(<AiAssistant />);
      await user.type(composer(), 'にほん');

      fireEvent.keyDown(composer(), { key: 'Enter', keyCode: 229 });

      expect(sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('AC 38: page structure', () => {
    it('exposes the page title as the single level-1 heading', () => {
      renderWithRouter(<AiAssistant />);

      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      expect(screen.getByRole('heading', { level: 1, name: 'iArnold' })).toBeInTheDocument();
    });

    it('keeps the history and new-conversation actions in the page header', () => {
      renderWithRouter(<AiAssistant />);

      expect(screen.getByRole('button', { name: /^histórico$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^nova conversa$/i })).toBeInTheDocument();
    });
  });

  describe('AC 39: history is a ds Modal', () => {
    it('opens as a modal dialog labelled by its title', async () => {
      const user = userEvent.setup();
      renderWithRouter(<AiAssistant />);

      const dialog = await openHistory(user);

      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(within(dialog).getByRole('heading', { name: 'Histórico de conversas' })).toBeInTheDocument();
      await waitFor(() => expect(within(dialog).getByText('Primeira conversa')).toBeInTheDocument());
    });

    it('moves focus into the dialog and keeps Tab inside it', async () => {
      const user = userEvent.setup();
      renderWithRouter(<AiAssistant />);
      const dialog = await openHistory(user);
      await waitFor(() => expect(within(dialog).getByText('Primeira conversa')).toBeInTheDocument());

      expect(dialog.contains(document.activeElement)).toBe(true);
      for (let i = 0; i < 12; i += 1) {
        await user.tab();
        expect(dialog.contains(document.activeElement)).toBe(true);
      }
    });

    it('closes on Escape', async () => {
      const user = userEvent.setup();
      renderWithRouter(<AiAssistant />);
      await openHistory(user);

      await user.keyboard('{Escape}');

      expect(screen.queryByRole('dialog', { name: 'Histórico de conversas' })).not.toBeInTheDocument();
    });

    it('closes when the scrim is clicked but not when the dialog body is clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter(<AiAssistant />);
      const dialog = await openHistory(user);

      await user.click(within(dialog).getByRole('heading', { name: 'Histórico de conversas' }));
      expect(screen.getByRole('dialog', { name: 'Histórico de conversas' })).toBeInTheDocument();

      await user.click(dialog.parentElement);
      expect(screen.queryByRole('dialog', { name: 'Histórico de conversas' })).not.toBeInTheDocument();
    });

    it('closes with the close button', async () => {
      const user = userEvent.setup();
      renderWithRouter(<AiAssistant />);
      const dialog = await openHistory(user);

      await user.click(within(dialog).getByRole('button', { name: /fechar/i }));

      expect(screen.queryByRole('dialog', { name: 'Histórico de conversas' })).not.toBeInTheDocument();
    });

    it('returns focus to the "Histórico" trigger after closing', async () => {
      const user = userEvent.setup();
      renderWithRouter(<AiAssistant />);
      const trigger = screen.getByRole('button', { name: /^histórico$/i });
      await openHistory(user);

      await user.keyboard('{Escape}');

      expect(trigger).toHaveFocus();
    });

    it('renders the empty history as an EmptyBlock (heading + message)', async () => {
      const user = userEvent.setup();
      api.get.mockResolvedValue({ data: [] });
      renderWithRouter(<AiAssistant />);

      const dialog = await openHistory(user);

      expect(await within(dialog).findByRole('heading', { name: 'Nenhuma conversa ainda.' })).toBeInTheDocument();
    });
  });

  describe('AC 39: delete uses ds ConfirmDialog', () => {
    const requestDelete = async (user, title = 'Primeira conversa') => {
      const dialog = await openHistory(user);
      await user.click(await within(dialog).findByRole('button', { name: `Excluir conversa: ${title}` }));
      return screen.findByRole('alertdialog');
    };

    it('asks for confirmation in an alertdialog naming the conversation', async () => {
      const user = userEvent.setup();
      renderWithRouter(<AiAssistant />);

      const confirm = await requestDelete(user);

      expect(confirm).toHaveAttribute('aria-modal', 'true');
      expect(within(confirm).getByText(/Excluir a conversa "Primeira conversa"/)).toBeInTheDocument();
      expect(api.delete).not.toHaveBeenCalled();
    });

    it('stays open and busy until the DELETE resolves, then closes', async () => {
      const user = userEvent.setup();
      let resolveDelete;
      api.delete.mockReturnValue(new Promise((resolve) => { resolveDelete = resolve; }));
      renderWithRouter(<AiAssistant />);
      const confirm = await requestDelete(user);

      await user.click(within(confirm).getByRole('button', { name: /^excluir$/i }));

      expect(api.delete).toHaveBeenCalledWith('/trainer/ai/conversations/conv-1');
      const busyDialog = screen.getByRole('alertdialog');
      expect(busyDialog).toHaveAttribute('aria-busy', 'true');
      within(busyDialog).getAllByRole('button').forEach((button) => expect(button).toBeDisabled());
      await user.keyboard('{Escape}');
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();

      resolveDelete({});

      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    });

    it('starts a new conversation when the deleted one is the active conversation', async () => {
      const user = userEvent.setup();
      const startNewConversation = vi.fn();
      vi.mocked(useAiChat).mockReturnValue(contextValue({ conversationId: 'conv-1', startNewConversation }));
      api.delete.mockResolvedValue({});
      renderWithRouter(<AiAssistant />);
      const confirm = await requestDelete(user);

      await user.click(within(confirm).getByRole('button', { name: /^excluir$/i }));

      await waitFor(() => expect(startNewConversation).toHaveBeenCalled());
    });

    it('closes and surfaces a toast when the DELETE fails', async () => {
      const user = userEvent.setup();
      api.delete.mockRejectedValue({ userMessage: 'Não foi possível excluir.' });
      renderWithRouter(<AiAssistant />);
      const confirm = await requestDelete(user);

      await user.click(within(confirm).getByRole('button', { name: /^excluir$/i }));

      await waitFor(() => expect(showToast).toHaveBeenCalledWith('Não foi possível excluir.', 'error'));
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });

    it('cancel closes without deleting', async () => {
      const user = userEvent.setup();
      renderWithRouter(<AiAssistant />);
      const confirm = await requestDelete(user);

      await user.click(within(confirm).getByRole('button', { name: /^cancelar$/i }));

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(api.delete).not.toHaveBeenCalled();
    });

    it('closes on Escape without deleting', async () => {
      const user = userEvent.setup();
      renderWithRouter(<AiAssistant />);
      await requestDelete(user);

      await user.keyboard('{Escape}');

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(api.delete).not.toHaveBeenCalled();
    });
  });

  describe('AC 31/39: error surface and live regions in the messages view', () => {
    const conversationMessages = [
      { role: 'user', content: 'Crie um treino' },
      { role: 'assistant', content: 'Claro, aqui está.', actionsExecuted: [] },
    ];

    it('shows the translated error from the context in a single alert with a retry button', async () => {
      const retryLastMessage = vi.fn();
      const user = userEvent.setup();
      vi.mocked(useAiChat).mockReturnValue(contextValue({
        messages: [{ role: 'user', content: 'Crie um treino' }],
        errorRetry: 'Crie um treino',
        errorCode: 'platformPlan.aiActionsExceeded',
        errorMessage: 'Você atingiu o limite de ações de IA deste aluno.',
        retryLastMessage,
      }));
      renderWithRouter(<AiAssistant />);

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Você atingiu o limite de ações de IA deste aluno.');
      await user.click(within(alert).getByRole('button', { name: /tentar novamente/i }));

      expect(retryLastMessage).toHaveBeenCalled();
      expect(screen.getAllByRole('alert')).toHaveLength(1);
      expect(showToast).not.toHaveBeenCalled();
    });

    it('does not hard-code the overloaded copy: the text comes from errorMessage only', () => {
      vi.mocked(useAiChat).mockReturnValue(contextValue({
        messages: conversationMessages,
        errorRetry: 'x',
        errorCode: 'ai.overloaded',
        errorMessage: 'Texto vindo do contexto.',
      }));
      renderWithRouter(<AiAssistant />);

      expect(screen.getByRole('alert')).toHaveTextContent('Texto vindo do contexto.');
      expect(screen.queryByText(/sobrecarregado no momento/i)).not.toBeInTheDocument();
    });

    it('shows the error even when there is nothing to retry (e.g. failed to open a conversation)', () => {
      vi.mocked(useAiChat).mockReturnValue(contextValue({
        messages: conversationMessages,
        errorRetry: null,
        errorMessage: 'Conversa não encontrada.',
      }));
      renderWithRouter(<AiAssistant />);

      expect(screen.getByRole('alert')).toHaveTextContent('Conversa não encontrada.');
      expect(screen.queryByRole('button', { name: /tentar novamente/i })).not.toBeInTheDocument();
    });

    it('shows no alert while there is no error', () => {
      vi.mocked(useAiChat).mockReturnValue(contextValue({ messages: conversationMessages }));
      renderWithRouter(<AiAssistant />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('does not show the error alert while a new message is loading', () => {
      vi.mocked(useAiChat).mockReturnValue(contextValue({
        messages: [{ role: 'user', content: 'x' }, { role: 'assistant', content: '', isStreaming: true }],
        loading: true,
        errorRetry: 'x',
        errorMessage: 'Erro antigo',
      }));
      renderWithRouter(<AiAssistant />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('has a single live region: none nested inside another while streaming', () => {
      vi.mocked(useAiChat).mockReturnValue(contextValue({
        messages: [{ role: 'user', content: 'x' }, { role: 'assistant', content: '', isStreaming: true }],
        loading: true,
        statusMessage: 'Criando o treino…',
      }));
      const { container } = renderWithRouter(<AiAssistant />);

      const liveSelector = '[aria-live], [role="status"], [role="log"]';
      const liveRegions = [...container.querySelectorAll(liveSelector)];
      expect(liveRegions).toHaveLength(1);
      liveRegions.forEach((region) => expect(region.parentElement.closest(liveSelector)).toBeNull());
    });
  });
});
