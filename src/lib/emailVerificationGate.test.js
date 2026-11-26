import {
  announceEmailVerified,
  announceEmailVerificationRequired,
  getEmailVerificationReason,
  isEmailVerificationRequired,
} from './emailVerificationGate';

const EVENT = 'teufit:emailVerificationRequired';

describe('emailVerificationGate', () => {
  describe('isEmailVerificationRequired', () => {
    it('reads the messageCode the axios interceptor attached', () => {
      expect(isEmailVerificationRequired({ errorInfo: { messageCode: 'emailVerification.required' } })).toBe(true);
    });

    it('falls back to the raw response body (fetch-based callers)', () => {
      expect(isEmailVerificationRequired({ response: { data: { messageCode: 'emailVerification.required' } } })).toBe(true);
    });

    it('is false for another messageCode, a network error or no error', () => {
      expect(isEmailVerificationRequired({ errorInfo: { messageCode: 'auth.forbidden' } })).toBe(false);
      expect(isEmailVerificationRequired(new Error('Network Error'))).toBe(false);
      expect(isEmailVerificationRequired(null)).toBe(false);
    });
  });

  describe('getEmailVerificationReason', () => {
    it.each(['/trainer/ai/chat', '/trainer/ai/conversations/abc', '/trainer/ai?x=1', '/trainer/ai'])(
      'returns "ai" for %s',
      (url) => {
        expect(getEmailVerificationReason(url)).toBe('ai');
      }
    );

    it.each(['/trainer/student-invites', '/nutritionist/patient-invites', '/trainer/trainings', '', undefined])(
      'returns undefined for %s',
      (url) => {
        expect(getEmailVerificationReason(url)).toBeUndefined();
      }
    );
  });

  describe('announceEmailVerificationRequired', () => {
    let listener;

    beforeEach(() => {
      listener = vi.fn();
      window.addEventListener(EVENT, listener);
    });

    afterEach(() => {
      window.removeEventListener(EVENT, listener);
    });

    it('dispatches the window event with the reason', () => {
      announceEmailVerificationRequired('ai');

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0][0].detail).toEqual({ reason: 'ai' });
    });

    it('dispatches an empty detail when there is no reason', () => {
      announceEmailVerificationRequired();

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0][0].detail).toEqual({});
    });
  });

  describe('announceEmailVerified', () => {
    it('dispatches teufit:emailVerified with the user id', () => {
      const listener = vi.fn();
      window.addEventListener('teufit:emailVerified', listener);

      announceEmailVerified('user-1');

      window.removeEventListener('teufit:emailVerified', listener);
      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0][0].detail).toEqual({ userId: 'user-1' });
    });
  });
});
