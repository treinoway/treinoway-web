import { describe, it, expect } from 'vitest';
import { classifyAssignError, classifyPaymentError } from './financeErrors';
import { apiError } from '../test/financeFixtures';

describe('financeErrors', () => {
  it('maps payment errors per spec §6.3', () => {
    expect(classifyPaymentError(apiError(400, 'SUBSCRIPTION_INVALID_PAID_AT', 'x', 'Data inválida'))).toMatchObject({ field: 'paidAt', message: 'Data inválida' });
    expect(classifyPaymentError(apiError(409, 'SUBSCRIPTION_PAYMENT_CONFLICT', 'x'))).toMatchObject({ toastType: 'info', refetch: true });
    expect(classifyPaymentError(apiError(409, 'SUBSCRIPTION_PAYMENT_ALREADY_PAID', 'x'))).toMatchObject({ toastType: 'error', refetch: true, closeSheet: true });
    expect(classifyPaymentError(apiError(500, 'X', 'x', 'Erro'))).toMatchObject({ toastType: 'error', refetch: false, message: 'Erro' });
  });

  it('maps assign errors inline', () => {
    expect(classifyAssignError(apiError(400, 'SUBSCRIPTION_INVALID_AMOUNT', 'subscription.invalidAmount', 'Valor inválido'))).toMatchObject({ field: 'discount' });
    expect(classifyAssignError(apiError(400, 'SUBSCRIPTION_STUDENT_NOT_LINKED', 'student.notLinked')).message)
      .toBe('Este aluno não está mais vinculado a você.');
  });
});
