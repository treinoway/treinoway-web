import userEvent from '@testing-library/user-event';
import { render, screen } from '../../test/test-utils';
import PresenceGate from './PresenceGate';

const student = { firstName: 'Maria', lastName: 'Silva', email: 'maria@example.com' };

const renderGate = (props = {}) => {
  const onStart = vi.fn();
  const onCancel = vi.fn();
  render(<PresenceGate student={student} onStart={onStart} onCancel={onCancel} {...props} />);
  return { onStart, onCancel, user: userEvent.setup() };
};

describe('PresenceGate', () => {
  it('shows the student name and explains what will happen', () => {
    renderGate();
    expect(screen.getByRole('heading', { level: 1, name: 'Preencher com o aluno' })).toBeInTheDocument();
    expect(screen.getByText('Maria Silva')).toBeInTheDocument();
    expect(screen.getByText(/Maria precisa confirmar as respostas pelo app/)).toBeInTheDocument();
  });

  it('keeps "Começar" disabled until the checkbox is ticked and never starts before', async () => {
    const { user, onStart } = renderGate();
    const start = screen.getByRole('button', { name: 'Começar' });
    expect(start).toBeDisabled();
    await user.click(start);
    expect(onStart).not.toHaveBeenCalled();
    await user.click(screen.getByRole('checkbox', { name: /O aluno está presente/ }));
    await user.click(start);
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('cancels without starting', async () => {
    const { user, onStart, onCancel } = renderGate();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onStart).not.toHaveBeenCalled();
  });
});
