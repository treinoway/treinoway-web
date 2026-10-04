import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import LinkStudentModal from './LinkStudentModal';

describe('LinkStudentModal', () => {
  it('keeps submit disabled until an e-mail is typed, then submits the trimmed value', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<LinkStudentModal onClose={vi.fn()} onSubmit={onSubmit} linking={false} />);

    expect(screen.getByRole('button', { name: 'Vincular' })).toBeDisabled();
    await user.type(screen.getByLabelText('E-mail do aluno'), ' aluno@email.com ');
    await user.click(screen.getByRole('button', { name: 'Vincular' }));

    expect(onSubmit).toHaveBeenCalledWith('aluno@email.com');
  });

  it('disables inputs and shows the loading label while linking', () => {
    render(<LinkStudentModal onClose={vi.fn()} onSubmit={vi.fn()} linking />);
    expect(screen.getByRole('button', { name: 'Vinculando…' })).toBeDisabled();
    expect(screen.getByLabelText('E-mail do aluno')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  });

  it('cancels', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<LinkStudentModal onClose={onClose} onSubmit={vi.fn()} linking={false} />);
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
