import {
  canRevokeInvite,
  showsInviteExpiry,
  getResendAvailability,
  hasResendCountdown,
  retryAfterSecondsToMinutes,
  formatRetryAfterDuration,
  formatSendCount,
  formatInviteDate,
} from './studentInvite';

const NOW = Date.parse('2026-09-29T12:00:00.000Z');
const MINUTE_MS = 60 * 1000;
const inMinutes = (minutes) => new Date(NOW + minutes * MINUTE_MS).toISOString();

describe('studentInvite utils', () => {
  it('allows revoke only for pending invites', () => {
    expect(canRevokeInvite({ status: 'pending' })).toBe(true);
    expect(canRevokeInvite({ status: 'expired' })).toBe(false);
  });

  it('shows the expiry date only for pending and expired invites', () => {
    expect(showsInviteExpiry({ status: 'pending' })).toBe(true);
    expect(showsInviteExpiry({ status: 'expired' })).toBe(true);
    expect(showsInviteExpiry({ status: 'accepted' })).toBe(false);
    expect(showsInviteExpiry({ status: 'revoked' })).toBe(false);
  });

  describe('getResendAvailability', () => {
    it('is available whenever the server says canResend, regardless of status', () => {
      expect(getResendAvailability({ status: 'pending', canResend: true, resendAvailableAt: null }, NOW))
        .toEqual({ state: 'available', minutes: 0 });
      expect(getResendAvailability({ status: 'expired', canResend: true, resendAvailableAt: null }, NOW))
        .toEqual({ state: 'available', minutes: 0 });
    });

    it('reports a cooldown with whole minutes left until resendAvailableAt', () => {
      const invite = { status: 'pending', canResend: false, resendAvailableAt: inMinutes(49.5) };
      expect(getResendAvailability(invite, NOW)).toEqual({ state: 'cooldown', minutes: 50 });
    });

    it('becomes available once resendAvailableAt has passed on the client', () => {
      const invite = { status: 'pending', canResend: false, resendAvailableAt: inMinutes(-1) };
      expect(getResendAvailability(invite, NOW).state).toBe('available');
    });

    it('flags the send limit for a pending invite with no resendAvailableAt', () => {
      const invite = { status: 'pending', canResend: false, resendAvailableAt: null };
      expect(getResendAvailability(invite, NOW).state).toBe('limitReached');
    });

    it('is unavailable for accepted, revoked and stored-expired invites', () => {
      ['accepted', 'revoked', 'expired'].forEach((status) => {
        expect(getResendAvailability({ status, canResend: false, resendAvailableAt: null }, NOW).state)
          .toBe('unavailable');
      });
    });
  });

  it('detects invites with a running countdown', () => {
    expect(hasResendCountdown({ canResend: false, resendAvailableAt: inMinutes(10) })).toBe(true);
    expect(hasResendCountdown({ canResend: true, resendAvailableAt: null })).toBe(false);
    expect(hasResendCountdown({ canResend: false, resendAvailableAt: null })).toBe(false);
  });

  it('rounds retryAfterSeconds up to minutes with a minimum of 1', () => {
    expect(retryAfterSecondsToMinutes(1500)).toBe(25);
    expect(retryAfterSecondsToMinutes(61)).toBe(2);
    expect(retryAfterSecondsToMinutes(5)).toBe(1);
  });

  it('formats retryAfterSeconds as hours and minutes', () => {
    expect(formatRetryAfterDuration(2400)).toBe('40 min');
    expect(formatRetryAfterDuration(3600)).toBe('1 h');
    expect(formatRetryAfterDuration(8100)).toBe('2 h 15 min');
    expect(formatRetryAfterDuration(8101)).toBe('2 h 16 min');
    expect(formatRetryAfterDuration(10)).toBe('1 min');
  });

  it('pluralizes the send count', () => {
    expect(formatSendCount(1)).toBe('1 envio');
    expect(formatSendCount(3)).toBe('3 envios');
    expect(formatSendCount(undefined)).toBe('0 envios');
  });

  it('formats dates and falls back to "-" for missing or invalid values', () => {
    expect(formatInviteDate('2026-10-29T12:00:00.000Z')).toBe('29/10/2026');
    expect(formatInviteDate(null)).toBe('-');
    expect(formatInviteDate('not-a-date')).toBe('-');
  });
});
