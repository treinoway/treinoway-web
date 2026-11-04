import { act, renderHook } from '../test/test-utils';
import usePlanAutosave from './usePlanAutosave';

describe('usePlanAutosave — server reason on failure (fix round)', () => {
  it('shows error.userMessage in the status text when save rejects', async () => {
    const save = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { userMessage: 'Quantidade inválida para este alimento.' }));
    const { result, rerender } = renderHook(({ value }) => usePlanAutosave({ value, save }), { initialProps: { value: { quantity: 1 } } });

    rerender({ value: { quantity: 2 } });
    let saved;
    await act(async () => { saved = await result.current.flush(); });

    expect(saved).toBe(false);
    expect(result.current.status).toBe('error');
    expect(result.current.statusText).toContain('Quantidade inválida para este alimento.');
  });

  it('falls back to the translated error when there is no userMessage', async () => {
    const error = Object.assign(new Error('x'), { response: { status: 422, data: { messageCode: 'nutrition.meal.maxOptions' } } });
    const save = vi.fn().mockRejectedValue(error);
    const { result, rerender } = renderHook(({ value }) => usePlanAutosave({ value, save }), { initialProps: { value: { quantity: 1 } } });

    rerender({ value: { quantity: 2 } });
    await act(async () => { await result.current.flush(); });

    expect(result.current.statusText).toContain('Máximo de 3 opções por refeição.');
  });
});
