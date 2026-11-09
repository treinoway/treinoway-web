import { translateError, setLocale } from './index';

describe('nutrition.substitute.quantityTooLarge', () => {
  beforeEach(() => setLocale('pt-BR'));

  it('translates from the messageCode, not the raw server message', () => {
    const error = new Error('Request failed');
    error.response = { status: 400, data: { error: 'X', messageCode: 'nutrition.substitute.quantityTooLarge', message: 'RAW' } };

    expect(translateError(error)).toBe('Quantidade equivalente grande demais para este substituto.');
  });
});
