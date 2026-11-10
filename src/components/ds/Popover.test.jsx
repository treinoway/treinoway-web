import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import Popover from './Popover';

describe('Popover', () => {
  it('renders an accessible dialog named by its title, with body and footer', () => {
    render(
      <Popover title="Conte pra gente" onClose={vi.fn()} footer={<button type="button">Enviar</button>}>
        <p>Conteúdo</p>
      </Popover>
    );
    const dialog = screen.getByRole('dialog', { name: 'Conte pra gente' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Conteúdo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeInTheDocument();
  });

  it('uses the ds-popover root class and accepts an extra className', () => {
    const { container } = render(
      <Popover title="Título" onClose={vi.fn()} className="feedback-widget__popover">x</Popover>
    );
    const root = container.querySelector('.ds-popover');
    expect(root).toBeInTheDocument();
    expect(root).toHaveClass('feedback-widget__popover');
  });

  it('links aria-labelledby to the rendered title', () => {
    render(<Popover title="Título" onClose={vi.fn()}>x</Popover>);
    const dialog = screen.getByRole('dialog');
    const titleId = dialog.getAttribute('aria-labelledby');
    expect(titleId).toBeTruthy();
    expect(document.getElementById(titleId)).toHaveTextContent('Título');
  });

  it('renders the close button as an icon-button labelled "Fechar" and closes on click', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Popover title="Título" onClose={onClose}>x</Popover>);
    const close = screen.getByRole('button', { name: 'Fechar' });
    expect(close).toHaveClass('icon-button');
    await user.click(close);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('supports a custom close label', () => {
    render(<Popover title="Título" closeLabel="Fechar feedback" onClose={vi.fn()}>x</Popover>);
    expect(screen.getByRole('button', { name: 'Fechar feedback' })).toHaveClass('icon-button');
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Popover title="Título" onClose={onClose}>x</Popover>);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps Tab focus inside the popover', async () => {
    const user = userEvent.setup();
    render(
      <Popover title="Título" onClose={vi.fn()} footer={<button type="button">Último</button>}>
        <input aria-label="Campo" />
      </Popover>
    );
    screen.getByRole('button', { name: 'Último' }).focus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus();
  });

  it('restores focus to the opener on unmount', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    const { unmount } = render(<Popover title="Título" onClose={vi.fn()}>x</Popover>);
    unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });
});
