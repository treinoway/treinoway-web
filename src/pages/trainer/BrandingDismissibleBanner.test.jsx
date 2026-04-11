import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithRouter } from '../../test/test-utils';
import BrandingDismissibleBanner from './BrandingDismissibleBanner';

describe('BrandingDismissibleBanner', () => {
  it('renders the banner title and description', () => {
    renderWithRouter(
      <BrandingDismissibleBanner onHowItWorks={vi.fn()} onDismiss={vi.fn()} />
    );
    expect(screen.getByText('Personalize o app dos seus alunos')).toBeInTheDocument();
    expect(
      screen.getByText('Adicione sua logo, cores e mensagem de boas-vindas.')
    ).toBeInTheDocument();
  });

  it('calls onHowItWorks when "Como funciona" is clicked', async () => {
    const user = userEvent.setup();
    const onHowItWorks = vi.fn();
    renderWithRouter(
      <BrandingDismissibleBanner onHowItWorks={onHowItWorks} onDismiss={vi.fn()} />
    );
    await user.click(screen.getByRole('button', { name: /como funciona/i }));
    expect(onHowItWorks).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when close button is clicked', async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    renderWithRouter(
      <BrandingDismissibleBanner onHowItWorks={vi.fn()} onDismiss={onDismiss} />
    );
    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
