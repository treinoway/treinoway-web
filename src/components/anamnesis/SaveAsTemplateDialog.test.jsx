import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import SaveAsTemplateDialog from './SaveAsTemplateDialog';

const renderDialog = (props = {}) => {
  const handlers = { onSubmit: vi.fn(), onCancel: vi.fn() };
  render(<SaveAsTemplateDialog anamnesisTitle="Anamnese inicial" {...handlers} {...props} />);
  return handlers;
};

describe('SaveAsTemplateDialog', () => {
  it('opens with the name pre-filled as "Cópia de {título}"', () => {
    renderDialog();
    expect(screen.getByRole('dialog', { name: 'Salvar como modelo' })).toBeInTheDocument();
    expect(screen.getByLabelText(/nome do modelo/i)).toHaveValue('Cópia de Anamnese inicial');
  });

  it('submits the trimmed name', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDialog();
    const input = screen.getByLabelText(/nome do modelo/i);
    await user.clear(input);
    await user.type(input, '  Triagem da academia  ');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(onSubmit).toHaveBeenCalledWith('Triagem da academia');
  });

  it('submits with Enter', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderDialog();
    await user.type(screen.getByLabelText(/nome do modelo/i), '{Enter}');
    expect(onSubmit).toHaveBeenCalledWith('Cópia de Anamnese inicial');
  });

  it.each([['empty', ''], ['whitespace', '   ']])('blocks a %s name with an inline error', async (_, value) => {
    const user = userEvent.setup();
    const { onSubmit } = renderDialog();
    const input = screen.getByLabelText(/nome do modelo/i);
    await user.clear(input);
    if (value) await user.type(input, value);
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Informe um nome para o modelo.');
    expect(input).toHaveAttribute('aria-invalid', 'true');

    await user.type(input, 'A');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('cancels without submitting', async () => {
    const user = userEvent.setup();
    const { onSubmit, onCancel } = renderDialog();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('cancels with Escape', async () => {
    const user = userEvent.setup();
    const { onCancel } = renderDialog();
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows "Carregando..." and locks the dialog while saving', async () => {
    const user = userEvent.setup();
    const { onCancel } = renderDialog({ saving: true });
    expect(screen.getByRole('button', { name: 'Carregando...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.getByLabelText(/nome do modelo/i)).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(onCancel).not.toHaveBeenCalled();
  });
});
