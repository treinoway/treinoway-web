import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../test/test-utils';
import WelcomeHero from './WelcomeHero';

describe('WelcomeHero', () => {
  it('renders personalized greeting with the given name', () => {
    renderWithRouter(<WelcomeHero name="João" />);
    expect(screen.getByRole('heading', { name: 'Bom dia, João' })).toBeInTheDocument();
  });

  it('renders fallback greeting when name is not provided', () => {
    renderWithRouter(<WelcomeHero />);
    expect(screen.getByRole('heading', { name: 'Bem-vindo' })).toBeInTheDocument();
  });

  it('uses the given greeting prefix together with the name', () => {
    renderWithRouter(<WelcomeHero name="João" greeting="Boa tarde" />);
    expect(screen.getByRole('heading', { name: 'Boa tarde, João' })).toBeInTheDocument();
  });

  it('still renders the fallback greeting when name is missing, regardless of the greeting prefix', () => {
    renderWithRouter(<WelcomeHero greeting="Boa noite" />);
    expect(screen.getByRole('heading', { name: 'Bem-vindo' })).toBeInTheDocument();
  });

  it('renders the date eyebrow when dateLabel is provided', () => {
    renderWithRouter(<WelcomeHero name="João" dateLabel="TERÇA, 14 DE JULHO" />);
    expect(screen.getByText('TERÇA, 14 DE JULHO')).toBeInTheDocument();
  });

  it('omits the eyebrow entirely when dateLabel is not provided', () => {
    const { container } = renderWithRouter(<WelcomeHero name="João" />);
    expect(container.querySelector('.dashboard-hero-eyebrow')).not.toBeInTheDocument();
  });

  it('renders the subtitle when provided', () => {
    renderWithRouter(<WelcomeHero name="João" subtitle="Pronto para o trabalho de hoje?" />);
    expect(screen.getByText('Pronto para o trabalho de hoje?')).toBeInTheDocument();
  });

  it('renders no CTA when cta prop is not provided', () => {
    renderWithRouter(<WelcomeHero name="João" />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders a link CTA when cta.to is provided', () => {
    renderWithRouter(<WelcomeHero name="João" cta={{ label: 'Vincular primeiro aluno', to: '/trainer/students' }} />);
    const link = screen.getByRole('link', { name: 'Vincular primeiro aluno' });
    expect(link).toHaveAttribute('href', '/trainer/students');
  });

  it('renders a button CTA and calls onClick when cta.onClick is provided', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    renderWithRouter(<WelcomeHero name="João" cta={{ label: 'Criar rotina', onClick: handleClick }} />);

    const button = screen.getByRole('button', { name: 'Criar rotina' });
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading label and disables the button CTA while loading', () => {
    renderWithRouter(<WelcomeHero name="João" cta={{ label: 'Criar rotina', onClick: vi.fn(), loading: true }} />);
    const button = screen.getByRole('button', { name: 'Carregando...' });
    expect(button).toBeDisabled();
  });
});
