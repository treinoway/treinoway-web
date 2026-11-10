import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import Callout from './Callout';

describe('Callout', () => {
  it('renders a non-modal status region with the ds-callout class, title and body', () => {
    const { container } = render(
      <Callout title="Você faz parte do beta!" onClose={vi.fn()}>
        <p>Conte o que achou.</p>
      </Callout>
    );
    const root = container.querySelector('.ds-callout');
    expect(root).toBeInTheDocument();
    expect(screen.getByRole('status')).toBe(root);
    expect(screen.getByText('Você faz parte do beta!')).toBeInTheDocument();
    expect(screen.getByText('Conte o que achou.')).toBeInTheDocument();
  });

  it('is not a dialog and does not steal focus', () => {
    render(<Callout title="Título" onClose={vi.fn()}>x</Callout>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).not.toContainElement(document.activeElement);
    expect(document.body).toHaveFocus();
  });

  it('renders the close button as an icon-button labelled "Fechar" and calls onClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Callout title="Título" onClose={onClose}>x</Callout>);
    const close = screen.getByRole('button', { name: 'Fechar' });
    expect(close).toHaveClass('icon-button');
    await user.click(close);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('supports a custom close label', () => {
    render(<Callout title="Título" closeLabel="Dispensar" onClose={vi.fn()}>x</Callout>);
    expect(screen.getByRole('button', { name: 'Dispensar' })).toHaveClass('icon-button');
  });

  it('accepts an extra className alongside ds-callout', () => {
    const { container } = render(
      <Callout title="Título" onClose={vi.fn()} className="feedback-widget__callout">x</Callout>
    );
    expect(container.querySelector('.ds-callout')).toHaveClass('feedback-widget__callout');
  });
});
