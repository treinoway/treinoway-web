import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test/test-utils';
import AnamnesisFormModal from './AnamnesisFormModal';

const setup = (props = {}) => {
  const handlers = { onClose: vi.fn(), onSubmit: vi.fn() };
  render(<AnamnesisFormModal {...handlers} {...props} />);
  return handlers;
};

describe('AnamnesisFormModal', () => {
  it('renders the create variant with empty fields and the next-step hint', () => {
    setup();
    expect(screen.getByRole('dialog', { name: 'Nova anamnese' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('');
    expect(screen.getByLabelText('Descrição')).toHaveValue('');
    expect(screen.getByText(/você poderá adicionar seções e perguntas/i)).toBeInTheDocument();
  });

  it('submits trimmed values in create mode', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();

    await user.type(screen.getByLabelText('Nome'), '  Anamnese inicial  ');
    await user.type(screen.getByLabelText('Descrição'), 'Primeira consulta');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(onSubmit).toHaveBeenCalledWith({ title: 'Anamnese inicial', description: 'Primeira consulta' });
  });

  it('renders the edit variant prefilled and submits the changes', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup({ anamnesis: { title: 'Saúde geral', description: 'Questionário' } });

    expect(screen.getByRole('dialog', { name: 'Editar anamnese' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('Saúde geral');
    expect(screen.getByLabelText('Descrição')).toHaveValue('Questionário');
    expect(screen.queryByText(/você poderá adicionar seções/i)).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText('Nome'));
    await user.type(screen.getByLabelText('Nome'), 'Saúde completa');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(onSubmit).toHaveBeenCalledWith({ title: 'Saúde completa', description: 'Questionário' });
  });

  it('blocks submit and shows an inline error when the name is blank, clearing it on typing', async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();

    await user.type(screen.getByLabelText('Nome'), '   ');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Informe o nome da anamnese.');
    expect(screen.getByLabelText('Nome')).toBeInvalid();

    await user.type(screen.getByLabelText('Nome'), 'a');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('locks the form and shows the busy label while saving', () => {
    setup({ saving: true });
    expect(screen.getByRole('button', { name: 'Salvando…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.getByLabelText('Nome')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeDisabled();
  });

  it('calls onClose from Cancelar, the close button and Escape without submitting', async () => {
    const user = userEvent.setup();
    const { onClose, onSubmit } = setup();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    await user.click(screen.getByRole('button', { name: 'Fechar' }));
    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(3);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
