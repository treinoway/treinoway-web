import { renderHook, waitFor } from '../test/test-utils';
import useInvitePreview from './useInvitePreview';
import api from '../api/axios';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn() },
}));

const PREVIEW = {
  email: 'convidado@teufit.com.br',
  invitedByName: 'Carolina',
  expiresAt: '2026-10-15T00:00:00.000Z',
  accountExists: false,
};

const httpError = (status, messageCode, userMessage = 'Falhou.') => ({
  response: { status, data: { messageCode } },
  errorInfo: { status, messageCode },
  userMessage,
});

describe('useInvitePreview', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  it('is idle and does not call the API when there is no code', () => {
    const { result } = renderHook(() => useInvitePreview(''));

    expect(result.current.status).toBe('idle');
    expect(api.get).not.toHaveBeenCalled();
  });

  it('is loading while the preview request is in flight', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useInvitePreview('TF-7BCA-YAZS-BD'));

    expect(result.current.status).toBe('loading');
    expect(api.get).toHaveBeenCalledWith(
      '/invite/preview',
      expect.objectContaining({ params: { code: 'TF-7BCA-YAZS-BD' } })
    );
  });

  it('resolves to valid with the preview data', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: PREVIEW });

    const { result } = renderHook(() => useInvitePreview('TF-7BCA-YAZS-BD'));

    await waitFor(() => expect(result.current.status).toBe('valid'));
    expect(result.current.data).toEqual(PREVIEW);
    expect(result.current.errorCode).toBeNull();
  });

  it.each([
    [404, 'invite.notFound'],
    [403, 'invite.expired'],
    [403, 'invite.revoked'],
    [409, 'invite.alreadyAccepted'],
  ])('is invalid on %i %s', async (status, messageCode) => {
    vi.mocked(api.get).mockRejectedValue(httpError(status, messageCode, 'Convite inválido.'));

    const { result } = renderHook(() => useInvitePreview('TF-7BCA-YAZS-BD'));

    await waitFor(() => expect(result.current.status).toBe('invalid'));
    expect(result.current.errorCode).toBe(messageCode);
    expect(result.current.message).toBe('Convite inválido.');
  });

  it.each([
    ['network error', { userMessage: 'Sem conexão.' }],
    ['5xx', httpError(500, 'server.error')],
    ['429 rate limit', httpError(429, 'invite.rateLimited')],
    ['4xx without an invite messageCode', httpError(400, 'validation.failed')],
  ])('falls back to error on %s', async (_label, error) => {
    vi.mocked(api.get).mockRejectedValue(error);

    const { result } = renderHook(() => useInvitePreview('TF-7BCA-YAZS-BD'));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.data).toBeNull();
  });

  it('ignores a stale response after the code changes', async () => {
    let resolveFirst;
    vi.mocked(api.get)
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce({ data: { ...PREVIEW, email: 'segundo@teufit.com.br' } });

    const { result, rerender } = renderHook(({ code }) => useInvitePreview(code), {
      initialProps: { code: 'TF-AAAA-AAAA-AA' },
    });

    rerender({ code: 'TF-BBBB-BBBB-BB' });
    await waitFor(() => expect(result.current.status).toBe('valid'));

    resolveFirst({ data: { ...PREVIEW, email: 'primeiro@teufit.com.br' } });
    await Promise.resolve();

    expect(result.current.data.email).toBe('segundo@teufit.com.br');
  });

  it('aborts the in-flight request on unmount', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));

    const { unmount } = renderHook(() => useInvitePreview('TF-7BCA-YAZS-BD'));
    const { signal } = vi.mocked(api.get).mock.calls[0][1];

    unmount();

    expect(signal.aborted).toBe(true);
  });
});
