import { discardLocalPushToken } from './pushToken';
import { isNative, push } from '../platform';

vi.mock('../platform', () => ({
  isNative: vi.fn(),
  push: { deleteToken: vi.fn() },
}));

describe('discardLocalPushToken', () => {
  let errorSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('does nothing on the web', async () => {
    vi.mocked(isNative).mockReturnValue(false);
    await expect(discardLocalPushToken()).resolves.toBeUndefined();
    expect(push.deleteToken).not.toHaveBeenCalled();
  });

  it('deletes the local token once on native', async () => {
    vi.mocked(isNative).mockReturnValue(true);
    vi.mocked(push.deleteToken).mockResolvedValue(undefined);
    await discardLocalPushToken();
    expect(push.deleteToken).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('resolves and logs when deleteToken rejects', async () => {
    vi.mocked(isNative).mockReturnValue(true);
    const failure = new Error('boom');
    vi.mocked(push.deleteToken).mockRejectedValue(failure);
    await expect(discardLocalPushToken()).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith('[push] could not delete the local token:', failure);
  });

  it('resolves and logs when deleteToken throws synchronously', async () => {
    vi.mocked(isNative).mockReturnValue(true);
    const failure = new Error('sync boom');
    vi.mocked(push.deleteToken).mockImplementation(() => { throw failure; });
    await expect(discardLocalPushToken()).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith('[push] could not delete the local token:', failure);
  });
});
