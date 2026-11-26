import { dismissEmailBanner, isEmailBannerDismissed } from './emailBannerDismissal';

describe('emailBannerDismissal', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is not dismissed until the user dismisses it', () => {
    expect(isEmailBannerDismissed('user-1')).toBe(false);
  });

  it('records the dismissal in sessionStorage for that user only', () => {
    dismissEmailBanner('user-1');

    expect(isEmailBannerDismissed('user-1')).toBe(true);
    expect(isEmailBannerDismissed('user-2')).toBe(false);
    expect(sessionStorage.getItem('teufit:emailBannerDismissed:user-1')).not.toBeNull();
    expect(localStorage.getItem('teufit:emailBannerDismissed:user-1')).toBeNull();
  });

  it('ignores a missing user id', () => {
    dismissEmailBanner(undefined);

    expect(sessionStorage.length).toBe(0);
    expect(isEmailBannerDismissed(undefined)).toBe(false);
  });

  it('treats an unavailable sessionStorage as not dismissed and does not throw', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });

    expect(() => dismissEmailBanner('user-1')).not.toThrow();
    expect(isEmailBannerDismissed('user-1')).toBe(false);
  });
});
