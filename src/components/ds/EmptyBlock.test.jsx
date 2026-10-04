import { Users } from 'lucide-react';
import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import EmptyBlock from './EmptyBlock';

describe('EmptyBlock', () => {
  it('renders title and description', () => {
    render(<EmptyBlock icon={Users} title="Sem alunos ainda" description="Vincule o primeiro aluno." />);
    expect(screen.getByRole('heading', { name: 'Sem alunos ainda' })).toBeInTheDocument();
    expect(screen.getByText('Vincule o primeiro aluno.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('fires the primary action', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<EmptyBlock icon={Users} title="Sem alunos ainda" actionLabel="Vincular aluno" onAction={onAction} />);
    await user.click(screen.getByRole('button', { name: 'Vincular aluno' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
