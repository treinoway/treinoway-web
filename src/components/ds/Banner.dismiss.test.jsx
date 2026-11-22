import userEvent from '@testing-library/user-event';
import { render, screen, within } from '../../test/test-utils';
import Banner from './Banner';

describe('Banner onDismiss', () => {
  it('renders a "Fechar aviso" icon button inside the banner when onDismiss is given', () => {
    render(<Banner tone="warning" onDismiss={vi.fn()}>Confirme seu e-mail</Banner>);

    const banner = screen.getByRole('note');
    expect(banner).toHaveClass('ds-banner', 'ds-banner--warning');
    expect(within(banner).getByRole('button', { name: 'Fechar aviso' })).toHaveAttribute('type', 'button');
  });

  it('calls onDismiss once when the button is clicked', async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    render(<Banner onDismiss={onDismiss}>Aviso</Banner>);

    await user.click(screen.getByRole('button', { name: 'Fechar aviso' }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('keeps the action next to the dismiss button', () => {
    render(
      <Banner tone="warning" onDismiss={vi.fn()} action={<button type="button">Inserir código</button>}>
        Aviso
      </Banner>
    );

    const banner = screen.getByRole('note');
    expect(within(banner).getByRole('button', { name: 'Inserir código' })).toBeInTheDocument();
    expect(within(banner).getByRole('button', { name: 'Fechar aviso' })).toBeInTheDocument();
  });

  it('renders no dismiss button without onDismiss', () => {
    render(<Banner tone="warning">Aviso</Banner>);

    expect(screen.getByRole('note')).toHaveTextContent('Aviso');
    expect(screen.queryByRole('button', { name: 'Fechar aviso' })).not.toBeInTheDocument();
  });
});
