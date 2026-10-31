import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/test-utils';
import { AiChatProvider, useAiChat } from './AiChatContext';
import { useAuth } from './AuthContext';

// Hoisted so the vi.mock factories below can reference these fakes.
const platform = vi.hoisted(() => ({ isNative: vi.fn(), getPlatform: vi.fn() }));

vi.mock('../platform', () => platform);
vi.mock('./AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('../api/axios', () => ({ default: { get: vi.fn() } }));
vi.mock('../api/aiChatStream', () => ({
  openChatStream: vi.fn().mockResolvedValue({}),
  readChatEvents: vi.fn(),
}));

import { readChatEvents } from '../api/aiChatStream';

// Shows the chat state a screen would read.
const Probe = () => {
  const { startConversation, loading, messages, errorMessage, errorRetry } = useAiChat();
  return (
    <div>
      <button onClick={() => startConversation('Monte um treino')}>Enviar</button>
      <span aria-label="loading">{loading ? 'sim' : 'nao'}</span>
      <span aria-label="streaming">{messages.some((message) => message.isStreaming) ? 'sim' : 'nao'}</span>
      <span aria-label="error">{errorMessage ?? ''}</span>
      <span aria-label="retry">{errorRetry ?? ''}</span>
    </div>
  );
};

// Sets document.visibilityState and fires visibilitychange.
const changeVisibility = (state) => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  act(() => { document.dispatchEvent(new Event('visibilitychange')); });
};

// Starts a turn whose stream never ends on its own (until aborted), as a frozen connection would.
const startHangingTurn = async (user) => {
  readChatEvents.mockImplementation((response, signal) => new Promise((resolve) => {
    signal.addEventListener('abort', resolve);
  }));
  renderWithRouter(<AiChatProvider><Probe /></AiChatProvider>);
  await user.click(screen.getByRole('button', { name: 'Enviar' }));
  await waitFor(() => expect(screen.getByLabelText('streaming')).toHaveTextContent('sim'));
};

describe('AiChatContext: stream lost in the background', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(useAuth).mockReturnValue({ accessToken: 'token', user: { id: 'u1' } });
    platform.isNative.mockReturnValue(true);
    changeVisibility('visible');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('drops the half answer and offers a retry after a long background stay', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await startHangingTurn(user);

    changeVisibility('hidden');
    vi.advanceTimersByTime(6000);
    changeVisibility('visible');

    await waitFor(() => expect(screen.getByLabelText('error')).not.toHaveTextContent(/^$/));
    expect(screen.getByLabelText('streaming')).toHaveTextContent('nao');
    expect(screen.getByLabelText('loading')).toHaveTextContent('nao');
    expect(screen.getByLabelText('retry')).toHaveTextContent('Monte um treino');
  });

  it('keeps streaming after a short background stay', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await startHangingTurn(user);

    changeVisibility('hidden');
    vi.advanceTimersByTime(1000);
    changeVisibility('visible');

    expect(screen.getByLabelText('streaming')).toHaveTextContent('sim');
    expect(screen.getByLabelText('error')).toHaveTextContent(/^$/);
  });

  it('leaves the website untouched', async () => {
    platform.isNative.mockReturnValue(false);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await startHangingTurn(user);

    changeVisibility('hidden');
    vi.advanceTimersByTime(6000);
    changeVisibility('visible');

    expect(screen.getByLabelText('streaming')).toHaveTextContent('sim');
  });
});
