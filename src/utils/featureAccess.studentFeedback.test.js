import { describe, it, expect } from 'vitest';
import { isStudentFeedbackVisible } from './featureAccess';

describe('isStudentFeedbackVisible', () => {
  it('hides the student feedback from a non-admin on the production hostname', () => {
    expect(isStudentFeedbackVisible({ hostname: 'app.teufit.com.br', isDev: false, isAdmin: false })).toBe(false);
  });

  it('shows the student feedback to an admin on the production hostname', () => {
    expect(isStudentFeedbackVisible({ hostname: 'app.teufit.com.br', isDev: false, isAdmin: true })).toBe(true);
  });

  it('shows the student feedback to a non-admin on a staging hostname, case-insensitively', () => {
    expect(isStudentFeedbackVisible({ hostname: 'TEUFIT-WEB-STAGING.up.railway.app', isDev: false, isAdmin: false })).toBe(true);
  });

  it('shows the student feedback to a non-admin in a dev build on any hostname', () => {
    expect(isStudentFeedbackVisible({ hostname: 'app.teufit.com.br', isDev: true, isAdmin: false })).toBe(true);
  });

  it.each(['localhost', '127.0.0.1', '[::1]', 'teufit.localhost'])(
    'shows the student feedback to a non-admin on the local hostname %s',
    (hostname) => {
      expect(isStudentFeedbackVisible({ hostname, isDev: false, isAdmin: false })).toBe(true);
    },
  );

  it.each(['', 'example.com'])('fails closed for a non-admin on the hostname "%s"', (hostname) => {
    expect(isStudentFeedbackVisible({ hostname, isDev: false, isAdmin: false })).toBe(false);
  });

  it('treats a non-boolean truthy isAdmin as non-admin on production', () => {
    expect(isStudentFeedbackVisible({ hostname: 'app.teufit.com.br', isDev: false, isAdmin: 'yes' })).toBe(false);
  });
});
