import { describe, it, expect } from 'vitest';
import { isConsistencyRankingVisible } from './featureAccess';

describe('PAN-61 isConsistencyRankingVisible', () => {
  it('PAN-61 hides the ranking from a non-admin on the production hostname', () => {
    expect(isConsistencyRankingVisible({ hostname: 'app.teufit.com.br', isDev: false, isAdmin: false })).toBe(false);
  });

  it('PAN-61 hides the ranking from a non-admin on the legacy production hostname', () => {
    expect(isConsistencyRankingVisible({ hostname: 'www.treinoway.com.br', isDev: false, isAdmin: false })).toBe(false);
  });

  it('PAN-61 shows the ranking to an admin on the production hostname', () => {
    expect(isConsistencyRankingVisible({ hostname: 'app.teufit.com.br', isDev: false, isAdmin: true })).toBe(true);
  });

  it('PAN-61 shows the ranking to a non-admin on a staging hostname', () => {
    expect(
      isConsistencyRankingVisible({ hostname: 'teufit-web-staging.up.railway.app', isDev: false, isAdmin: false }),
    ).toBe(true);
  });

  it('PAN-61 matches staging case-insensitively', () => {
    expect(
      isConsistencyRankingVisible({ hostname: 'TEUFIT-WEB-STAGING.up.railway.app', isDev: false, isAdmin: false }),
    ).toBe(true);
  });

  it('PAN-61 shows the ranking to a non-admin in a dev build on any hostname', () => {
    expect(isConsistencyRankingVisible({ hostname: 'app.teufit.com.br', isDev: true, isAdmin: false })).toBe(true);
  });

  it.each(['localhost', '127.0.0.1', '[::1]', 'teufit.localhost'])(
    'PAN-61 shows the ranking to a non-admin on the local hostname %s',
    (hostname) => {
      expect(isConsistencyRankingVisible({ hostname, isDev: false, isAdmin: false })).toBe(true);
    },
  );

  it('PAN-61 fails closed for a non-admin on an empty hostname', () => {
    expect(isConsistencyRankingVisible({ hostname: '', isDev: false, isAdmin: false })).toBe(false);
  });

  it('PAN-61 fails closed for a non-admin on an unknown hostname', () => {
    expect(isConsistencyRankingVisible({ hostname: 'example.com', isDev: false, isAdmin: false })).toBe(false);
  });

  it('PAN-61 shows the ranking to an admin on an empty hostname', () => {
    expect(isConsistencyRankingVisible({ hostname: '', isDev: false, isAdmin: true })).toBe(true);
  });

  it('PAN-61 treats a non-boolean truthy isAdmin as non-admin on production', () => {
    expect(isConsistencyRankingVisible({ hostname: 'app.teufit.com.br', isDev: false, isAdmin: 'yes' })).toBe(false);
  });
});
