import { renderWithRouter, screen } from '../test/test-utils';
import AuthLegalFooter from './AuthLegalFooter';

describe('AuthLegalFooter', () => {
  it('links to the terms and the privacy policy', () => {
    renderWithRouter(<AuthLegalFooter />);

    expect(screen.getByRole('link', { name: 'Termos e Condições' })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacy-policy');
  });
});
