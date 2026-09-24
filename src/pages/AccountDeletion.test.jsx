import { screen, renderWithRouter } from '../test/test-utils';
import AccountDeletion from './AccountDeletion';

describe('AccountDeletion', () => {
  it('renders the page heading', () => {
    renderWithRouter(<AccountDeletion />);

    expect(
      screen.getByRole('heading', { name: /exclusão de conta na teufit/i })
    ).toBeInTheDocument();
  });

  it('renders the brand lockup image with an accessible name', () => {
    renderWithRouter(<AccountDeletion />);

    expect(screen.getAllByRole('img', { name: /teufit/i }).length).toBeGreaterThan(0);
  });

  it('renders a back-to-login link in the header', () => {
    renderWithRouter(<AccountDeletion />);

    expect(
      screen.getByRole('link', { name: /entrar na plataforma/i })
    ).toHaveAttribute('href', '/login');
  });

  it('renders the footer link back to login', () => {
    renderWithRouter(<AccountDeletion />);

    expect(
      screen.getByRole('link', { name: /voltar para o login/i })
    ).toHaveAttribute('href', '/login');
  });

  it('identifies the app name and package identifier so Google can cross-check the store listing', () => {
    const { container } = renderWithRouter(<AccountDeletion />);

    expect(container.textContent).toMatch(/TeuFit/);
    expect(container.textContent).toMatch(/br\.com\.teufit\.app/);
  });

  it('describes the in-app deletion path', () => {
    const { container } = renderWithRouter(<AccountDeletion />);

    expect(container.textContent).toMatch(/Perfil → Segurança → Excluir conta/);
    expect(container.textContent).toMatch(/processada imediatamente após a confirmação/i);
  });

  it('provides a prominent e-mail path with a prefilled mailto link, for users without the app installed', () => {
    renderWithRouter(<AccountDeletion />);

    const emailLink = screen.getByRole('link', { name: /contato@teufit\.com\.br/i });
    expect(emailLink).toHaveAttribute(
      'href',
      'mailto:contato@teufit.com.br?subject=Exclus%C3%A3o%20de%20conta'
    );
    expect(
      screen.getByRole('heading', { name: /^por e-mail$/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/15 dias úteis/i)).toBeInTheDocument();
  });

  it('lists every category of data that is deleted', () => {
    const { container } = renderWithRouter(<AccountDeletion />);

    expect(container.textContent).toMatch(/nome, e-mail, data de nascimento, gênero, endereço/i);
    expect(container.textContent).toMatch(/anamnese e saúde/i);
    expect(container.textContent).toMatch(/fotos de progresso/i);
    expect(container.textContent).toMatch(/histórico de treinos e registros de execução/i);
  });

  it('discloses the 90-day erasure window and the two legally-required retention exceptions', () => {
    const { container } = renderWithRouter(<AccountDeletion />);

    expect(container.textContent).toMatch(/90 dias/);
    expect(container.textContent).toMatch(/Logs de acesso:\s*retidos por\s*6 meses/i);
    expect(container.textContent).toMatch(/Marco Civil da Internet \(Lei 12\.965\/2014,\s*art\. 15\)/);
    expect(container.textContent).toMatch(/Registros de assinatura e cobrança/i);
    expect(container.textContent).toMatch(/de forma desvinculada dos demais dados pessoais/i);
    expect(container.textContent).toMatch(/art\. 7\.º, inciso II, da LGPD/);
  });

  it('states that deletion is irreversible and requires a new account to resume use', () => {
    renderWithRouter(<AccountDeletion />);

    expect(screen.getByText(/irreversível/i)).toBeInTheDocument();
    expect(screen.getByText(/será necessário criar uma nova conta/i)).toBeInTheDocument();
  });

  it('links to the privacy policy for full detail', () => {
    renderWithRouter(<AccountDeletion />);

    const links = screen.getAllByRole('link', { name: /política de privacidade/i });
    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => {
      expect(link).toHaveAttribute('href', '/privacy-policy');
    });
  });
});
