import { screen, renderWithRouter } from '../test/test-utils';
import PrivacyPolicy from './PrivacyPolicy';

describe('PrivacyPolicy', () => {
  it('renders the page heading', () => {
    renderWithRouter(<PrivacyPolicy />);

    expect(
      screen.getByRole('heading', { name: /privacidade e proteção de dados/i })
    ).toBeInTheDocument();
  });

  it('renders the brand lockup image with an accessible name', () => {
    renderWithRouter(<PrivacyPolicy />);

    expect(screen.getAllByRole('img', { name: /teufit/i }).length).toBeGreaterThan(0);
  });

  it('renders a back-to-login link in the header', () => {
    renderWithRouter(<PrivacyPolicy />);

    expect(
      screen.getByRole('link', { name: /entrar na plataforma/i })
    ).toHaveAttribute('href', '/login');
  });

  it('renders the footer link back to login', () => {
    renderWithRouter(<PrivacyPolicy />);

    expect(
      screen.getByRole('link', { name: /voltar para o login/i })
    ).toHaveAttribute('href', '/login');
  });

  it('renders the LGPD contact email in both section 9 (data-subject request) and section 13 (DPO), each with a working mailto href', () => {
    renderWithRouter(<PrivacyPolicy />);

    const links = screen.getAllByRole('link', { name: /contato@teufit\.com\.br/i });
    expect(links.length).toBe(2);
    links.forEach((link) => {
      expect(link).toHaveAttribute('href', 'mailto:contato@teufit.com.br');
    });
  });

  it('renders the LGPD sections', () => {
    renderWithRouter(<PrivacyPolicy />);

    expect(
      screen.getByRole('heading', { name: /1\. introdução — quem somos/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /13\. contato e encarregado/i })
    ).toBeInTheDocument();
  });
});
