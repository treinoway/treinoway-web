import { describe, it, expect, vi, beforeEach } from 'vitest';
import { translateError } from './index';

// Hoisted so the vi.mock factories below can reference these fakes.
const platform = vi.hoisted(() => ({ isNative: vi.fn(), getPlatform: vi.fn() }));

vi.mock('../platform', () => platform);

const UPGRADE_TEXT = /upgrade|assine|assinatura|pre[çc]o|checkout|pagar|R\$/i;

const PLAN_MESSAGE_CODES = [
  'platformPlan.aiNotAvailable',
  'platformPlan.studentBlockedOnPlan',
  'platformPlan.studentCapExceeded',
];

// Builds an Axios-like 403 error carrying a messageCode and an upgrade message from the server.
const buildPlanError = (messageCode) => ({
  response: {
    status: 403,
    data: { messageCode, message: 'Faça upgrade para o plano Pro por R$ 99,90 no checkout.' },
  },
});

describe('translateError for plan messageCodes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('in the native app', () => {
    beforeEach(() => {
      platform.isNative.mockReturnValue(true);
    });

    it.each(PLAN_MESSAGE_CODES)('%s resolves to neutral text without upgrade, price or checkout', (messageCode) => {
      const message = translateError(buildPlanError(messageCode));

      expect(message).toMatch(/\S/);
      expect(message).not.toMatch(UPGRADE_TEXT);
    });
  });

  describe('on the website', () => {
    beforeEach(() => {
      platform.isNative.mockReturnValue(false);
    });

    it('keeps the current upgrade text for the student cap', () => {
      expect(translateError(buildPlanError('platformPlan.studentCapExceeded'))).toBe(
        'Você atingiu o limite de alunos do seu plano. Faça upgrade para adicionar mais alunos.',
      );
    });

    it('keeps the current upgrade text for a blocked student', () => {
      expect(translateError(buildPlanError('platformPlan.studentBlockedOnPlan'))).toBe(
        'Este aluno está bloqueado pelo seu plano atual. Faça upgrade para continuar.',
      );
    });

    it('keeps the current upgrade text for iArnold not included', () => {
      expect(translateError(buildPlanError('platformPlan.aiNotAvailable'))).toBe(
        'O seu plano não inclui o iArnold. Faça upgrade para usar o assistente.',
      );
    });
  });
});
