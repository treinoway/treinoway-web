import userEvent from '@testing-library/user-event';
import { render, screen, fireEvent } from '../../test/test-utils';
import AddMealModal from './AddMealModal';

describe('AddMealModal', () => {
  it('keeps "Adicionar" disabled until name and time are filled', async () => {
    const user = userEvent.setup();
    render(<AddMealModal submitting={false} onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeDisabled();
    await user.type(screen.getByLabelText('Nome da refeição'), 'Ceia');
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Horário'), { target: { value: '22:00' } });
    expect(screen.getByRole('button', { name: 'Adicionar' })).toBeEnabled();
  });

  it('submits trimmed values and omits an empty tip', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AddMealModal submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText('Nome da refeição'), ' Ceia ');
    fireEvent.change(screen.getByLabelText('Horário'), { target: { value: '22:00' } });
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Ceia', time: '22:00' });
  });

  it('includes the tip when typed', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AddMealModal submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText('Nome da refeição'), 'Ceia');
    fireEvent.change(screen.getByLabelText('Horário'), { target: { value: '22:00' } });
    await user.type(screen.getByLabelText('Dica para o paciente (opcional)'), 'Leve');
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Ceia', time: '22:00', tip: 'Leve' });
  });

  it('cancels and disables the form while submitting', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = render(<AddMealModal submitting={false} onClose={onClose} onSubmit={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(<AddMealModal submitting onClose={onClose} onSubmit={vi.fn()} />);
    expect(screen.getByLabelText('Nome da refeição')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Adicionando…' })).toBeDisabled();
  });

  it('edits an existing meal: prefilled fields, "Salvar" and a null tip when cleared', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<AddMealModal meal={{ name: 'Almoço', time: '12:30', tip: 'Mastigar devagar' }} submitting={false} onClose={vi.fn()} onSubmit={onSubmit} />);
    expect(screen.getByRole('dialog', { name: 'Editar refeição' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nome da refeição')).toHaveValue('Almoço');
    await user.clear(screen.getByLabelText('Dica para o paciente (opcional)'));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Almoço', time: '12:30', tip: null });
  });
});
