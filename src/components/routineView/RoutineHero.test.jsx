import { render, screen } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import RoutineHero from './RoutineHero';

const template = { name: 'Força A', type: 'strength', trainingLevel: 'beginner', description: 'Base' };

describe('RoutineHero', () => {
  it('renders a loading placeholder without actions', () => {
    render(<RoutineHero onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Carregando...');
    expect(screen.queryByRole('button', { name: /editar/i })).not.toBeInTheDocument();
  });

  it('renders identity and fires edit and delete actions', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    render(<RoutineHero template={template} onEdit={onEdit} onDelete={onDelete} />);

    expect(screen.getByRole('heading', { name: 'Força A' })).toBeInTheDocument();
    expect(screen.getByText('Iniciante')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Editar' }));
    expect(onEdit).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Mais ações da rotina' }));
    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(onDelete).toHaveBeenCalled();
  });
});
