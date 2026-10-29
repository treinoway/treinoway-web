import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import RowMenu from './RowMenu';

describe('RowMenu', () => {
  let onEdit;
  let onDelete;

  beforeEach(() => {
    onEdit = vi.fn();
    onDelete = vi.fn();
  });

  it('renders the trigger button with correct aria-label', () => {
    render(<RowMenu ariaLabel="Ações do item" onDelete={onDelete} />);
    expect(screen.getByRole('button', { name: 'Ações do item' })).toBeInTheDocument();
  });

  it('does not show dropdown initially', () => {
    render(<RowMenu ariaLabel="Ações" onDelete={onDelete} onEdit={onEdit} />);
    expect(screen.queryByText('Editar')).not.toBeInTheDocument();
    expect(screen.queryByText('Excluir')).not.toBeInTheDocument();
  });

  it('shows dropdown when trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<RowMenu ariaLabel="Ações" onDelete={onDelete} onEdit={onEdit} />);

    await user.click(screen.getByRole('button', { name: 'Ações' }));

    expect(screen.getByText('Editar')).toBeInTheDocument();
    expect(screen.getByText('Excluir')).toBeInTheDocument();
  });

  it('calls onEdit and closes dropdown when Editar is clicked', async () => {
    const user = userEvent.setup();
    render(<RowMenu ariaLabel="Ações" onDelete={onDelete} onEdit={onEdit} />);

    await user.click(screen.getByRole('button', { name: 'Ações' }));
    await user.click(screen.getByText('Editar'));

    expect(onEdit).toHaveBeenCalledOnce();
    expect(screen.queryByText('Editar')).not.toBeInTheDocument();
  });

  it('calls onDelete and closes dropdown when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<RowMenu ariaLabel="Ações" onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: 'Ações' }));
    await user.click(screen.getByText('Excluir'));

    expect(onDelete).toHaveBeenCalledOnce();
    expect(screen.queryByText('Excluir')).not.toBeInTheDocument();
  });

  it('uses custom deleteLabel', async () => {
    const user = userEvent.setup();
    render(<RowMenu ariaLabel="Ações" onDelete={onDelete} deleteLabel="Desvincular" />);

    await user.click(screen.getByRole('button', { name: 'Ações' }));

    expect(screen.getByText('Desvincular')).toBeInTheDocument();
    expect(screen.queryByText('Excluir')).not.toBeInTheDocument();
  });

  it('does not render Editar when onEdit is not provided', async () => {
    const user = userEvent.setup();
    render(<RowMenu ariaLabel="Ações" onDelete={onDelete} />);

    await user.click(screen.getByRole('button', { name: 'Ações' }));

    expect(screen.queryByText('Editar')).not.toBeInTheDocument();
    expect(screen.getByText('Excluir')).toBeInTheDocument();
  });

  it('renders extra items between edit and delete', async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();
    const extraItems = [{ label: 'Copiar', onClick: onCopy }];

    render(
      <RowMenu ariaLabel="Ações" onDelete={onDelete} onEdit={onEdit} extraItems={extraItems} />
    );

    await user.click(screen.getByRole('button', { name: 'Ações' }));

    const buttons = screen.getAllByRole('button').filter(
      (btn) => btn.classList.contains('row-menu-item')
    );
    expect(buttons[0]).toHaveTextContent('Editar');
    expect(buttons[1]).toHaveTextContent('Copiar');
    expect(buttons[2]).toHaveTextContent('Excluir');

    await user.click(screen.getByText('Copiar'));
    expect(onCopy).toHaveBeenCalledOnce();
  });

  it('renders extra danger items with correct class', async () => {
    const user = userEvent.setup();
    const extraItems = [{ label: 'Remover', onClick: vi.fn(), danger: true }];

    render(<RowMenu ariaLabel="Ações" onDelete={onDelete} extraItems={extraItems} />);

    await user.click(screen.getByRole('button', { name: 'Ações' }));

    const removeBtn = screen.getByText('Remover');
    expect(removeBtn.classList.contains('row-menu-item--danger')).toBe(true);
  });

  it('closes dropdown when clicking outside', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <span>Outside</span>
        <RowMenu ariaLabel="Ações" onDelete={onDelete} onEdit={onEdit} />
      </div>
    );

    await user.click(screen.getByRole('button', { name: 'Ações' }));
    expect(screen.getByText('Editar')).toBeInTheDocument();

    await user.click(screen.getByText('Outside'));

    await waitFor(() => {
      expect(screen.queryByText('Editar')).not.toBeInTheDocument();
    });
  });

  it('toggles dropdown open and closed', async () => {
    const user = userEvent.setup();
    render(<RowMenu ariaLabel="Ações" onDelete={onDelete} onEdit={onEdit} />);

    const trigger = screen.getByRole('button', { name: 'Ações' });

    await user.click(trigger);
    expect(screen.getByText('Editar')).toBeInTheDocument();

    await user.click(trigger);
    expect(screen.queryByText('Editar')).not.toBeInTheDocument();
  });

  it('disables the delete button when deleteDisabled is true', async () => {
    const user = userEvent.setup();
    render(
      <RowMenu
        ariaLabel="Ações"
        onDelete={onDelete}
        deleteDisabled
        deleteDisabledTitle="Não é permitido"
      />
    );

    await user.click(screen.getByRole('button', { name: 'Ações' }));

    const deleteBtn = screen.getByRole('button', { name: 'Excluir' });
    expect(deleteBtn).toBeDisabled();
    expect(deleteBtn).toHaveAttribute('title', 'Não é permitido');

    await user.click(deleteBtn);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('does not trigger parent onClick when trigger is clicked', async () => {
    const user = userEvent.setup();
    const parentClick = vi.fn();

    render(
      <div onClick={parentClick}>
        <RowMenu ariaLabel="Ações" onDelete={onDelete} onEdit={onEdit} />
      </div>
    );

    await user.click(screen.getByRole('button', { name: 'Ações' }));
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('does not render delete item when onDelete is not provided', async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();
    const extraItems = [{ label: 'Ver histórico', onClick: onCopy }];

    render(<RowMenu ariaLabel="Ações" extraItems={extraItems} />);

    await user.click(screen.getByRole('button', { name: 'Ações' }));

    expect(screen.getByText('Ver histórico')).toBeInTheDocument();
    expect(screen.queryByText('Excluir')).not.toBeInTheDocument();
  });

  it('calls extraItem callback when clicked and no onDelete present', async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();
    const extraItems = [{ label: 'Ver histórico', onClick: onCopy }];

    render(<RowMenu ariaLabel="Ações" extraItems={extraItems} />);

    await user.click(screen.getByRole('button', { name: 'Ações' }));
    await user.click(screen.getByText('Ver histórico'));

    expect(onCopy).toHaveBeenCalledOnce();
  });

  it('does not trigger parent onClick when menu item is clicked', async () => {
    const user = userEvent.setup();
    const parentClick = vi.fn();

    render(
      <div onClick={parentClick}>
        <RowMenu ariaLabel="Ações" onDelete={onDelete} onEdit={onEdit} />
      </div>
    );

    await user.click(screen.getByRole('button', { name: 'Ações' }));
    await user.click(screen.getByText('Excluir'));

    expect(onDelete).toHaveBeenCalledOnce();
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('renders a disabled extra item that cannot be triggered', async () => {
    const user = userEvent.setup();
    const onResend = vi.fn();
    const extraItems = [{ label: 'Reenviar em 30 min', onClick: onResend, disabled: true }];

    render(<RowMenu ariaLabel="Ações" extraItems={extraItems} />);

    await user.click(screen.getByRole('button', { name: 'Ações' }));
    const item = screen.getByRole('button', { name: 'Reenviar em 30 min' });
    expect(item).toBeDisabled();
    await user.click(item);

    expect(onResend).not.toHaveBeenCalled();
  });
});

describe('RowMenu triggerDisabled', () => {
  it('disables the trigger while the row is busy', () => {
    render(<RowMenu ariaLabel="Ações" extraItems={[{ label: 'Item', onClick: vi.fn() }]} triggerDisabled />);
    expect(screen.getByRole('button', { name: 'Ações' })).toBeDisabled();
  });

  it('returns focus to the trigger when an item is chosen', async () => {
    const user = userEvent.setup();
    render(<RowMenu ariaLabel="Ações" extraItems={[{ label: 'Item', onClick: vi.fn() }]} />);
    await user.click(screen.getByRole('button', { name: 'Ações' }));
    await user.click(screen.getByRole('button', { name: 'Item' }));
    expect(screen.getByRole('button', { name: 'Ações' })).toHaveFocus();
  });

  it('exposes the title of an extra item as its tooltip', async () => {
    const user = userEvent.setup();
    render(<RowMenu ariaLabel="Ações" extraItems={[{ label: 'Item', onClick: vi.fn(), disabled: true, title: 'Motivo' }]} />);

    await user.click(screen.getByRole('button', { name: 'Ações' }));

    expect(screen.getByRole('button', { name: 'Item' })).toHaveAttribute('title', 'Motivo');
  });
});
