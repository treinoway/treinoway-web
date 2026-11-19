import userEvent from '@testing-library/user-event';
import { render, screen, within } from '../../test/test-utils';
import ConfirmDialog from './ConfirmDialog';

const MESSAGE = 'Enviar um feedback avulso para Ana Souza?';
const DS = { ConfirmDialog: 'ds-dialog' };

// Whether `first` comes before `second` in document order
const comesBefore = (first, second) => Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);

// Dialog with a template select as its extra content
const renderWithSelect = (props = {}) =>
  render(
    <ConfirmDialog message={MESSAGE} confirmLabel="Enviar" confirmTone="primary" onConfirm={vi.fn()} onCancel={vi.fn()} {...props}>
      <label htmlFor="adhoc-template">Modelo</label>
      <select id="adhoc-template" defaultValue="general">
        <option value="general">Padrão TeuFit</option>
        <option value="tpl-2">Avaliação mensal</option>
      </select>
    </ConfirmDialog>,
  );

describe('ConfirmDialog children', () => {
  it('renders the children inside the dialog, between the message and the actions', () => {
    renderWithSelect();

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveClass(DS.ConfirmDialog);
    const select = within(dialog).getByRole('combobox', { name: 'Modelo' });
    expect(comesBefore(within(dialog).getByText(MESSAGE), select)).toBe(true);
    expect(comesBefore(select, within(dialog).getByRole('button', { name: 'Cancelar' }))).toBe(true);
    expect(comesBefore(select, within(dialog).getByRole('button', { name: 'Enviar' }))).toBe(true);
  });

  it('keeps the message as the accessible name of the dialog', () => {
    renderWithSelect();

    expect(screen.getByRole('alertdialog')).toHaveAccessibleName(MESSAGE);
  });

  it('lets the trainer use the children without confirming or cancelling', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    renderWithSelect({ onConfirm, onCancel });

    await user.selectOptions(screen.getByRole('combobox', { name: 'Modelo' }), 'Avaliação mensal');

    expect(screen.getByRole('combobox', { name: 'Modelo' })).toHaveValue('tpl-2');
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('still confirms and cancels through its buttons when it has children', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    renderWithSelect({ onConfirm, onCancel });
    expect(screen.getByRole('combobox', { name: 'Modelo' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
