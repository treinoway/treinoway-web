import { describe, it, expect, vi } from 'vitest';
import { translateError } from './index';

// Hoisted so the vi.mock factories below can reference these fakes.
const platform = vi.hoisted(() => ({ isNative: vi.fn() }));
vi.mock('../platform', () => platform);

const UPGRADE_TEXT = /upgrade|assine|assinatura|pre[çc]o|checkout|pagar|R\$/i;

// Builds an Axios-like 403 carrying a plan messageCode and an upgrade pitch from the server.
const planError = (messageCode, error = 'ANY_PLAN_ERROR') => ({
  response: { status: 403, data: { error, messageCode, message: 'Faça upgrade e assine o plano por R$ 49.' } },
});

describe('translateError for plan codes in the native app', () => {
  it('neutralizes every platformPlan.* code, including ones the app does not know yet', () => {
    platform.isNative.mockReturnValue(true);

    ['platformPlan.aiActionsExceeded', 'platformPlan.somethingNew', 'platformPlan.tierLocked'].forEach((code) => {
      const message = translateError(planError(code));
      expect(message).toMatch(/\S/);
      expect(message).not.toMatch(UPGRADE_TEXT);
    });
  });

  it('wins over a specific error code translation and over the server message', () => {
    platform.isNative.mockReturnValue(true);

    const message = translateError(planError('platformPlan.studentCapExceeded', 'STUDENT_CAP_EXCEEDED'));

    expect(message).not.toMatch(UPGRADE_TEXT);
  });

  it('leaves non-plan errors alone', () => {
    platform.isNative.mockReturnValue(true);

    expect(translateError({ response: { status: 401, data: { error: 'INVALID_CREDENTIALS' } } })).toBe('E-mail ou senha incorretos.');
  });
});
