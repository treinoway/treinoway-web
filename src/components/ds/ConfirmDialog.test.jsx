import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import ConfirmDialog from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('confirms and cancels through the matching buttons', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog message="Excluir X?" confirmLabel="Desvincular" onConfirm={onConfirm} onCancel={onCancel} />);

    expect(screen.getByRole('alertdialog', { name: 'Excluir X?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Desvincular' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('cancels on Escape', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ConfirmDialog message="Excluir X?" onConfirm={vi.fn()} onCancel={onCancel} />);
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('uses the default destructive label', () => {
    render(<ConfirmDialog message="Excluir X?" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeInTheDocument();
  });
});

describe('ConfirmDialog tone', () => {
  it('renders a primary confirm button when requested', () => {
    render(<ConfirmDialog message="Agrupar?" confirmLabel="Agrupar" confirmTone="primary" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Agrupar' })).toHaveClass('btn--primary');
  });
});

describe('ConfirmDialog busy', () => {
  it('disables both actions, shows the loading label and ignores Escape while busy', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ConfirmDialog message="Anular?" confirmLabel="Anular cobrança" busy onConfirm={vi.fn()} onCancel={onCancel} />);

    expect(screen.getByRole('button', { name: 'Carregando...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(onCancel).not.toHaveBeenCalled();
  });
});
