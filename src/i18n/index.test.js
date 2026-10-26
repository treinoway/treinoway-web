import { describe, it, expect, beforeEach } from 'vitest';
import { translateError, extractErrorInfo, setLocale, tf, tCount } from './index';

// Helper to build a fake Axios error with a response body
function makeAxiosError({ status, data, code, message } = {}) {
  const error = new Error(message || 'Request failed');
  error.code = code;
  if (data !== undefined) {
    error.response = { status, data };
  }
  return error;
}

describe('translateError', () => {
  beforeEach(() => {
    // Reset to default locale before each test
    setLocale('pt-BR');
  });

  it('returns timeout message for ECONNABORTED errors', () => {
    const error = makeAxiosError({ code: 'ECONNABORTED' });
    const result = translateError(error);
    expect(result).toContain('esgotado');
  });

  it('returns offline message for network errors without response', () => {
    const error = makeAxiosError({});
    const result = translateError(error);
    expect(result).toContain('internet');
  });

  it('translates by specific error code (INVALID_CREDENTIALS)', () => {
    const error = makeAxiosError({
      status: 401,
      data: { error: 'INVALID_CREDENTIALS', messageCode: 'auth.unauthorized', message: 'Invalid credentials' },
    });
    const result = translateError(error);
    expect(result).toBe('E-mail ou senha incorretos.');
  });

  it('translates by messageCode when error code is not in local locale', () => {
    const error = makeAxiosError({
      status: 403,
      data: { error: 'SOME_UNKNOWN_CODE', messageCode: 'auth.forbidden', message: 'You are forbidden' },
    });
    const result = translateError(error);
    expect(result).toBe('Você não tem permissão para esta ação.');
  });

  it('translates by HTTP status when no error/messageCode match exists', () => {
    const error = makeAxiosError({
      status: 500,
      data: { error: 'UNKNOWN', messageCode: 'unknown.code', message: '' },
    });
    const result = translateError(error);
    expect(result).toBe('Erro interno do servidor. Tente novamente mais tarde.');
  });

  it('uses backend data.message as fallback when no local translation exists', () => {
    // Simulate a new backend error code not yet in the web locale
    const error = makeAxiosError({
      status: 418,
      data: {
        error: 'BRAND_NEW_ERROR_NOT_IN_LOCALE',
        messageCode: 'brand.new.messageCode',
        message: 'Esta é uma mensagem do backend.',
      },
    });
    const result = translateError(error);
    expect(result).toBe('Esta é uma mensagem do backend.');
  });

  it('uses generic fallback when no translation, no backend message', () => {
    const error = makeAxiosError({
      status: 418,
      data: { error: 'UNKNOWN', messageCode: 'unknown.code' },
    });
    const result = translateError(error);
    expect(result).toContain('inesperado');
  });

  it('uses provided fallback argument when all else fails', () => {
    const error = makeAxiosError({
      status: 418,
      data: { error: 'UNKNOWN', messageCode: 'unknown.code' },
    });
    const result = translateError(error, 'Minha mensagem de fallback');
    expect(result).toBe('Minha mensagem de fallback');
  });

  it('translates validation errors using detail messages', () => {
    const error = makeAxiosError({
      status: 400,
      data: {
        error: 'VALIDATION_ERROR',
        messageCode: 'validation.failed',
        details: [
          { field: 'email', validations: ['required'], messageCode: 'validation.email.required' },
        ],
      },
    });
    const result = translateError(error);
    // Should use the per-field messageCode translation from validationRules or validation
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('translates messageCodes added in PR1 (request.rateLimitExceeded)', () => {
    const error = makeAxiosError({
      status: 429,
      data: { error: 'TOO_MANY_REQUESTS', messageCode: 'request.rateLimitExceeded', message: 'Too many requests' },
    });
    const result = translateError(error);
    expect(result).toBe('Muitas tentativas. Aguarde um momento e tente novamente.');
  });

  it('translates trainerInvite.accountExists from the invite signup (409)', () => {
    const error = makeAxiosError({
      status: 409,
      data: { error: 'INVITE_ACCOUNT_EXISTS', messageCode: 'trainerInvite.accountExists', message: 'Account exists' },
    });
    expect(translateError(error)).toBe('Já existe uma conta com este e-mail. Entre para ativar seu convite.');
  });

  it('translates messageCodes added in PR1 (internal.serverError)', () => {
    const error = makeAxiosError({
      status: 500,
      data: { error: 'INTERNAL_SERVER_ERROR', messageCode: 'internal.serverError', message: 'Internal server error' },
    });
    const result = translateError(error);
    expect(result).toBe('Erro interno do servidor. Tente novamente mais tarde.');
  });

  it('translates messageCodes added in PR1 (database.uniqueConstraint)', () => {
    const error = makeAxiosError({
      status: 409,
      data: { error: 'CONFLICT', messageCode: 'database.uniqueConstraint', message: 'Unique constraint violated' },
    });
    const result = translateError(error);
    expect(result).toBe('Este registro já existe.');
  });

  it.each([
    [429, 'STUDENT_INVITE_DAILY_LIMIT', 'studentInvite.dailyLimit',
      'Você atingiu o limite diário de convites. Tente novamente mais tarde.'],
    [502, 'STUDENT_INVITE_EMAIL_SEND_FAILED', 'studentInvite.emailSendFailed',
      'Não foi possível enviar o e-mail do convite. Tente novamente.'],
    [429, 'EMAIL_VERIFICATION_DAILY_LIMIT', 'emailVerification.dailyLimit',
      'Você solicitou códigos demais hoje. Tente novamente mais tarde.'],
    [502, 'EMAIL_VERIFICATION_SEND_FAILED', 'emailVerification.sendFailed',
      'Não foi possível enviar o e-mail de verificação. Tente novamente.'],
    [400, 'PASSWORD_RESET_INVALID_CODE', 'passwordReset.invalidCode',
      'Código inválido ou expirado. Solicite um novo.'],
  ])('translates %i %s via messageCode %s', (status, errorCode, messageCode, expected) => {
    const error = makeAxiosError({ status, data: { error: errorCode, messageCode, message: 'x' } });
    expect(translateError(error)).toBe(expected);
  });
});

describe('extractErrorInfo', () => {
  it('returns nulls for network errors without response', () => {
    const error = makeAxiosError({});
    const info = extractErrorInfo(error);
    expect(info).toEqual({ messageCode: null, errorCode: null, status: null, details: null });
  });

  it('extracts structured info from response', () => {
    const error = makeAxiosError({
      status: 400,
      data: {
        error: 'VALIDATION_ERROR',
        messageCode: 'validation.failed',
        details: [{ field: 'email' }],
      },
    });
    const info = extractErrorInfo(error);
    expect(info.errorCode).toBe('VALIDATION_ERROR');
    expect(info.messageCode).toBe('validation.failed');
    expect(info.status).toBe(400);
    expect(info.details).toEqual([{ field: 'email' }]);
  });

  it('returns null details when not present in response', () => {
    const error = makeAxiosError({
      status: 404,
      data: { error: 'NOT_FOUND', messageCode: 'resource.notFound', message: 'Not found' },
    });
    const info = extractErrorInfo(error);
    expect(info.details).toBeNull();
  });
});

describe('translateError - platform plan', () => {
  it('returns the Beta-specific text for PLATFORM_PLAN_BETA_WITH_PAID_SUBSCRIPTION', () => {
    const error = { response: { status: 409, data: { error: 'PLATFORM_PLAN_BETA_WITH_PAID_SUBSCRIPTION', messageCode: 'resource.conflict' } } };
    expect(translateError(error)).toBe(
      'Este treinador tem assinatura paga ativa no Asaas. O plano Beta só pode ser aplicado depois que ela for encerrada.',
    );
  });
});

describe('tf', () => {
  it('interpolates named placeholders', () => {
    expect(tf('studentDetail.routines.openAria', { name: 'Protocolo 03' })).toBe('Abrir rotina Protocolo 03');
  });

  it('keeps placeholders without a value', () => {
    expect(tf('studentDetail.metrics.workoutsCount', { completed: 3 })).toBe('3/{expected} treinos');
  });

  it('returns undefined for a missing key', () => {
    expect(tf('studentDetail.missing.key')).toBeUndefined();
  });
});

describe('tCount', () => {
  it('pluralizes with one/other', () => {
    expect(tCount('finance.count.payment', 1)).toBe('1 pagamento');
    expect(tCount('finance.count.payment', 0)).toBe('0 pagamentos');
    expect(tCount('finance.count.payment', 12)).toBe('12 pagamentos');
  });
});
