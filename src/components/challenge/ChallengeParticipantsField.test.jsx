import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, within } from '../../test/test-utils';
import ChallengeParticipantsField from './ChallengeParticipantsField';

const STUDENTS = [
  { id: 's1', firstName: 'Ana', lastName: 'Lima' },
  { id: 's2', firstName: 'Caio', lastName: 'Reis' },
];

// Form stand-in that keeps the participants value
const Host = () => {
  const [value, setValue] = useState({ mode: 'all', filter: {}, studentIds: [] });
  return <ChallengeParticipantsField value={value} onChange={setValue} students={STUDENTS} />;
};

describe('ChallengeParticipantsField', () => {
  it('CPD-25 labels the modes "Todos os alunos", "Por filtro" and "Selecionar alunos"', async () => {
    const user = userEvent.setup();
    render(<Host />);
    const modes = screen.getByRole('tablist', { name: 'Participantes' });

    expect(within(modes).getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Todos os alunos', 'Por filtro', 'Selecionar alunos']);
    expect(within(modes).getByRole('tab', { name: 'Todos os alunos' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Todos os alunos ativos, inclusive quem entrar no time depois.')).toBeInTheDocument();

    await user.click(within(modes).getByRole('tab', { name: 'Por filtro' }));
    expect(within(modes).getByRole('tab', { name: 'Por filtro' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Gênero')).toBeInTheDocument();
    expect(screen.getByLabelText('Cidade')).toBeInTheDocument();

    await user.click(within(modes).getByRole('tab', { name: 'Selecionar alunos' }));
    expect(within(modes).getByRole('tab', { name: 'Selecionar alunos' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByLabelText('Gênero')).not.toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Ana Lima' }));
    expect(screen.getByRole('checkbox', { name: 'Ana Lima' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Caio Reis' })).not.toBeChecked();
  });
});
