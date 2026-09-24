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

  it('renders the footer link to the terms of use', () => {
    renderWithRouter(<PrivacyPolicy />);

    expect(
      screen.getByRole('link', { name: /termos e condições/i })
    ).toHaveAttribute('href', '/terms');
  });

  it('renders the LGPD contact email in both section 9 (data-subject request) and section 13 (DPO), each with a working mailto href', () => {
    renderWithRouter(<PrivacyPolicy />);

    const links = screen.getAllByRole('link', { name: /contato@teufit\.com\.br/i });
    expect(links.length).toBe(2);
    links.forEach((link) => {
      expect(link).toHaveAttribute('href', 'mailto:contato@teufit.com.br');
    });
  });

  it('lists every profile field the app collects in section 2.1', () => {
    const { container } = renderWithRouter(<PrivacyPolicy />);

    expect(screen.getByText(/^Gênero;$/)).toBeInTheDocument();
    expect(screen.getByText(/Endereço completo \(logradouro/i)).toBeInTheDocument();
    expect(screen.getByText(/Foto de avatar do perfil/i)).toBeInTheDocument();
    expect(container.textContent).toMatch(
      /Instagram, WhatsApp, X,\s*Facebook, Threads, LinkedIn e YouTube/
    );
    expect(container.textContent).toMatch(/número de telefone/i);
  });

  it('discloses Firebase Analytics and Crashlytics under legitimate interest', () => {
    const { container } = renderWithRouter(<PrivacyPolicy />);

    expect(
      screen.getByRole('heading', { name: /11\. cookies, analytics e tecnologias de rastreamento/i })
    ).toBeInTheDocument();
    expect(container.textContent).toMatch(/Firebase Analytics/);
    expect(container.textContent).toMatch(/Firebase Crashlytics/);
    expect(container.textContent).toMatch(/identificador interno de usuário/i);
    expect(container.textContent).toMatch(/base legal desses tratamentos é o\s*legítimo interesse/i);
    expect(container.textContent).not.toMatch(/sujeito ao consentimento do usuário/i);
  });

  it('discloses that subscription and billing records survive account deletion', () => {
    renderWithRouter(<PrivacyPolicy />);

    expect(
      screen.getByText(/registros de assinatura e de cobrança/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/de forma desvinculada dos demais dados pessoais/i)
    ).toBeInTheDocument();
  });

  it('sets the minimum age at 18 for trainers and 13 for students, with no parental-consent promise', () => {
    const { container } = renderWithRouter(<PrivacyPolicy />);

    expect(
      screen.getByText(/O cadastro na plataforma TeuFit exige idade mínima de/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Não é permitido o cadastro de crianças menores de 13 anos\./i)
    ).toBeInTheDocument();
    expect(container.textContent).toMatch(/art\. 14,\s*caput\s*, da LGPD/);
    expect(container.textContent).not.toMatch(/beta/i);
    expect(container.textContent).not.toMatch(/convite/i);
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
