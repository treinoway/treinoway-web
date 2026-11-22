import userEvent from '@testing-library/user-event';
import { renderWithRouter, screen } from '../../test/test-utils';
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

// Builds a mocked AiChat context value.
const contextValue = (overrides = {}) => ({
  messages: [{ id: 'm1', role: 'user', content: 'Monte uma rotina' }],
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

describe('AiAssistant — turn blocked by emailVerification.required', () => {
  beforeEach(() => {
    vi.mocked(useToast).mockReturnValue({ showToast: vi.fn() });
    vi.mocked(useAuth).mockReturnValue({ user: { firstName: 'Ana', lastName: 'Lima', email: 'ana@example.com' } });
    api.get.mockReset();
    api.get.mockResolvedValue({ data: [] });
    vi.mocked(useTrainerBriefingModule.default).mockReturnValue({ data: null, loading: false, error: null });
    vi.mocked(useStickToBottomModule.default).mockReturnValue({
      isNearBottom: true, shouldFollow: true, scrollToBottom: vi.fn(), onScroll: vi.fn(), bottomRef: { current: null },
    });
  });

  it('offers the retry with no inline error text', async () => {
    const retryLastMessage = vi.fn();
    const user = userEvent.setup();
    vi.mocked(useAiChat).mockReturnValue(contextValue({
      errorRetry: 'Monte uma rotina',
      errorCode: 'emailVerification.required',
      errorMessage: null,
      retryLastMessage,
    }));
    renderWithRouter(<AiAssistant />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(retryLastMessage).toHaveBeenCalledTimes(1);
  });

  it('hides the retry while the resent turn is loading', () => {
    vi.mocked(useAiChat).mockReturnValue(contextValue({
      loading: true,
      errorRetry: 'Monte uma rotina',
      errorCode: 'emailVerification.required',
    }));
    renderWithRouter(<AiAssistant />);

    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('still shows the error alert for any other failure', () => {
    vi.mocked(useAiChat).mockReturnValue(contextValue({
      errorRetry: 'Monte uma rotina',
      errorCode: 'auth.forbidden',
      errorMessage: 'Sem permissão.',
    }));
    renderWithRouter(<AiAssistant />);

    expect(screen.getByRole('alert')).toHaveTextContent('Sem permissão.');
  });
});
