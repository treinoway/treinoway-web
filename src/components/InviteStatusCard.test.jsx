import { renderWithRouter, screen } from '../test/test-utils';
import InviteStatusCard from './InviteStatusCard';

describe('InviteStatusCard', () => {
  it.each([
    ['invite.expired', 'Este convite expirou'],
    ['invite.revoked', 'Este convite não é mais válido'],
    ['invite.alreadyAccepted', 'Este convite já foi utilizado'],
    ['invite.notFound', 'Convite não encontrado'],
    ['invite.somethingNew', 'Não foi possível usar este convite'],
  ])('renders the %s state', (messageCode, title) => {
    renderWithRouter(<InviteStatusCard messageCode={messageCode} />);

    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /tenho outro código/i })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'suporte@teufit.com.br' })).toHaveAttribute(
      'href',
      'mailto:suporte@teufit.com.br'
    );
  });

  it('mentions a newer invite when revoked', () => {
    renderWithRouter(<InviteStatusCard messageCode="invite.revoked" />);

    expect(screen.getByText(/substituído por um convite mais recente/i)).toBeInTheDocument();
  });

  it('offers an "Entrar" CTA only when the invite was already accepted', () => {
    const { unmount } = renderWithRouter(<InviteStatusCard messageCode="invite.alreadyAccepted" />);
    expect(screen.getByRole('link', { name: /^entrar$/i })).toHaveAttribute('href', '/login');
    unmount();

    renderWithRouter(<InviteStatusCard messageCode="invite.expired" />);
    expect(screen.queryByRole('link', { name: /^entrar$/i })).not.toBeInTheDocument();
  });
});
