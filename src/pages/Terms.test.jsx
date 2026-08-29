import { screen, renderWithRouter } from '../test/test-utils';
import Terms from './Terms';

describe('Terms', () => {
  it('renders the page heading', () => {
    renderWithRouter(<Terms />);

    expect(
      screen.getByRole('heading', { name: /termos e condições de uso da teufit/i })
    ).toBeInTheDocument();
  });

  it('renders the brand lockup image with an accessible name', () => {
    renderWithRouter(<Terms />);

    expect(screen.getAllByRole('img', { name: /teufit/i }).length).toBeGreaterThan(0);
  });

  it('renders the three risk-bearing clauses by their section headings', () => {
    renderWithRouter(<Terms />);

    expect(
      screen.getByRole('heading', { name: /4\. o que a teufit é e o que não é/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /7\. saúde, risco físico e isenção de responsabilidade/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /8\. recursos de inteligência artificial/i })
    ).toBeInTheDocument();
  });

  it('renders the full legal entity with formatted CNPJ', () => {
    renderWithRouter(<Terms />);

    expect(
      screen.getAllByText(/adeildo pereira dos santos neto ltda/i).length
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/62\.464\.274\/0001-99/).length).toBeGreaterThan(0);
  });

  it('renders the contact email with a working mailto href', () => {
    renderWithRouter(<Terms />);

    expect(
      screen.getByRole('link', { name: /contato@teufit\.com\.br/i })
    ).toHaveAttribute('href', 'mailto:contato@teufit.com.br');
  });

  it('renders links to the privacy policy', () => {
    renderWithRouter(<Terms />);

    const links = screen.getAllByRole('link', { name: /política de privacidade/i });
    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => {
      expect(link).toHaveAttribute('href', '/privacy-policy');
    });
  });

  it('renders a back-to-login link in the header', () => {
    renderWithRouter(<Terms />);

    expect(
      screen.getByRole('link', { name: /entrar na plataforma/i })
    ).toHaveAttribute('href', '/login');
  });

  it('renders the footer link back to login', () => {
    renderWithRouter(<Terms />);

    expect(
      screen.getByRole('link', { name: /voltar para o login/i })
    ).toHaveAttribute('href', '/login');
  });
});
