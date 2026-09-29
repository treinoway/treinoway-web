import { renderHook, waitFor } from '../test/test-utils';
import useInviteAuthFlow from './useInviteAuthFlow';
import api from '../api/axios';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn() },
}));

describe('useInviteAuthFlow', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  it('is not an invite flow without a code', () => {
    const { result } = renderHook(() => useInviteAuthFlow(null));

    expect(result.current.isInviteFlow).toBe(false);
    expect(result.current.lockedEmail).toBeNull();
    expect(api.get).not.toHaveBeenCalled();
  });

  it('normalizes the raw code before requesting the preview', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useInviteAuthFlow('tf-7bca-yazs-bd'));

    expect(result.current.code).toBe('TF-7BCA-YAZS-BD');
    expect(result.current.isLoading).toBe(true);
    expect(api.get).toHaveBeenCalledWith(
      '/invite/preview',
      expect.objectContaining({ params: { code: 'TF-7BCA-YAZS-BD' } })
    );
  });

  it('exposes the locked email and accountExists when valid', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { email: 'a@b.com', expiresAt: '2026-10-01T00:00:00Z', accountExists: true },
    });

    const { result } = renderHook(() => useInviteAuthFlow('TF-7BCA-YAZS-BD'));

    await waitFor(() => expect(result.current.isValid).toBe(true));
    expect(result.current.lockedEmail).toBe('a@b.com');
    expect(result.current.accountExists).toBe(true);
  });

  it('keeps the invite flow but unlocks the email when the preview is unavailable', async () => {
    vi.mocked(api.get).mockRejectedValue({ userMessage: 'Sem conexão.' });

    const { result } = renderHook(() => useInviteAuthFlow('TF-7BCA-YAZS-BD'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isInviteFlow).toBe(true);
    expect(result.current.isInvalid).toBe(false);
    expect(result.current.lockedEmail).toBeNull();
  });
});
