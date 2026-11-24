import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import ConfirmDialog from './ConfirmDialog';

const MESSAGE = 'Criar modelo de feedback';

// Renders the dialog with spies for both callbacks and returns them
const renderDialog = (props = {}) => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const view = render(<ConfirmDialog message={MESSAGE} confirmLabel="Criar" confirmTone="primary" onConfirm={onConfirm} onCancel={onCancel} {...props} />);
  return { ...view, onConfirm, onCancel };
};

describe('ConfirmDialog confirmDisabled', () => {
  it('leaves the confirm button enabled by default', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog();

    expect(screen.getByRole('button', { name: 'Criar' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Criar' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('disables only the confirm button, which keeps its label and tone', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog({ confirmDisabled: true });

    const confirm = screen.getByRole('button', { name: 'Criar' });
    expect(confirm).toBeDisabled();
    expect(confirm).toHaveClass('btn--primary');
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeEnabled();
    expect(screen.getByRole('alertdialog')).not.toHaveAttribute('aria-busy');
    await user.click(confirm);

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('still cancels through the button and Escape while confirm is disabled', async () => {
    const user = userEvent.setup();
    const { onConfirm, onCancel } = renderDialog({ confirmDisabled: true });

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('enables the confirm button once the prop is lifted', async () => {
    const user = userEvent.setup();
    const { rerender, onConfirm, onCancel } = renderDialog({ confirmDisabled: true });

    rerender(<ConfirmDialog message={MESSAGE} confirmLabel="Criar" confirmTone="primary" confirmDisabled={false} onConfirm={onConfirm} onCancel={onCancel} />);
    await user.click(screen.getByRole('button', { name: 'Criar' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('keeps both buttons disabled while busy, whatever confirmDisabled says', () => {
    renderDialog({ busy: true, busyLabel: 'Criando...', confirmDisabled: false });

    expect(screen.getByRole('button', { name: 'Criando...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  });

  it('works for the danger tone too', () => {
    renderDialog({ confirmTone: 'danger', confirmLabel: 'Excluir', confirmDisabled: true });

    expect(screen.getByRole('button', { name: 'Excluir' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Excluir' })).toHaveClass('btn--danger');
  });
});
