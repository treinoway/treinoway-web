import { useEffect } from 'react';
import { act, render, screen, waitFor } from '../test/test-utils';
import { AiChatProvider, useAiChat } from './AiChatContext';
import { useAuth } from './AuthContext';
import api from '../api/axios';

vi.mock('./AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('./ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../api/axios', () => ({
  default: { get: vi.fn() },
  onNetworkError: vi.fn(() => vi.fn()),
  refreshAccessToken: vi.fn(),
  clearAuthAndRedirect: vi.fn(),
}));

const VERIFICATION_REQUIRED_EVENT = 'teufit:emailVerificationRequired';

// Builds a rejected HTTP response with a JSON body.
const failure = (status, body) => ({ ok: false, status, json: () => Promise.resolve(body) });

const chat = { current: null };

// Renders the error surface state the tests assert on.
const Probe = () => {
  const ctx = useAiChat();
  useEffect(() => {
    chat.current = ctx;
  });
  return (
    <div>
      <p>{`loading: ${ctx.loading}`}</p>
      <p>{`error: ${ctx.errorMessage ?? 'none'}`}</p>
      <p>{`retry: ${ctx.errorRetry ?? 'none'}`}</p>
      <p>{`code: ${ctx.errorCode ?? 'none'}`}</p>
      <p>{`messages: ${ctx.messages.length}`}</p>
    </div>
  );
};

// Sends one chat message through the context and waits for the turn to settle.
const sendAndSettle = async (text) => {
  await act(async () => {
    await chat.current.sendMessage(text);
  });
  await waitFor(() => expect(screen.getByText('loading: false')).toBeInTheDocument());
};

describe('AiChatContext — chat blocked by emailVerification.required', () => {
  const originalFetch = global.fetch;
  let listener;

  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ accessToken: 'token', user: { id: 'user-1' } });
    api.get.mockReset();
    global.fetch = vi.fn();
    listener = vi.fn();
    window.addEventListener(VERIFICATION_REQUIRED_EVENT, listener);
    render(
      <AiChatProvider>
        <Probe />
      </AiChatProvider>
    );
  });

  afterEach(() => {
    window.removeEventListener(VERIFICATION_REQUIRED_EVENT, listener);
    global.fetch = originalFetch;
  });

  it('shows no inline error, keeps the turn retryable and announces the block with reason "ai"', async () => {
    global.fetch.mockResolvedValue(failure(403, {
      error: 'EMAIL_VERIFICATION_REQUIRED',
      messageCode: 'emailVerification.required',
      message: 'Confirme seu e-mail para continuar.',
    }));

    await sendAndSettle('Monte uma rotina');

    expect(screen.getByText('error: none')).toBeInTheDocument();
    expect(screen.getByText('retry: Monte uma rotina')).toBeInTheDocument();
    expect(screen.getByText('code: emailVerification.required')).toBeInTheDocument();
    expect(screen.getByText('messages: 1')).toBeInTheDocument();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail.reason).toBe('ai');
  });

  it('resends the same message with retryLastMessage after the e-mail is confirmed, without a second user bubble', async () => {
    global.fetch.mockResolvedValueOnce(failure(403, {
      error: 'EMAIL_VERIFICATION_REQUIRED',
      messageCode: 'emailVerification.required',
      message: 'Confirme seu e-mail para continuar.',
    }));
    await sendAndSettle('Monte uma rotina');
    global.fetch.mockResolvedValueOnce(failure(403, { error: 'FORBIDDEN', messageCode: 'auth.forbidden', message: 'Sem permissão.' }));

    await act(async () => {
      await chat.current.retryLastMessage();
    });
    await waitFor(() => expect(screen.getByText('code: auth.forbidden')).toBeInTheDocument());

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(global.fetch.mock.calls[1][1].body).message).toBe('Monte uma rotina');
    expect(screen.getByText('messages: 1')).toBeInTheDocument();
  });

  it('still shows the inline error with retry for any other refusal', async () => {
    global.fetch.mockResolvedValue(failure(403, {
      error: 'FORBIDDEN',
      messageCode: 'auth.forbidden',
      message: 'Sem permissão.',
    }));

    await sendAndSettle('Monte uma rotina');

    expect(screen.queryByText('error: none')).not.toBeInTheDocument();
    expect(screen.getByText('retry: Monte uma rotina')).toBeInTheDocument();
    expect(screen.getByText('code: auth.forbidden')).toBeInTheDocument();
    expect(listener).not.toHaveBeenCalled();
  });
});
