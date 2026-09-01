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

  it('does not present the platform as a beta or invite-gated product', () => {
    const { container } = renderWithRouter(<Terms />);

    expect(container.textContent).not.toMatch(/beta/i);
    expect(container.textContent).not.toMatch(/convite/i);
  });

  it('renders the availability section without beta framing', () => {
    renderWithRouter(<Terms />);

    expect(
      screen.getByRole('heading', { name: /14\. disponibilidade e alterações do serviço/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/não é garantida de forma contínua, ininterrupta ou livre de erros/i)
    ).toBeInTheDocument();
  });

  it('states the 18+ trainer / 13+ student age split without promising parental consent', () => {
    const { container } = renderWithRouter(<Terms />);

    expect(screen.getByText(/Para criar uma conta na condição de/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Não é permitido o cadastro de crianças menores de 13 anos/i)
    ).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/consentimento específico e em destaque/i);
  });

  it('describes registration as open', () => {
    renderWithRouter(<Terms />);

    expect(screen.getByText(/O cadastro na Plataforma é/i)).toBeInTheDocument();
    expect(screen.getByText(/aberto/i)).toBeInTheDocument();
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
