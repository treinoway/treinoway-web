const VERIFICATION_REQUIRED_EVENT = 'teufit:emailVerificationRequired';

const mockAdapter = vi.fn();

// Loads a fresh axios instance whose requests go to the mock adapter.
const loadApi = async () => {
  vi.resetModules();
  const module = await import('./axios');
  const api = module.default;
  api.defaults.adapter = mockAdapter;
  return api;
};

// Makes the adapter reject every request with the given status and body.
const rejectWith = (status, data) => {
  mockAdapter.mockImplementation((config) => {
    const error = new Error(`Request failed with status code ${status}`);
    error.config = config;
    error.response = { status, data, headers: {}, config };
    return Promise.reject(error);
  });
};

const VERIFICATION_REQUIRED_BODY = {
  error: 'EMAIL_VERIFICATION_REQUIRED',
  messageCode: 'emailVerification.required',
  message: 'Confirme seu e-mail para continuar.',
};

describe('axios interceptor — emailVerification.required', () => {
  let listener;

  beforeEach(() => {
    mockAdapter.mockReset();
    localStorage.clear();
    localStorage.setItem('accessToken', 'token-abc');
    listener = vi.fn();
    window.addEventListener(VERIFICATION_REQUIRED_EVENT, listener);
  });

  afterEach(() => {
    window.removeEventListener(VERIFICATION_REQUIRED_EVENT, listener);
  });

  it('announces the block with reason "ai" when the failing request is an AI endpoint', async () => {
    rejectWith(403, VERIFICATION_REQUIRED_BODY);
    const api = await loadApi();

    await expect(api.get('/trainer/ai/conversations')).rejects.toBeDefined();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail.reason).toBe('ai');
  });

  it('announces the block with no reason when a student invite is refused', async () => {
    rejectWith(403, VERIFICATION_REQUIRED_BODY);
    const api = await loadApi();

    await expect(api.post('/trainer/student-invites', { email: 'aluno@example.com' })).rejects.toBeDefined();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail?.reason).toBeUndefined();
  });

  it('announces the block with no reason when a patient invite is refused', async () => {
    rejectWith(403, VERIFICATION_REQUIRED_BODY);
    const api = await loadApi();

    await expect(api.post('/nutritionist/patient-invites', { email: 'paciente@example.com' })).rejects.toBeDefined();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail?.reason).toBeUndefined();
  });

  it('still rejects with the structured error so the caller can stop its own flow', async () => {
    rejectWith(403, VERIFICATION_REQUIRED_BODY);
    const api = await loadApi();

    const error = await api.post('/trainer/student-invites', { email: 'aluno@example.com' }).catch((caught) => caught);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(error.errorInfo.messageCode).toBe('emailVerification.required');
    expect(error.response.status).toBe(403);
  });

  it('announces nothing for a 403 with another messageCode', async () => {
    rejectWith(403, { error: 'FORBIDDEN', messageCode: 'auth.forbidden', message: 'Sem permissão.' });
    const api = await loadApi();

    const error = await api.get('/trainer/ai/conversations').catch((caught) => caught);

    expect(error.errorInfo.messageCode).toBe('auth.forbidden');
    expect(listener).not.toHaveBeenCalled();
  });
});
