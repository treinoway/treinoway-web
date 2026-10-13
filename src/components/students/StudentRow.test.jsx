import { render, screen, within } from '../../test/test-utils';
import userEvent from '@testing-library/user-event';
import StudentRow from './StudentRow';

const baseStudent = {
  id: 's1',
  firstName: 'Gabriel',
  lastName: 'Almeida',
  email: 'gabriel@example.com',
  billingStatus: 'ok',
  adherence: 75,
  adherenceCompleted: 3,
  adherenceExpected: 4,
  lastWorkoutAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
};

const renderRow = (student = baseStudent, handlers = {}) =>
  render(<StudentRow student={student} onOpen={vi.fn()} onUnlink={vi.fn()} {...handlers} />);

describe('StudentRow', () => {
  it('renders identity, status badge and both KPIs', () => {
    renderRow();
    expect(screen.getByRole('button', { name: 'Ver perfil de Gabriel Almeida.' })).toHaveTextContent('Gabriel Almeida');
    expect(screen.getByText('Ativo')).toHaveClass('badge--status', 'badge--success');
    expect(screen.getByText('gabriel@example.com')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('3/4 treinos')).toBeInTheDocument();
    expect(screen.getByText('Há 2 dias')).toBeInTheDocument();
  });

  it('maps pending and overdue to warning and error badges', () => {
    const { rerender } = renderRow({ ...baseStudent, billingStatus: 'due_soon' });
    expect(screen.getByText('Pendente')).toHaveClass('badge--warning');
    rerender(<StudentRow student={{ ...baseStudent, billingStatus: 'overdue' }} onOpen={vi.fn()} onUnlink={vi.fn()} />);
    expect(screen.getByText('Vencido')).toHaveClass('badge--error');
  });

  it('shows Ativo for billingStatus none and for a missing billingStatus', () => {
    const { rerender } = renderRow({ ...baseStudent, billingStatus: 'none' });
    expect(screen.getByText('Ativo')).toHaveClass('badge--success');
    const { billingStatus: _omit, ...withoutBilling } = baseStudent;
    rerender(<StudentRow student={withoutBilling} onOpen={vi.fn()} onUnlink={vi.fn()} />);
    expect(screen.getByText('Ativo')).toHaveClass('badge--success');
  });

  it('falls back to the email as name and shows empty KPI values', () => {
    renderRow({ id: 's2', email: 'sem.nome@example.com', billingStatus: 'ok' });
    expect(screen.getByRole('button', { name: 'Ver perfil de sem.nome@example.com.' })).toBeInTheDocument();
    expect(screen.getByText('–')).toBeInTheDocument();
    expect(screen.getByText('Nunca')).toHaveClass('kpi-value--error');
  });

  it('renders blocker tags with warning tone and platform blocker as neutral', () => {
    renderRow({
      ...baseStudent,
      blockers: ['no_active_protocol', 'blocked_on_plan'],
      blockersLabel: ['Sem rotina ativa', 'Bloqueado pela sua cota'],
    });
    expect(screen.getByText('Sem rotina ativa')).toHaveClass('badge--tag', 'badge--warning');
    expect(screen.getByText('Bloqueado pela sua cota')).toHaveClass('badge--tag', 'badge--neutral');
  });

  it('opens the student when the row link is clicked', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    renderRow(baseStudent, { onOpen });
    await user.click(screen.getByRole('button', { name: /ver perfil de gabriel almeida/i }));
    expect(onOpen).toHaveBeenCalledWith(baseStudent);
  });

  it('unlinks through the row menu', async () => {
    const user = userEvent.setup();
    const onUnlink = vi.fn();
    const onOpen = vi.fn();
    renderRow(baseStudent, { onUnlink, onOpen });
    await user.click(screen.getByRole('button', { name: 'Ações de Gabriel Almeida' }));
    await user.click(within(document.body).getByRole('button', { name: 'Desvincular' }));
    expect(onUnlink).toHaveBeenCalledWith(baseStudent);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('tones adherence by threshold', () => {
    const { rerender } = renderRow({ ...baseStudent, adherence: 92 });
    expect(screen.getByText('92%')).toHaveClass('kpi-value--success');
    rerender(<StudentRow student={{ ...baseStudent, adherence: 78 }} onOpen={vi.fn()} onUnlink={vi.fn()} />);
    expect(screen.getByText('78%')).toHaveClass('kpi-value--warning');
    rerender(<StudentRow student={{ ...baseStudent, adherence: 20 }} onOpen={vi.fn()} onUnlink={vi.fn()} />);
    expect(screen.getByText('20%')).toHaveClass('kpi-value--error');
  });

  it('shows a neutral "–" with no counts when no workouts were expected (0/0)', () => {
    renderRow({ ...baseStudent, adherence: 0, adherenceCompleted: 0, adherenceExpected: 0 });
    const value = screen.getByText('–');
    expect(value).toHaveClass('kpi-value--muted');
    expect(value).not.toHaveClass('kpi-value--error');
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
    expect(screen.queryByText('0/0 treinos')).not.toBeInTheDocument();
  });

  it('labels today as "Hoje" in success tone and shows a neutral value for recent days', () => {
    const { rerender } = renderRow({ ...baseStudent, lastWorkoutAt: new Date().toISOString() });
    expect(screen.getByText('Hoje')).toHaveClass('kpi-value--success');
    rerender(<StudentRow student={baseStudent} onOpen={vi.fn()} onUnlink={vi.fn()} />);
    expect(screen.getByText('Há 2 dias')).not.toHaveClass('kpi-value--success', 'kpi-value--warning', 'kpi-value--error');
  });
});
