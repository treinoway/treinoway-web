import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import SummaryStatCard from './SummaryStatCard';

describe('SummaryStatCard', () => {
  it('renders label, amount and student count', () => {
    render(
      <SummaryStatCard
        label="Atrasado"
        amount={300}
        studentsCount={2}
        tone="red"
      />
    );

    expect(screen.getByText('Atrasado')).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?300,00/)).toBeInTheDocument();
    expect(screen.getByText('2 alunos')).toBeInTheDocument();
  });

  it('singularises the student count when value is one', () => {
    render(
      <SummaryStatCard label="Pendente" amount={100} studentsCount={1} tone="amber" />
    );
    expect(screen.getByText('1 aluno')).toBeInTheDocument();
  });

  it('invokes onClick when activated', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <SummaryStatCard
        label="Recebido"
        amount={1000}
        studentsCount={4}
        tone="green"
        onClick={onClick}
      />
    );

    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
