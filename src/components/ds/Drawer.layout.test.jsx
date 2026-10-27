import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import Drawer from './Drawer';

// why: contract: the layout is exposed as data-layout on the dialog ("modal" | "side"); omitted prop means "side".
const renderModal = (props = {}) =>
  render(
    <Drawer
      title="Novo treino"
      layout="modal"
      onClose={vi.fn()}
      footer={<button type="button">Salvar</button>}
      {...props}
    >
      <input aria-label="Campo" />
    </Drawer>
  );

describe('Drawer — layout prop (criterion 14)', () => {
  it('exposes data-layout="modal" on the dialog when layout="modal"', () => {
    renderModal();
    expect(screen.getByRole('dialog', { name: 'Novo treino' })).toHaveAttribute('data-layout', 'modal');
  });

  it('exposes data-layout="side" on the dialog when layout="side"', () => {
    renderModal({ layout: 'side' });
    expect(screen.getByRole('dialog', { name: 'Novo treino' })).toHaveAttribute('data-layout', 'side');
  });

  it('defaults to the side layout when the prop is omitted', () => {
    render(<Drawer title="Título" onClose={vi.fn()}>x</Drawer>);
    expect(screen.getByRole('dialog', { name: 'Título' })).toHaveAttribute('data-layout', 'side');
  });

  it('keeps a modal dialog named by the title with a region body and footer outside it', () => {
    renderModal();
    const dialog = screen.getByRole('dialog', { name: 'Novo treino' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const body = screen.getByRole('region', { name: 'Novo treino' });
    expect(within(body).getByLabelText('Campo')).toBeInTheDocument();
    expect(within(body).queryByRole('button', { name: 'Salvar' })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
  });

  it('closes from "Fechar" in the modal layout', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal({ onClose });
    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape in the modal layout', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal({ onClose });
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on a scrim click but not on a dialog click in the modal layout', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal({ onClose });
    await user.click(screen.getByLabelText('Campo'));
    expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByRole('dialog').parentElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores Fechar, Escape and the scrim while busy in the modal layout', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal({ onClose, busy: true });
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeDisabled();
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('dialog').parentElement);
    expect(onClose).not.toHaveBeenCalled();
  });
});
