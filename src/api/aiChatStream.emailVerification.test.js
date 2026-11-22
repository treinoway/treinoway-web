import { openChatStream } from './aiChatStream';

const VERIFICATION_REQUIRED_EVENT = 'teufit:emailVerificationRequired';

// Builds a rejected HTTP response with a JSON body.
const failure = (status, body) => ({ ok: false, status, json: () => Promise.resolve(body) });

// Opens the chat stream and returns the error it rejects with.
const openAndCatch = () => openChatStream({
  payload: { message: 'oi' },
  token: 'token-abc',
  signal: new AbortController().signal,
}).catch((caught) => caught);

describe('aiChatStream — emailVerification.required', () => {
  const originalFetch = global.fetch;
  let listener;

  beforeEach(() => {
    global.fetch = vi.fn();
    listener = vi.fn();
    window.addEventListener(VERIFICATION_REQUIRED_EVENT, listener);
  });

  afterEach(() => {
    window.removeEventListener(VERIFICATION_REQUIRED_EVENT, listener);
    global.fetch = originalFetch;
  });

  it('announces the block with reason "ai" when the chat stream answers 403 emailVerification.required', async () => {
    global.fetch.mockResolvedValue(failure(403, {
      error: 'EMAIL_VERIFICATION_REQUIRED',
      messageCode: 'emailVerification.required',
      message: 'Confirme seu e-mail para usar a IA.',
    }));

    const error = await openAndCatch();

    expect(error.response.status).toBe(403);
    expect(error.response.data.messageCode).toBe('emailVerification.required');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail.reason).toBe('ai');
  });

  it('announces nothing for a 403 with another messageCode', async () => {
    global.fetch.mockResolvedValue(failure(403, {
      error: 'FORBIDDEN',
      messageCode: 'auth.forbidden',
      message: 'Sem permissão.',
    }));

    const error = await openAndCatch();

    expect(error.response.status).toBe(403);
    expect(listener).not.toHaveBeenCalled();
  });
});
